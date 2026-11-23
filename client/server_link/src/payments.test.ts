import crypto from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Payment, Subscription, WebhookEvent } from "./models.js";
import {
  reconcilePayment,
  createRazorpayOrder,
  calculatePlayerRefund,
  calculateCouponDiscount,
  isCouponExpired,
  verifyWebhookSignature,
  webhookEventKey,
  requestRazorpayRefund,
  processRazorpayWebhook,
} from "./payments.js";

afterEach(() => {
  delete process.env.RAZORPAY_KEY_ID;
  delete process.env.RAZORPAY_KEY_SECRET;
  delete process.env.RAZORPAY_WEBHOOK_SECRET;
  delete process.env.RAZORPAY_MODE;
  delete process.env.RAZORPAY_ALLOW_TEST_MODE_IN_PRODUCTION;
  delete process.env.NODE_ENV;
  vi.restoreAllMocks();
});

describe("payment verification", () => {
  it("rejects Razorpay Test Mode on production unless explicitly enabled", async () => {
    process.env.NODE_ENV = "production";
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "test-only-secret";
    process.env.RAZORPAY_MODE = "test";
    const fetch = vi.spyOn(globalThis, "fetch");

    await expect(createRazorpayOrder(499900, "sub-1", "sub-1")).rejects.toMatchObject({
      status: 503,
      message: "Razorpay mode does not match the configured key",
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("allows Test Mode on a production deployment only with the explicit opt-in", async () => {
    process.env.NODE_ENV = "production";
    process.env.RAZORPAY_ALLOW_TEST_MODE_IN_PRODUCTION = "true";
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "test-only-secret";
    process.env.RAZORPAY_MODE = "test";
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "order_test_1",
          amount: 499900,
          currency: "INR",
          status: "created",
        }),
        { status: 200 },
      ),
    );

    await expect(createRazorpayOrder(499900, "sub-1", "sub-1")).resolves.toMatchObject({
      id: "order_test_1",
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it("calculates percentage and fixed coupon discounts in paise", () => {
    expect(calculateCouponDiscount(19900, "PERCENTAGE", 20)).toEqual({
      discountPaise: 3980,
      finalAmountPaise: 15920,
    });
    expect(calculateCouponDiscount(19900, "FIXED", 2500)).toEqual({
      discountPaise: 2500,
      finalAmountPaise: 17400,
    });
    expect(calculateCouponDiscount(19999, "PERCENTAGE", 10).discountPaise).toBe(1999);
    expect(() => calculateCouponDiscount(19900, "FIXED", 19900)).toThrow(
      "Coupon discount must be less than the plan price",
    );
  });

  it("detects expired coupons while allowing coupons without an expiry", () => {
    const now = Date.UTC(2026, 10, 11);
    expect(isCouponExpired(new Date(now - 1), now)).toBe(true);
    expect(isCouponExpired(new Date(now + 1), now)).toBe(false);
    expect(isCouponExpired(undefined, now)).toBe(false);
  });

  it("deducts ₹80 for each submitted video when calculating player refunds", () => {
    expect(calculatePlayerRefund(49900, 2)).toBe(33900);
    expect(calculatePlayerRefund(8000, 1)).toBe(0);
    expect(calculatePlayerRefund(1000, 2)).toBe(0);
  });

  it("initiates a partial refund against the captured Razorpay payment", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "test-only-secret";
    process.env.RAZORPAY_MODE = "test";
    vi.spyOn(Payment, "findById").mockResolvedValue({
      _id: "payment-record-1",
      state: "VERIFIED",
      provider: "razorpay",
      paymentId: "pay_test_1",
      orderId: "order_test_1",
      amountPaise: 49900,
      currency: "INR",
    } as never);
    vi.spyOn(Payment, "findOneAndUpdate").mockResolvedValue({
      _id: "payment-record-1",
      state: "VERIFIED",
    } as never);
    const update = vi.spyOn(Payment, "updateOne").mockResolvedValue({
      modifiedCount: 1,
    } as never);
    const fetch = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "pay_test_1",
            order_id: "order_test_1",
            amount: 49900,
            amount_refunded: 0,
            currency: "INR",
            status: "captured",
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: "rfnd_test_1", status: "pending" }), {
          status: 200,
        }),
      );

    const refund = await requestRazorpayRefund("payment-record-1", 33900, {
      subscriptionId: "subscription-1",
      playerUserId: "player-1",
    });

    expect(refund).toMatchObject({
      refundId: "rfnd_test_1",
      status: "pending",
      alreadyRequested: false,
    });
    const [url, options] = fetch.mock.calls[1];
    expect(url).toBe("https://api.razorpay.com/v1/payments/pay_test_1/refund");
    expect(JSON.parse(String(options?.body))).toMatchObject({
      amount: 33900,
      notes: { subscriptionId: "subscription-1", playerUserId: "player-1" },
    });
    expect(update).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        $set: expect.objectContaining({
          refundId: "rfnd_test_1",
          refundStatus: "PENDING",
          state: "REFUND_PENDING",
        }),
      }),
    );
  });

  it("does not submit a second refund while a payment is being reconciled", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "test-only-secret";
    process.env.RAZORPAY_MODE = "test";
    vi.spyOn(Payment, "findById").mockResolvedValue({
      _id: "payment-record-1",
      state: "VERIFIED",
      provider: "razorpay",
      paymentId: "pay_test_1",
      orderId: "order_test_1",
      amountPaise: 49900,
      currency: "INR",
    } as never);
    vi.spyOn(Payment, "findOneAndUpdate").mockResolvedValue(null);
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "pay_test_1",
          order_id: "order_test_1",
          amount: 49900,
          amount_refunded: 0,
          currency: "INR",
          status: "captured",
        }),
        { status: 200 },
      ),
    );

    await expect(
      requestRazorpayRefund("payment-record-1", 33900, {
        subscriptionId: "subscription-1",
        playerUserId: "player-1",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0][0]).toBe(
      "https://api.razorpay.com/v1/payments/pay_test_1",
    );
  });

  it("rejects refunds when Razorpay does not confirm a captured payment", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "test-only-secret";
    process.env.RAZORPAY_MODE = "test";
    vi.spyOn(Payment, "findById").mockResolvedValue({
      _id: "payment-record-1",
      state: "VERIFIED",
      provider: "razorpay",
      paymentId: "pay_test_1",
      orderId: "order_test_1",
      amountPaise: 49900,
      currency: "INR",
    } as never);
    const update = vi.spyOn(Payment, "findOneAndUpdate");
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "pay_test_1",
          order_id: "order_test_1",
          amount: 49900,
          amount_refunded: 0,
          currency: "INR",
          status: "authorized",
        }),
        { status: 200 },
      ),
    );

    await expect(
      requestRazorpayRefund("payment-record-1", 33900, {
        subscriptionId: "subscription-1",
        playerUserId: "player-1",
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(fetch).toHaveBeenCalledOnce();
    expect(update).not.toHaveBeenCalled();
  });

  it("creates a server-side INR Test Mode order with the configured secret", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "test-only-secret";
    process.env.RAZORPAY_MODE = "test";
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          id: "order_test_1",
          amount: 499900,
          currency: "INR",
          status: "created",
        }),
        { status: 200 },
      ),
    );

    const order = await createRazorpayOrder(499900, "sub-1", "sub-1");

    expect(order.id).toBe("order_test_1");
    const [url, options] = fetch.mock.calls[0];
    expect(url).toBe("https://api.razorpay.com/v1/orders");
    expect(options?.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from("rzp_test_unit:test-only-secret").toString("base64")}`,
    });
    expect(JSON.parse(String(options?.body))).toMatchObject({
      amount: 499900,
      currency: "INR",
      receipt: "sub-1",
      notes: { subscriptionId: "sub-1" },
    });
  });

  it("does not apply a duplicate verified callback more than once", async () => {
    const secret = "test-only-secret";
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = secret;
    const orderId = "order_test_1";
    const paymentId = "pay_test_1";
    const signature = crypto
      .createHmac("sha256", secret)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    const existing = { orderId, paymentId, state: "VERIFIED" };
    const lookup = vi.spyOn(Payment, "findOne").mockResolvedValue(existing as never);
    const update = vi.spyOn(Payment, "findOneAndUpdate");
    const subscriptionUpdate = vi
      .spyOn(Subscription, "updateOne")
      .mockResolvedValue({ modifiedCount: 0 } as never);

    const first = await reconcilePayment(paymentId, orderId, signature);
    const second = await reconcilePayment(paymentId, orderId, signature);

    expect(first.changed).toBe(false);
    expect(second.changed).toBe(false);
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
    expect(subscriptionUpdate).toHaveBeenCalledTimes(2);
  });

  it("rejects an invalid signature before updating payment or entitlement state", async () => {
    process.env.RAZORPAY_KEY_ID = "rzp_test_unit";
    process.env.RAZORPAY_KEY_SECRET = "test-only-secret";
    const update = vi.spyOn(Payment, "findOneAndUpdate");
    await expect(
      reconcilePayment("pay_test_1", "order_test_1", "invalid"),
    ).rejects.toMatchObject({ status: 400 });
    expect(update).not.toHaveBeenCalled();
  });

  it("verifies webhook signatures against the original raw bytes", () => {
    const secret = "webhook-test-secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    const raw = Buffer.from('{"id":"evt_test","event":"payment.captured"}');
    const signature = crypto
      .createHmac("sha256", secret)
      .update(raw)
      .digest("hex");
    expect(verifyWebhookSignature(raw, signature)).toBe(true);
    expect(verifyWebhookSignature(Buffer.from(raw.toString().trim()), signature)).toBe(
      true,
    );
    expect(verifyWebhookSignature(Buffer.from(`${raw.toString()} `), signature)).toBe(
      false,
    );
  });

  it("uses the provider webhook ID or a stable raw-body key for idempotency", () => {
    const raw = Buffer.from('{"event":"payment.failed"}');
    expect(webhookEventKey({}, "evt_header", raw)).toBe("evt_header");
    expect(webhookEventKey({ id: "evt_body" }, undefined, raw)).toBe("evt_body");
    expect(webhookEventKey({}, undefined, raw)).toBe(
      webhookEventKey({}, undefined, raw),
    );
  });

  it("cancels the pending subscription when Razorpay reports a failed payment", async () => {
    const secret = "webhook-test-secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    const raw = Buffer.from(JSON.stringify({
      id: "evt_payment_failed",
      event: "payment.failed",
      payload: {
        payment: {
          entity: {
            id: "pay_test_failed",
            order_id: "order_test_failed",
            status: "failed",
          },
        },
      },
    }));
    const signature = crypto.createHmac("sha256", secret).update(raw).digest("hex");
    vi.spyOn(WebhookEvent, "findOneAndUpdate").mockResolvedValue({
      _id: "event-1",
    } as never);
    vi.spyOn(WebhookEvent, "updateOne").mockResolvedValue({
      modifiedCount: 1,
    } as never);
    vi.spyOn(Payment, "findOneAndUpdate").mockResolvedValue({
      subscription: "subscription-1",
    } as never);
    vi.spyOn(Subscription, "findById").mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    } as never);
    const subscriptionUpdate = vi.spyOn(Subscription, "updateOne").mockResolvedValue({
      modifiedCount: 1,
    } as never);

    await expect(processRazorpayWebhook(raw, signature)).resolves.toMatchObject({
      received: true,
      duplicate: false,
    });
    expect(subscriptionUpdate).toHaveBeenCalledWith(
      { _id: "subscription-1", status: "PENDING_PAYMENT" },
      {
        $set: {
          status: "CANCELLED",
          activeSlot: false,
          paymentState: "FAILED",
        },
      },
    );
  });

  it("reconciles an accepted refund from the signed Razorpay webhook", async () => {
    const secret = "webhook-test-secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = secret;
    const raw = Buffer.from(
      JSON.stringify({
        id: "evt_refund_processed",
        event: "refund.processed",
        payload: {
          refund: {
            entity: {
              id: "rfnd_test_1",
              payment_id: "pay_test_1",
              amount: 43900,
            },
          },
        },
      }),
    );
    const signature = crypto
      .createHmac("sha256", secret)
      .update(raw)
      .digest("hex");
    const event = vi
      .spyOn(WebhookEvent, "findOneAndUpdate")
      .mockResolvedValue({ _id: "event-1" } as never);
    vi.spyOn(WebhookEvent, "updateOne").mockResolvedValue({
      modifiedCount: 1,
    } as never);
    vi.spyOn(Payment, "findOne").mockResolvedValue({
      refundAmountPaise: 43900,
    } as never);
    const reconcile = vi.spyOn(Payment, "findOneAndUpdate").mockResolvedValue({
      subscription: "subscription-1",
    } as never);
    const subscriptionUpdate = vi
      .spyOn(Subscription, "updateOne")
      .mockResolvedValue({ modifiedCount: 1 } as never);

    await expect(processRazorpayWebhook(raw, signature)).resolves.toMatchObject({
      received: true,
      duplicate: false,
    });
    expect(event).toHaveBeenCalledOnce();
    expect(reconcile).toHaveBeenCalledWith(
      {
        refundId: "rfnd_test_1",
        paymentId: "pay_test_1",
        state: "REFUND_PENDING",
      },
      expect.objectContaining({
        $set: { state: "REFUNDED", refundStatus: "PROCESSED" },
      }),
      { new: true },
    );
    expect(subscriptionUpdate).toHaveBeenCalledWith(
      { _id: "subscription-1", status: "REFUND_PENDING" },
      { $set: { status: "REFUNDED", paymentState: "REFUNDED" } },
    );
  });
});
