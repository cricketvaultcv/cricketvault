import crypto from "node:crypto";
import { Payment, ResourcePurchase, Subscription, WebhookEvent } from "./models.js";
import { safeSignatureEqual } from "./policies.js";
import { sendPlayerNotificationEmail } from "./email.js";
import {
  applyReferralReviews,
  awardReferralForFirstPurchase,
} from "./referrals.js";

type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

function razorpayCredentials() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    throw Object.assign(new Error("Razorpay credentials are not configured"), {
      status: 503,
    });
  }
  const mode = process.env.RAZORPAY_MODE || "test";
  const allowTestModeInProduction =
    process.env.RAZORPAY_ALLOW_TEST_MODE_IN_PRODUCTION === "true";
  if (
    !["test", "live"].includes(mode) ||
    (mode === "test" && !keyId.startsWith("rzp_test_")) ||
    (mode === "live" && !keyId.startsWith("rzp_live_")) ||
    (process.env.NODE_ENV === "production" &&
      mode !== "live" &&
      !allowTestModeInProduction)
  ) {
    throw Object.assign(new Error("Razorpay mode does not match the configured key"), {
      status: 503,
    });
  }
  return { keyId, keySecret };
}

export async function createRazorpayOrder(
  amountPaise: number,
  receipt: string,
  subscriptionId: string,
): Promise<RazorpayOrder> {
  const { keyId, keySecret } = razorpayCredentials();
  const baseUrl = "https://api.razorpay.com/v1";
  const response = await fetch(`${baseUrl}/orders`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(10_000),
    body: JSON.stringify({
      amount: amountPaise,
      currency: "INR",
      receipt: receipt.slice(0, 40),
      notes: { subscriptionId },
    }),
  });
  if (!response.ok) {
    const body = await response.text();
    console.error(
      JSON.stringify({
        level: "error",
        message: "Razorpay order creation failed",
        status: response.status,
        response: body.slice(0, 500),
      }),
    );
    throw Object.assign(new Error("Unable to create payment order"), {
      status: 502,
    });
  }
  const order = (await response.json()) as RazorpayOrder;
  if (order.amount !== amountPaise || order.currency !== "INR") {
    throw new Error("Razorpay returned an order with unexpected amount");
  }
  return order;
}

export function calculateCouponDiscount(
  pricePaise: number,
  discountType: "PERCENTAGE" | "FIXED",
  discountValue: number,
) {
  if (
    !Number.isSafeInteger(pricePaise) ||
    pricePaise <= 0 ||
    !Number.isSafeInteger(discountValue) ||
    discountValue <= 0
  ) {
    throw new Error("Coupon calculation requires positive integer amounts");
  }
  const discountPaise =
    discountType === "PERCENTAGE"
      ? Number((BigInt(pricePaise) * BigInt(discountValue)) / 100n)
      : discountValue;
  if (discountPaise <= 0 || discountPaise >= pricePaise) {
    throw Object.assign(
      new Error("Coupon discount must be less than the plan price"),
      { status: 400 },
    );
  }
  return {
    discountPaise,
    finalAmountPaise: pricePaise - discountPaise,
  };
}

export function isCouponExpired(
  expiresAt: Date | null | undefined,
  now = Date.now(),
) {
  return expiresAt != null && expiresAt.getTime() < now;
}

export function calculatePlayerRefund(amountPaise: number, submittedVideos: number) {
  if (
    !Number.isSafeInteger(amountPaise) ||
    amountPaise < 0 ||
    !Number.isSafeInteger(submittedVideos) ||
    submittedVideos < 0
  ) {
    throw new Error("Refund calculation requires non-negative integer amounts");
  }
  return Math.max(0, amountPaise - submittedVideos * 8000);
}

export async function requestRazorpayRefund(
  paymentRecordId: string,
  amountPaise: number,
  metadata: { subscriptionId: string; playerUserId: string },
) {
  if (!Number.isSafeInteger(amountPaise) || amountPaise <= 0) {
    throw new Error("A positive integer refund amount is required");
  }
  const payment = await Payment.findById(paymentRecordId);
  if (!payment)
    throw Object.assign(new Error("Payment record was not found"), { status: 404 });
  if (payment.refundId && ["REFUND_PENDING", "REFUNDED"].includes(payment.state)) {
    if (Number(payment.refundAmountPaise) !== amountPaise)
      throw Object.assign(
        new Error("A different refund amount is already being processed"),
        { status: 409 },
      );
    return {
      refundId: payment.refundId,
      status: payment.refundStatus === "PROCESSED" ? "processed" : "pending",
      alreadyRequested: true,
    };
  }
  if (payment.refundStatus === "CREATING") {
    throw Object.assign(
      new Error("Refund initiation is unresolved; do not retry this payment yet"),
      { status: 409 },
    );
  }
  const { keyId, keySecret } = razorpayCredentials();
  const paymentAmountPaise = Number(payment.amountPaise);
  if (
    payment.state !== "VERIFIED" ||
    payment.provider !== "razorpay" ||
    !payment.paymentId ||
    !payment.orderId ||
    !Number.isSafeInteger(paymentAmountPaise) ||
    amountPaise > paymentAmountPaise
  ) {
    throw Object.assign(
      new Error("This payment cannot be refunded through Razorpay"),
      { status: 409 },
    );
  }

  let verificationResponse: Response;
  try {
    verificationResponse = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.paymentId)}`,
      {
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
        },
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch {
    throw Object.assign(
      new Error("Unable to verify the captured payment with Razorpay"),
      { status: 502 },
    );
  }
  if (!verificationResponse.ok) {
    throw Object.assign(
      new Error("Unable to verify the captured payment with Razorpay"),
      { status: 502 },
    );
  }
  let providerPayment: {
    id?: string;
    order_id?: string;
    amount?: number;
    amount_refunded?: number;
    currency?: string;
    status?: string;
  };
  try {
    providerPayment = (await verificationResponse.json()) as typeof providerPayment;
  } catch {
    throw Object.assign(
      new Error("Razorpay returned an invalid payment verification response"),
      { status: 502 },
    );
  }
  if (
    providerPayment.id !== payment.paymentId ||
    providerPayment.order_id !== payment.orderId ||
    providerPayment.amount !== paymentAmountPaise ||
    !Number.isSafeInteger(providerPayment.amount_refunded ?? 0) ||
    (providerPayment.amount_refunded ?? 0) < 0 ||
    (providerPayment.amount_refunded ?? 0) + amountPaise > paymentAmountPaise ||
    providerPayment.currency !== payment.currency
  ) {
    throw Object.assign(
      new Error("Razorpay payment details do not match the captured transaction"),
      { status: 409 },
    );
  }
  if (providerPayment.status !== "captured") {
    throw Object.assign(
      new Error("Only captured Razorpay payments can be refunded"),
      { status: 409 },
    );
  }

  const locked = await Payment.findOneAndUpdate(
    {
      _id: payment._id,
      state: "VERIFIED",
      refundStatus: { $ne: "CREATING" },
    },
    {
      $set: {
        refundStatus: "CREATING",
        refundAmountPaise: amountPaise,
      },
    },
    { new: true },
  );
  if (!locked) {
    throw Object.assign(
      new Error("Payment refund is already being processed"),
      { status: 409 },
    );
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.paymentId)}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
          amount: amountPaise,
          notes: {
            reason: "Player refund request",
            subscriptionId: metadata.subscriptionId,
            playerUserId: metadata.playerUserId,
          },
        }),
      },
    );
  } catch {
    throw Object.assign(
      new Error("Razorpay refund outcome is unknown"),
      {
        status: 502,
        publicMessage:
          "Razorpay's refund outcome is unknown. Do not retry until this payment is reconciled.",
      },
    );
  }
  if (!response.ok) {
    const body = await response.text();
    console.error(
      JSON.stringify({
        level: "error",
        message: "Razorpay refund request failed",
        status: response.status,
        response: body.slice(0, 500),
      }),
    );
    if (response.status < 500) {
      await Payment.updateOne(
        { _id: payment._id, refundStatus: "CREATING" },
        { $set: { state: "VERIFIED", refundStatus: "FAILED" } },
      );
    }
    throw Object.assign(new Error("Unable to initiate Razorpay refund"), {
      status: 502,
      publicMessage:
        response.status < 500
          ? "Razorpay rejected the refund request."
          : "Razorpay could not confirm the refund outcome. Reconcile this payment before retrying.",
    });
  }

  let refund: { id?: string; status?: string };
  try {
    refund = (await response.json()) as typeof refund;
  } catch {
    throw Object.assign(
      new Error("Razorpay returned an invalid refund response; reconcile this payment before retrying"),
      { status: 502 },
    );
  }
  if (refund.id && refund.status === "failed") {
    await Payment.updateOne(
      { _id: payment._id, refundStatus: "CREATING" },
      {
        $set: {
          refundId: refund.id,
          refundStatus: "FAILED",
          state: "VERIFIED",
        },
        $addToSet: { events: "REFUND_FAILED" },
      },
    );
    throw Object.assign(new Error("Razorpay could not process the refund"), {
      status: 502,
      publicMessage:
        "Razorpay could not process the refund.",
    });
  }
  if (!refund.id || !["pending", "processed"].includes(refund.status || "")) {
    throw Object.assign(
      new Error("Razorpay returned an incomplete refund response"),
      {
        status: 502,
        publicMessage:
          "Razorpay returned an incomplete refund response. Reconcile this payment before retrying.",
      },
    );
  }
  const state = refund.status === "processed" ? "REFUNDED" : "REFUND_PENDING";
  const updated = await Payment.updateOne(
    { _id: payment._id, refundStatus: "CREATING" },
    {
      $set: {
        refundId: refund.id,
        refundStatus: refund.status === "processed" ? "PROCESSED" : "PENDING",
        state,
      },
      $addToSet: { events: "REFUND_INITIATED" },
    },
  );
  if (!updated.modifiedCount) {
    throw Object.assign(
      new Error("Refund was accepted but could not be saved; reconcile the payment before retrying"),
      {
        status: 502,
        publicMessage:
          "Razorpay accepted the refund, but its status could not be saved. Reconcile this payment before retrying.",
      },
    );
  }
  return { refundId: refund.id, status: refund.status, alreadyRequested: false };
}

export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  const { keySecret } = razorpayCredentials();
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return safeSignatureEqual(expected, signature);
}

export async function reconcileResourcePayment(
  paymentId: string,
  orderId: string,
  signature: string,
  amountPaise: number,
) {
  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    throw Object.assign(new Error("Invalid payment signature"), { status: 400 });
  }
  const { keyId, keySecret } = razorpayCredentials();
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw Object.assign(new Error("Unable to confirm payment with Razorpay"), {
      status: 502,
    });
  }
  const providerPayment = (await response.json()) as {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
  };
  if (
    providerPayment.id !== paymentId ||
    providerPayment.order_id !== orderId ||
    providerPayment.amount !== amountPaise ||
    providerPayment.currency !== "INR"
  ) {
    throw Object.assign(new Error("Razorpay payment details do not match the order"), {
      status: 400,
    });
  }
  if (providerPayment.status !== "captured") {
    throw Object.assign(new Error("Resource payment has not been captured"), {
      status: 409,
    });
  }
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw Object.assign(new Error("Razorpay webhook secret is not configured"), {
      status: 503,
    });
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  return safeSignatureEqual(expected, signature);
}

export function webhookEventKey(
  payload: { id?: string },
  headerEventId: string | undefined,
  rawBody: Buffer,
) {
  const providerId = headerEventId?.trim() || payload.id?.trim();
  return providerId || crypto.createHash("sha256").update(rawBody).digest("hex");
}

async function applyCapturedPayment(
  orderId: string,
  paymentId: string,
  amount?: number,
  currency?: string,
) {
  const payment = await Payment.findOneAndUpdate(
    {
      orderId,
      state: { $ne: "VERIFIED" },
      ...(amount === undefined ? {} : { amountPaise: amount }),
      ...(currency === undefined ? {} : { currency }),
    },
    { $set: { state: "VERIFIED", paymentId }, $addToSet: { events: "CAPTURED" } },
    { new: true },
  );
  let applied = Boolean(payment);
  let reconciledPayment = payment;
  if (!payment) {
    const existing = await Payment.findOne({ orderId });
    if (!existing) {
      const resourcePurchase = await ResourcePurchase.findOneAndUpdate(
        {
          orderId,
          status: { $in: ["PENDING", "FAILED"] },
          ...(amount === undefined ? {} : { amountPaise: amount }),
          ...(currency === undefined ? {} : { currency }),
        },
        { $set: { status: "VERIFIED", paymentId } },
        { new: true },
      );
      if (resourcePurchase) return true;
      const existingResourcePurchase = await ResourcePurchase.findOne({ orderId });
      if (
        existingResourcePurchase?.status === "VERIFIED" &&
        existingResourcePurchase.paymentId === paymentId
      ) return false;
      if (existingResourcePurchase)
        throw Object.assign(new Error("Resource payment order is already reconciled"), {
          status: 409,
        });
      return false;
    }
    if (existing.state !== "VERIFIED" || existing.paymentId !== paymentId) {
      throw Object.assign(new Error("Payment order not found or already reconciled"), {
        status: 409,
      });
    }
    reconciledPayment = existing;
    applied = false;
  }
  await Subscription.updateOne(
    { _id: reconciledPayment!.subscription, status: "PENDING_PAYMENT" },
    { $set: { status: "AWAITING_COACH", paymentState: "VERIFIED" } },
  );
  const subscription = await Subscription.findById(reconciledPayment!.subscription)
    .select("player");
  if (subscription) {
    await applyReferralReviews(String(subscription._id));
    await awardReferralForFirstPurchase(String(subscription.player));
    if (applied) {
      await sendPlayerNotificationEmail(
        String(subscription.player),
        "CricketVault payment successful",
        "Your plan payment was confirmed. Choose an eligible coach to begin your coaching period.",
      );
    }
  }
  return applied;
}

async function applyFailedPayment(orderId: string, paymentId?: string) {
  const payment = await Payment.findOneAndUpdate(
    { orderId, state: { $nin: ["VERIFIED", "FAILED"] } },
    {
      $set: { state: "FAILED", ...(paymentId ? { paymentId } : {}) },
      $addToSet: { events: "FAILED" },
    },
    { new: true },
  );
  const resolved =
    payment ||
    (await Payment.findOne({
      orderId,
      state: "FAILED",
      ...(paymentId ? { paymentId } : {}),
    }));
  if (!resolved) {
    await ResourcePurchase.updateOne(
      { orderId, status: "PENDING" },
      { $set: { status: "FAILED", ...(paymentId ? { paymentId } : {}) } },
    );
    return;
  }
  await Subscription.updateOne(
    { _id: resolved.subscription, status: "PENDING_PAYMENT" },
    {
      $set: {
        status: "CANCELLED",
        activeSlot: false,
        paymentState: "FAILED",
      },
    },
  );
  if (payment) {
    const subscription = await Subscription.findById(resolved.subscription).select("player");
    if (subscription) {
      await sendPlayerNotificationEmail(
        String(subscription.player),
        "CricketVault payment failed",
        "Your payment could not be completed, and the pending plan was cancelled. You can choose a plan and try again.",
      );
    }
  }
}

export async function reconcilePayment(
  paymentId: string,
  orderId: string,
  signature: string,
) {
  if (!verifyPaymentSignature(orderId, paymentId, signature)) {
    throw Object.assign(new Error("Invalid payment signature"), { status: 400 });
  }
  const payment = await Payment.findOne({ orderId });
  if (!payment) throw Object.assign(new Error("Payment order not found"), { status: 404 });
  if (payment.state === "VERIFIED") {
    if (payment.paymentId !== paymentId) {
      throw Object.assign(new Error("Order was verified with another payment"), {
        status: 409,
      });
    }
    await Subscription.updateOne(
      { _id: payment.subscription, status: "PENDING_PAYMENT" },
      { $set: { status: "AWAITING_COACH", paymentState: "VERIFIED" } },
    );
    if (payment.subscription) {
      const subscription = await Subscription.findById(payment.subscription).select("player");
      if (subscription) {
        await applyReferralReviews(String(subscription._id));
        await awardReferralForFirstPurchase(String(subscription.player));
      }
    }
    return { payment, changed: false };
  }
  const { keyId, keySecret } = razorpayCredentials();
  const response = await fetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw Object.assign(new Error("Unable to confirm payment with Razorpay"), {
      status: 502,
    });
  }
  const providerPayment = (await response.json()) as {
    id: string;
    order_id: string;
    amount: number;
    currency: string;
    status: string;
  };
  if (
    providerPayment.id !== paymentId ||
    providerPayment.order_id !== orderId ||
    providerPayment.amount !== payment.amountPaise ||
    providerPayment.currency !== payment.currency
  ) {
    throw Object.assign(new Error("Razorpay payment details do not match the order"), {
      status: 400,
    });
  }
  let changed = false;
  if (providerPayment.status === "captured") {
    changed = await applyCapturedPayment(
      orderId,
      paymentId,
      providerPayment.amount,
      providerPayment.currency,
    );
  } else if (providerPayment.status === "failed") {
    await applyFailedPayment(orderId, paymentId);
  } else {
    await Payment.updateOne(
      { orderId, state: { $nin: ["VERIFIED", "FAILED"] } },
      { $set: { state: "PENDING" } },
    );
    await Subscription.updateOne(
      { _id: payment.subscription, status: "PENDING_PAYMENT" },
      { $set: { paymentState: "PENDING" } },
    );
  }
  return {
    payment: await Payment.findOne({ orderId }),
    changed,
    providerStatus: providerPayment.status,
  };
}

export async function reconcileRazorpayStatus(orderId: string) {
  const { keyId, keySecret } = razorpayCredentials();
  const response = await fetch(
    `https://api.razorpay.com/v1/orders/${encodeURIComponent(orderId)}/payments`,
    {
      headers: {
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`,
      },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) {
    throw Object.assign(new Error("Unable to reconcile payment with Razorpay"), {
      status: 502,
    });
  }
  const data = (await response.json()) as {
    items?: Array<{
      id: string;
      status: string;
      amount: number;
      currency: string;
    }>;
  };
  const providerPayments = data.items || [];
  const capturedPayment = providerPayments.find((item) => item.status === "captured");
  const inProgressPayment = providerPayments.find((item) =>
    ["created", "authorized", "pending"].includes(item.status),
  );
  const failedPayment = providerPayments.find((item) => item.status === "failed");
  if (capturedPayment) {
    await applyCapturedPayment(
      orderId,
      capturedPayment.id,
      capturedPayment.amount,
      capturedPayment.currency,
    );
  } else if (!inProgressPayment && failedPayment) {
    await applyFailedPayment(orderId, failedPayment.id);
  }
  if (capturedPayment) return "CAPTURED" as const;
  if (inProgressPayment) return "IN_PROGRESS" as const;
  if (failedPayment) return "FAILED" as const;
  return "UNPAID" as const;
}

export async function processRazorpayWebhook(
  rawBody: Buffer,
  signature: string,
  headerEventId?: string,
) {
  if (!verifyWebhookSignature(rawBody, signature)) {
    throw Object.assign(new Error("Invalid webhook signature"), { status: 400 });
  }
  type RazorpayWebhookBody = {
    id?: string;
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id?: string;
          order_id?: string;
          status?: string;
          amount?: number;
          currency?: string;
        };
      };
      refund?: {
        entity?: {
          id?: string;
          payment_id?: string;
          status?: string;
          amount?: number;
        };
      };
    };
  };
  let body: RazorpayWebhookBody;
  try {
    body = JSON.parse(rawBody.toString("utf8")) as RazorpayWebhookBody;
  } catch {
    throw Object.assign(new Error("Invalid webhook JSON"), { status: 400 });
  }
  if (!body.event) {
    throw Object.assign(new Error("Invalid Razorpay webhook payload"), { status: 400 });
  }
  const eventKey = webhookEventKey(body, headerEventId, rawBody);
  let event;
  try {
    event = await WebhookEvent.findOneAndUpdate(
      { providerEventId: eventKey },
      { $setOnInsert: { providerEventId: eventKey, eventType: body.event } },
      { upsert: true, new: true },
    );
  } catch (error: any) {
    if (error.code !== 11000) throw error;
    event = await WebhookEvent.findOne({ providerEventId: eventKey });
  }
  if (!event) {
    event = await WebhookEvent.findOne({ providerEventId: eventKey });
  }
  if (!event)
    throw new Error("Unable to persist Razorpay webhook event");
  if (event.processedAt) return { received: true, duplicate: true };

  const entity = body.payload?.payment?.entity;
  if (body.event === "payment.captured" || body.event === "order.paid") {
    if (!entity?.id || !entity.order_id) {
      throw Object.assign(new Error("Webhook is missing payment identifiers"), {
        status: 400,
      });
    }
    if (entity.amount === undefined || !entity.currency) {
      throw Object.assign(new Error("Webhook is missing payment amount or currency"), {
        status: 400,
      });
    }
    await applyCapturedPayment(
      entity.order_id,
      entity.id,
      entity.amount,
      entity.currency,
    );
  } else if (body.event === "payment.failed") {
    if (!entity?.order_id) {
      throw Object.assign(new Error("Webhook is missing an order identifier"), {
        status: 400,
      });
    }
    await applyFailedPayment(entity.order_id, entity.id);
  } else if (
    body.event === "refund.processed" ||
    body.event === "refund.failed"
  ) {
    const refund = body.payload?.refund?.entity;
    if (!refund?.id || !refund.payment_id) {
      throw Object.assign(new Error("Webhook is missing refund identifiers"), {
        status: 400,
      });
    }
    const knownRefund = await Payment.findOne({
      refundId: refund.id,
      paymentId: refund.payment_id,
    });
    if (
      knownRefund &&
      refund.amount !== undefined &&
      knownRefund.refundAmountPaise !== refund.amount
    ) {
      throw Object.assign(new Error("Webhook refund amount does not match"), {
        status: 409,
      });
    }
    const processed = body.event === "refund.processed";
    const payment = await Payment.findOneAndUpdate(
      {
        refundId: refund.id,
        paymentId: refund.payment_id,
        state: "REFUND_PENDING",
      },
      {
        $set: {
          state: processed ? "REFUNDED" : "VERIFIED",
          refundStatus: processed ? "PROCESSED" : "FAILED",
        },
        $addToSet: { events: processed ? "REFUND_PROCESSED" : "REFUND_FAILED" },
      },
      { new: true },
    );
    if (payment) {
      await Subscription.updateOne(
        { _id: payment.subscription, status: "REFUND_PENDING" },
        {
          $set: processed
            ? { status: "REFUNDED", paymentState: "REFUNDED" }
            : { status: "CANCELLED", paymentState: "VERIFIED" },
        },
      );
    }
  }
  await WebhookEvent.updateOne(
    { _id: event._id, processedAt: { $exists: false } },
    { $set: { processedAt: new Date() } },
  );
  return { received: true, duplicate: false };
}
