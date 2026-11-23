import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import crypto from "node:crypto";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { z } from "zod";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import {
  User,
  Player,
  Coach,
  Plan,
  Coupon,
  Subscription,
  CoachRequest,
  Payment,
  Video,
  Review,
  ActionPlan,
  Notification,
  Audit,
  Resource,
  ResourcePurchase,
  EmailVerification,
  EmailOtp,
  PhoneVerification,
} from "./models.js";
import {
  createEmailOtp,
  createEmailVerificationToken,
  hashEmailOtp,
  hashEmailVerificationToken,
  sendEmail,
  sendPlayerNotificationEmail,
} from "./email.js";
import {
  createRazorpayOrder,
  calculateCouponDiscount,
  isCouponExpired,
  calculatePlayerRefund,
  processRazorpayWebhook,
  reconcilePayment,
  reconcileResourcePayment,
  reconcileRazorpayStatus,
  requestRazorpayRefund,
} from "./payments.js";
import { validateExternalVideoUrl } from "./video-links.js";
import {
  canAccessVideo,
  canRequestCoach,
  hasBlockingSubscription,
  isSubscriptionActive,
  type ResourceRole,
} from "./policies.js";
import {
  releaseExpiredCoachRequests,
  releaseExpiredSubscriptions,
  reserveCoachCapacity,
} from "./capacity.js";
import { normalizeIndiaPhoneNumber, sendOtpSms } from "./sms.js";
import { getSignupVerificationMethod } from "./signup-verification.js";
import {
  applyReferralReviews,
  awardReferralForFirstPurchase,
} from "./referrals.js";
const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required");
  return process.env.JWT_SECRET;
};
const app = express();
const googleOAuthClient = new OAuth2Client();
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : false);
app.use(helmet());
const allowedClientOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, callback) =>
      !origin || allowedClientOrigins.includes(origin)
        ? callback(null, true)
        : callback(new Error("Origin is not allowed by CORS")),
  }),
);
app.use("/api/v1/auth", rateLimit({ windowMs: 15 * 60e3, max: 100 }));
type Authed = Request & { user?: { id: string; role: ResourceRole } };
const asyncRoute =
  (f: (req: Request, res: Response, next: NextFunction) => unknown) =>
  (req: Request, res: Response, next: NextFunction) =>
    Promise.resolve(f(req, res, next)).catch(next);
app.post(
  "/api/v1/payments/webhook",
  express.raw({ type: "application/json", limit: "1mb" }),
  asyncRoute(async (req, res) => {
    if (!Buffer.isBuffer(req.body))
      throw Object.assign(new Error("Webhook requires a raw JSON body"), {
        status: 400,
      });
    const result = await processRazorpayWebhook(
      req.body,
      String(req.headers["x-razorpay-signature"] || ""),
      req.headers["x-razorpay-event-id"]?.toString(),
    );
    res.json(result);
  }),
);
app.use(express.json({ limit: "1mb" }));
app.get("/", (_req, res) =>
  res.json({ service: "CricketVault API", health: "/api/v1/health" }),
);
const auth = asyncRoute(
  async (req: Authed, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.replace(/^Bearer\s+/, "");
    if (!token)
      throw Object.assign(new Error("Authentication required"), {
        status: 401,
      });
    let claims: any;
    try {
      claims = jwt.verify(token, secret());
    } catch {
      throw Object.assign(
        new Error("Invalid or expired authentication token"),
        { status: 401 },
      );
    }
    const user = await User.findById(claims.id);
    if (!user || user.status === "DISABLED")
      throw Object.assign(new Error("Account unavailable"), { status: 401 });
    if ((claims.pv ?? 0) !== (user.get("tokenVersion") ?? 0))
      throw Object.assign(new Error("Invalid or expired authentication token"), {
        status: 401,
      });
    req.user = { id: user.id, role: user.role as ResourceRole };
    next();
  },
);
const roles = (...allowed: string[]) => [
  auth as any,
  (req: Authed, res: Response, next: NextFunction) =>
    allowed.includes(req.user!.role)
      ? next()
      : next(Object.assign(new Error("Forbidden"), { status: 403 })),
];
const notice = async (user: any, title: string, body: string, type = "INFO") =>
  Notification.create({ user, title, body, type });
const active = (s: any) => isSubscriptionActive(s.status, s.expiresAt);
const generateReferralCode = () => crypto.randomBytes(8).toString("hex").toUpperCase();
const signupVerificationMethod = () =>
  getSignupVerificationMethod(process.env.MSG91_TEMPLATE_ID);
const hasVerifiedPlayerSignup = (user: {
  phoneVerified?: boolean;
  emailVerified?: boolean;
  signupVerificationMethod?: string | null;
}) =>
  Boolean(
    user.phoneVerified ||
      (user.signupVerificationMethod === "EMAIL" && user.emailVerified),
  );

async function sendSignupEmailVerification(user: {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
}, session?: mongoose.ClientSession) {
  const userId = user._id.toString();
  const challenge = createEmailOtp(userId, "SIGNUP_EMAIL_VERIFICATION");
  const saveChallenge = () =>
    EmailVerification.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          tokenHash: challenge.otpHash,
          attempts: 0,
          expiresAt: challenge.expiresAt,
        },
        $setOnInsert: { user: user._id },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true, session },
    );
  if (session) await saveChallenge();
  try {
    await sendEmail({
      to: user.email,
      subject: "Verify your CricketVault account",
      text: `Hi ${user.name},\n\nYour account verification code is ${challenge.otp}. Enter it in CricketVault to activate your player account. It expires in 10 minutes.`,
      html: `<p>Hi ${user.name.replace(/[&<>"']/g, "")},</p><p>Your CricketVault account verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${challenge.otp}</p><p>Enter it in CricketVault to activate your player account. It expires in 10 minutes.</p>`,
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        message: "Player signup verification email could not be sent",
        userId,
        error: error instanceof Error ? error.message : "Unknown email error",
      }),
    );
    throw Object.assign(
      new Error(
        "Unable to send the email verification code. Please try again.",
      ),
      { status: 503 },
    );
  }
  if (!session) await saveChallenge();
}
async function pricePlanWithCoupon(plan: any, code: string) {
  const coupon = await Coupon.findOne({
    code: code.trim().toUpperCase(),
  });
  if (!coupon)
    throw Object.assign(new Error("Coupon code not found"), {
      status: 400,
    });
  if (!coupon.active)
    throw Object.assign(new Error("This coupon code is inactive"), {
      status: 400,
    });
  if (isCouponExpired(coupon.expiresAt))
    throw Object.assign(new Error("This coupon code has expired"), {
      status: 400,
    });
  const discount = calculateCouponDiscount(
    plan.pricePaise,
    coupon.discountType as "PERCENTAGE" | "FIXED",
    coupon.discountValue,
  );
  return { coupon, ...discount };
}
const deletionStatuses = ["ACTIVE", "AWAITING_COACH", "PENDING_PAYMENT"] as const;
const refundableSubscriptionStatuses = ["ACTIVE", "AWAITING_COACH", "EXPIRED", "CANCELLED"] as const;

async function buildUserDeletionPreview(user: any) {
  const blockers: string[] = [];
  if (user.role === "PLAYER") {
    const subscriptions = await Subscription.find({
      player: user._id,
      status: { $in: deletionStatuses },
    });
    const subscriptionDetails = await Promise.all(
      subscriptions.map(async (subscription) => {
        const [payments, submittedVideos] = await Promise.all([
          Payment.find({ subscription: subscription._id }).sort({ createdAt: -1 }),
          Video.countDocuments({ subscription: subscription._id }),
        ]);
        const payment = payments.find((item) =>
          ["CREATED", "PENDING"].includes(item.state),
        );
        if (
          subscription.status === "PENDING_PAYMENT" &&
          payment
        ) {
          blockers.push(
            `${subscription.planSnapshot?.name || "Subscription"}: A payment is still in progress and must resolve before deletion.`,
          );
        }
        return {
          id: String(subscription._id),
          planName: subscription.planSnapshot?.name || "Coaching plan",
          status: subscription.status,
          submittedVideos,
          paymentState: payments[0]?.state || "UNAVAILABLE",
          refundStatus: payments[0]?.refundStatus || null,
        };
      }),
    );
    return {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      canDelete: blockers.length === 0,
      blockers,
      subscriptions: subscriptionDetails,
    };
  }

  if (user.role === "COACH") {
    const [activeAssignments, pendingRequests] = await Promise.all([
      Subscription.countDocuments({
        coach: user._id,
        status: "ACTIVE",
      }),
      CoachRequest.countDocuments({ coach: user._id, status: "PENDING" }),
    ]);
    if (activeAssignments)
      blockers.push(
        `${activeAssignments} active player assignment${activeAssignments === 1 ? "" : "s"} must be resolved first.`,
      );
    if (pendingRequests)
      blockers.push(
        `${pendingRequests} pending player request${pendingRequests === 1 ? "" : "s"} must be resolved first.`,
      );
    return {
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
      },
      canDelete: blockers.length === 0,
      blockers,
      subscriptions: [],
    };
  }

  throw Object.assign(new Error("Only player and coach accounts can be deleted"), {
    status: 409,
  });
}

async function buildPlayerRefundPreview(
  playerId: string,
  subscriptionId: string,
  session?: mongoose.ClientSession,
) {
  const subscriptionQuery = Subscription.findOne({
    _id: subscriptionId,
    player: playerId,
  });
  if (session) subscriptionQuery.session(session);
  const subscription = await subscriptionQuery;
  if (!subscription)
    throw Object.assign(new Error("Subscription not found"), { status: 404 });

  const paymentQuery = Payment.find({ subscription: subscription._id }).sort({
    createdAt: -1,
  });
  if (session) paymentQuery.session(session);
  const videoQuery = Video.countDocuments({ subscription: subscription._id });
  if (session) videoQuery.session(session);
  let payments;
  let submittedVideos;
  if (session) {
    payments = await paymentQuery;
    submittedVideos = await videoQuery;
  } else {
    [payments, submittedVideos] = await Promise.all([paymentQuery, videoQuery]);
  }
  const capturedPayments = payments.filter((payment) =>
    ["VERIFIED", "REFUND_PENDING", "REFUNDED"].includes(payment.state),
  );
  const payment = capturedPayments.length === 1 ? capturedPayments[0] : null;
  const amountPaise = Number(payment?.amountPaise);
  const validAmount =
    Number.isSafeInteger(amountPaise) && amountPaise > 0;
  const base = {
    subscriptionId: String(subscription._id),
    planName: subscription.planSnapshot?.name || "Coaching plan",
    status: subscription.status,
    submittedVideos,
    paidAmountPaise: validAmount ? amountPaise : 0,
    deductionPaise: 0,
    refundPaise: 0,
    paymentState: payment?.state || payments[0]?.state || "UNAVAILABLE",
    refundStatus: payment?.refundStatus || payments[0]?.refundStatus || null,
    canRequest: false,
    message: "",
    paymentRecordId: payment ? String(payment._id) : null,
    originalStatus: subscription.status,
    originalPaymentState: subscription.paymentState,
    wasActiveSlot: subscription.activeSlot,
    hadCoachRequestPending: subscription.coachRequestPending,
    hadPaymentOrderPending: subscription.paymentOrderPending,
    coachId: subscription.coach ? String(subscription.coach) : null,
  };

  if (
    payment?.state === "REFUND_PENDING" ||
    payment?.refundStatus === "CREATING"
  ) {
    return {
      ...base,
      refundPaise: Number(payment.refundAmountPaise || 0),
      refundStatus: payment.refundStatus,
      message: "Your refund request is being processed.",
    };
  }
  if (payment?.state === "REFUNDED") {
    return {
      ...base,
      refundPaise: Number(payment.refundAmountPaise || 0),
      refundStatus: payment.refundStatus,
      message: "This payment has already been refunded.",
    };
  }
  if (!refundableSubscriptionStatuses.includes(
    subscription.status as (typeof refundableSubscriptionStatuses)[number],
  )) {
    return { ...base, message: "This subscription is not eligible for a refund." };
  }
  if (
    capturedPayments.length !== 1 ||
    !payment ||
    payment.state !== "VERIFIED" ||
    payment.provider !== "razorpay" ||
    !payment.paymentId ||
    !payment.orderId ||
    !validAmount
  ) {
    return {
      ...base,
      message: "A verified, captured Razorpay payment is required for a refund.",
    };
  }

  const refundPaise = calculatePlayerRefund(amountPaise, submittedVideos);
  const deductionPaise = amountPaise - refundPaise;
  return {
    ...base,
    deductionPaise,
    refundPaise,
    canRequest: refundPaise > 0,
    message:
      refundPaise > 0
        ? ""
        : "No refund remains after the ₹80 deduction for each submitted video.",
  };
}

app.get("/api/v1/health", (_q, res) =>
  res.json({ ok: true, mode: process.env.NODE_ENV || "development" }),
);
app.get("/api/v1/auth/config", (_req, res) =>
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || null,
    signupVerificationMethod: signupVerificationMethod(),
  }),
);
app.post(
  "/api/v1/auth/register",
  asyncRoute(async (req, res) => {
    const input = z
      .object({
        name: z.string().min(2),
        email: z
          .string()
          .email()
          .transform((v) => v.toLowerCase()),
        phone: z
          .string()
          .optional()
          .transform((value) =>
            value?.trim() ? normalizeIndiaPhoneNumber(value) : undefined,
          ),
        password: z.string().min(8),
        role: z.literal("PLAYER").default("PLAYER"),
        playingRole: z.string().optional(),
        referralCode: z.string().trim().max(20).optional(),
      })
      .parse(req.body);
    const verificationMethod = signupVerificationMethod();
    if (verificationMethod === "phone" && !input.phone)
      throw Object.assign(
        new Error("Enter a mobile number to receive your SMS verification code."),
        { status: 400 },
      );
    if (
      await User.exists({
        $or: [
          { email: input.email },
          ...(input.phone ? [{ phone: input.phone }] : []),
        ],
      })
    )
      throw Object.assign(
        new Error(
          "Email or mobile number already registered. If you already started signup, sign in to request a verification code.",
        ),
        { status: 409 },
      );
    const {
      playingRole,
      password,
      referralCode: _referralCode,
      phone,
      ...userData
    } = input;
    const session = await mongoose.startSession();
    try {
      session.startTransaction();
      let referrer: { _id: mongoose.Types.ObjectId } | null = null;
      if (input.referralCode) {
        referrer = await User.findOne({
          referralCode: input.referralCode.toUpperCase(),
          role: "PLAYER",
          status: "ACTIVE",
          $or: [
            { phoneVerified: true },
            { signupVerificationMethod: "EMAIL", emailVerified: true },
          ],
        })
          .select("_id")
          .session(session);
        if (!referrer)
          throw Object.assign(new Error("Referral code is invalid"), {
            status: 400,
          });
      }
      const user = new User({
        ...userData,
        ...(phone ? { phone } : {}),
        referralCode: generateReferralCode(),
        ...(referrer ? { referredBy: referrer._id } : {}),
        passwordHash: await bcrypt.hash(password, 12),
        status: "PENDING",
        emailVerified: false,
        phoneVerified: false,
        signupVerificationMethod: verificationMethod.toUpperCase(),
      });
      await user.save({ session });
      await new Player({ user: user._id, playingRole }).save({ session });
      if (verificationMethod === "phone") {
        const verification = createEmailOtp(user.id, "PHONE_VERIFICATION");
        await PhoneVerification.findOneAndUpdate(
          { user: user._id },
          {
            $set: {
              phone: user.phone,
              otpHash: verification.otpHash,
              expiresAt: verification.expiresAt,
              attempts: 0,
            },
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true,
            session,
          },
        );
        try {
          await sendOtpSms(phone!, verification.otp);
        } catch (error) {
          console.error(
            JSON.stringify({
              level: "error",
              message: "Player signup verification SMS could not be sent",
              userId: user.id,
              error:
                error instanceof Error ? error.message : "Unknown SMS error",
            }),
          );
          throw Object.assign(
            new Error("Unable to send the mobile verification code. Please try again."),
            { status: 503 },
          );
        }
      } else {
        await sendSignupEmailVerification(user, session);
      }
      await session.commitTransaction();
      res.status(202).json({
        verificationRequired: true,
        verificationMethod,
        email: user.email,
        phone: user.phone,
      });
    } catch (error) {
      if (session.inTransaction()) {
        try {
          await session.abortTransaction();
        } catch (rollbackError) {
          console.error(
            JSON.stringify({
              level: "error",
              message: "Player signup transaction rollback failed",
              error:
                rollbackError instanceof Error
                  ? rollbackError.message
                  : "Unknown rollback error",
            }),
          );
          throw Object.assign(
            new Error("Account creation failed and the rollback could not be confirmed."),
            { status: 500 },
          );
        }
      }
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === 11000
      )
        throw Object.assign(
          new Error(
            "Email or mobile number already registered. If you already started signup, sign in to request a verification code.",
          ),
          { status: 409 },
        );
      throw error;
    } finally {
      await session.endSession();
    }
  }),
);
app.post(
  "/api/v1/auth/signup-email-verification/resend",
  rateLimit({ windowMs: 15 * 60e3, max: 5 }),
  asyncRoute(async (req, res) => {
    const { email } = z
      .object({ email: z.string().email().transform((v) => v.toLowerCase()) })
      .parse(req.body);
    const user = await User.findOne({
      email,
      role: "PLAYER",
      status: "PENDING",
      phoneVerified: false,
      emailVerified: false,
      ...(signupVerificationMethod() === "email"
        ? {}
        : { signupVerificationMethod: "EMAIL" }),
    });
    if (user) {
      const session = await mongoose.startSession();
      try {
        session.startTransaction();
        const pendingUser = await User.findOneAndUpdate(
          {
            _id: user._id,
            role: "PLAYER",
            status: "PENDING",
            emailVerified: false,
          },
          {
            $set: {
              phoneVerified: false,
              signupVerificationMethod: "EMAIL",
            },
          },
          { new: true, session },
        );
        if (pendingUser)
          await sendSignupEmailVerification(pendingUser, session);
        await session.commitTransaction();
      } catch (error) {
        if (session.inTransaction()) {
          try {
            await session.abortTransaction();
          } catch (rollbackError) {
            console.error(
              JSON.stringify({
                level: "error",
                message: "Signup verification resend rollback failed",
                error:
                  rollbackError instanceof Error
                    ? rollbackError.message
                    : "Unknown rollback error",
              }),
            );
            throw Object.assign(
              new Error("Unable to complete verification; rollback could not be confirmed."),
              { status: 500 },
            );
          }
        }
        throw error;
      } finally {
        await session.endSession();
      }
    }
    res.json({
      message: "If the account needs email verification, a new code has been sent.",
    });
  }),
);
app.post(
  "/api/v1/auth/signup-email-verification/verify",
  rateLimit({ windowMs: 15 * 60e3, max: 10 }),
  asyncRoute(async (req, res) => {
    const input = z
      .object({
        email: z.string().email().transform((v) => v.toLowerCase()),
        otp: z.string().regex(/^\d{6}$/),
      })
      .parse(req.body);
    const account = await User.findOne({
      email: input.email,
      role: "PLAYER",
      status: "PENDING",
      signupVerificationMethod: "EMAIL",
      emailVerified: false,
    });
    const record = account
      ? await EmailVerification.findOneAndUpdate(
          {
            user: account._id,
            expiresAt: { $gt: new Date() },
            attempts: { $lt: 5 },
          },
          { $inc: { attempts: 1 } },
          { new: true },
        )
      : null;
    const expectedHash = record
      ? hashEmailOtp(account!.id, input.otp, "SIGNUP_EMAIL_VERIFICATION")
      : "";
    const hashMatches = Boolean(
      record &&
        crypto.timingSafeEqual(
          Buffer.from(record.tokenHash, "hex"),
          Buffer.from(expectedHash, "hex"),
        ),
    );
    if (!record || !hashMatches)
      throw Object.assign(
        new Error("Email verification code is invalid or expired. Request a new code."),
        { status: 400 },
      );
    const consumed = await EmailVerification.deleteOne({
      _id: record._id,
      tokenHash: record.tokenHash,
    });
    if (consumed.deletedCount !== 1)
      throw Object.assign(new Error("Email verification code is invalid or expired."), {
        status: 400,
      });
    const user = await User.findOneAndUpdate(
      {
        _id: account!._id,
        role: "PLAYER",
        status: "PENDING",
        signupVerificationMethod: "EMAIL",
        emailVerified: false,
      },
      {
        $set: {
          emailVerified: true,
          status: "ACTIVE",
          subscriptionEmailVerifiedAt: new Date(),
        },
      },
      { new: true },
    );
    if (!user)
      throw Object.assign(new Error("This player account is unavailable"), {
        status: 403,
      });
    await sendPlayerNotificationEmail(
      user.id,
      "Welcome to CricketVault",
      "Your email is verified and your player account is ready. Explore coaching plans and start your cricket development journey.",
      true,
    );
    res.json({ verified: true, email: user.email });
  }),
);
app.post(
  "/api/v1/auth/phone-verification/resend",
  rateLimit({ windowMs: 15 * 60e3, max: 5 }),
  asyncRoute(async (req, res) => {
    const { email } = z
      .object({ email: z.string().email().transform((v) => v.toLowerCase()) })
      .parse(req.body);
    const user = await User.findOne({
      email,
      role: "PLAYER",
      phoneVerified: false,
      status: "PENDING",
      signupVerificationMethod: { $ne: "EMAIL" },
    });
    if (user) {
      const verification = createEmailOtp(user.id, "PHONE_VERIFICATION");
      if (user.phone) {
        await sendOtpSms(user.phone, verification.otp);
        await PhoneVerification.findOneAndUpdate(
          { user: user._id },
          {
            $set: {
              phone: user.phone,
              otpHash: verification.otpHash,
              expiresAt: verification.expiresAt,
              attempts: 0,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }
    }
    res.json({
      message: "If the account needs mobile verification, a new code has been sent.",
    });
  }),
);
app.post(
  "/api/v1/auth/phone-verification/verify",
  rateLimit({ windowMs: 15 * 60e3, max: 10 }),
  asyncRoute(async (req, res) => {
    const input = z
      .object({
        email: z.string().email().transform((v) => v.toLowerCase()),
        otp: z.string().regex(/^\d{6}$/),
      })
      .parse(req.body);
    const account = await User.findOne({
      email: input.email,
      role: "PLAYER",
      status: "PENDING",
      phoneVerified: false,
      signupVerificationMethod: { $ne: "EMAIL" },
    });
    const record = account
      ? await PhoneVerification.findOneAndUpdate(
          {
            user: account._id,
            phone: account.phone,
            expiresAt: { $gt: new Date() },
            attempts: { $lt: 5 },
          },
          { $inc: { attempts: 1 } },
          { new: true },
        )
      : null;
    const expectedHash = record
      ? hashEmailOtp(account!.id, input.otp, "PHONE_VERIFICATION")
      : "";
    const hashMatches = Boolean(
      record &&
        crypto.timingSafeEqual(
          Buffer.from(record.otpHash, "hex"),
          Buffer.from(expectedHash, "hex"),
        ),
    );
    if (!record || !hashMatches)
      throw Object.assign(new Error("Mobile verification code is invalid or expired. Request a new code."), {
        status: 400,
      });
    const consumed = await PhoneVerification.deleteOne({
      _id: record._id,
      otpHash: record.otpHash,
    });
    if (consumed.deletedCount !== 1)
      throw Object.assign(new Error("Mobile verification code is invalid or expired."), {
        status: 400,
      });
    const user = await User.findOneAndUpdate(
      { _id: account!._id, role: "PLAYER", status: "PENDING", phoneVerified: false },
      { $set: { phoneVerified: true, status: "ACTIVE" } },
      { new: true },
    );
    if (!user || user.status === "DISABLED")
      throw Object.assign(new Error("This player account is unavailable"), {
        status: 403,
      });
    res.json({ verified: true, email: user.email });
  }),
);
app.post(
  "/api/v1/subscriptions/email-verification/request",
  ...roles("PLAYER"),
  rateLimit({ windowMs: 15 * 60e3, max: 5 }),
  asyncRoute(async (req: Authed, res) => {
    const user = await User.findById(req.user!.id);
    if (!user)
      throw Object.assign(new Error("Account unavailable"), { status: 404 });
    if (user.subscriptionEmailVerifiedAt)
      return res.json({ verified: true, message: "Email is already verified for purchases." });
    if (!hasVerifiedPlayerSignup(user))
      throw Object.assign(new Error("Verify your signup email before purchasing a plan."), {
        status: 403,
      });
    const challenge = createEmailOtp(user.id, "PLAN_PURCHASE_EMAIL");
    await EmailVerification.findOneAndUpdate(
      { user: user._id },
      {
        $set: {
          tokenHash: challenge.otpHash,
          attempts: 0,
          expiresAt: challenge.expiresAt,
        },
        $setOnInsert: { user: user._id },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    try {
      await sendEmail({
        to: user.email,
        subject: "Verify your email to purchase a CricketVault plan",
        text: `Hi ${user.name},\n\nYour email verification code is ${challenge.otp}. Enter it in CricketVault to continue with your subscription purchase. It expires in 10 minutes.`,
        html: `<p>Hi ${user.name.replace(/[&<>"']/g, "")},</p><p>Your CricketVault email verification code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${challenge.otp}</p><p>Enter this code in CricketVault to continue with your subscription purchase. It expires in 10 minutes.</p>`,
      });
    } catch (error) {
      console.error(JSON.stringify({
        level: "error",
        message: "Subscription email verification code could not be sent",
        userId: user.id,
        error: error instanceof Error ? error.message : "Unknown email error",
      }));
      throw Object.assign(new Error("Unable to send the email verification code. Please try again."), {
        status: 502,
      });
    }
    res.json({ sent: true, message: "A verification code has been sent to your email." });
  }),
);
app.post(
  "/api/v1/subscriptions/email-verification/verify",
  ...roles("PLAYER"),
  rateLimit({ windowMs: 15 * 60e3, max: 10 }),
  asyncRoute(async (req: Authed, res) => {
    const { otp } = z.object({ otp: z.string().regex(/^\d{6}$/) }).parse(req.body);
    const user = await User.findById(req.user!.id);
    if (!user)
      throw Object.assign(new Error("Account unavailable"), { status: 404 });
    if (user.subscriptionEmailVerifiedAt)
      return res.json({ verified: true, email: user.email });
    if (!hasVerifiedPlayerSignup(user))
      throw Object.assign(new Error("Verify your signup email before purchasing a plan."), {
        status: 403,
      });
    const record = await EmailVerification.findOneAndUpdate(
      {
        user: user._id,
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 5 },
      },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    const expectedHash = record
      ? hashEmailOtp(user.id, otp, "PLAN_PURCHASE_EMAIL")
      : "";
    const hashMatches = Boolean(
      record &&
        crypto.timingSafeEqual(
          Buffer.from(record.tokenHash, "hex"),
          Buffer.from(expectedHash, "hex"),
        ),
    );
    if (!record || !hashMatches)
      throw Object.assign(new Error("Email verification code is invalid or expired. Request a new code."), {
        status: 400,
      });
    const consumed = await EmailVerification.deleteOne({
      _id: record._id,
      tokenHash: record.tokenHash,
    });
    if (consumed.deletedCount !== 1)
      throw Object.assign(new Error("Email verification code is invalid or expired."), {
        status: 400,
      });
    const updatedUser = await User.findOneAndUpdate(
      { _id: user._id, subscriptionEmailVerifiedAt: { $exists: false } },
      { $set: { emailVerified: true, subscriptionEmailVerifiedAt: new Date() } },
      { new: true },
    );
    if (updatedUser) {
      await sendPlayerNotificationEmail(
        updatedUser.id,
        "Welcome to CricketVault",
        "Your email is verified and your player account is ready. Explore coaching plans and start your cricket development journey.",
        true,
      );
    }
    res.json({ verified: true, email: user.email });
  }),
);
app.post(
  "/api/v1/auth/email-verification/verify",
  rateLimit({ windowMs: 15 * 60e3, max: 10 }),
  asyncRoute(async (req, res) => {
    const { token } = z
      .object({ token: z.string().regex(/^[a-f\d]{64}$/i) })
      .parse(req.body);
    const record = await EmailVerification.findOne({
      tokenHash: hashEmailVerificationToken(token),
      expiresAt: { $gt: new Date() },
    });
    if (!record)
      throw Object.assign(new Error("Verification link is invalid or expired."), {
        status: 400,
      });
    const user = await User.findByIdAndUpdate(
      record.user,
      { $set: { emailVerified: true } },
      { new: true },
    );
    await EmailVerification.deleteOne({ _id: record._id });
    if (!user) throw Object.assign(new Error("Account unavailable"), { status: 404 });
    res.json({ verified: true, email: user.email });
  }),
);
app.post(
  "/api/v1/auth/password-reset/request",
  rateLimit({ windowMs: 60 * 60e3, max: 5 }),
  asyncRoute(async (req, res) => {
    const { email } = z
      .object({ email: z.string().email().transform((v) => v.toLowerCase()) })
      .parse(req.body);
    const user = await User.findOne({
      email,
      status: { $ne: "DISABLED" },
    }).select("+passwordHash");
    if (user?.passwordHash) {
      const challenge = createEmailOtp(user.id, "PASSWORD_RESET");
      await EmailOtp.findOneAndUpdate(
        { user: user._id, purpose: "PASSWORD_RESET" },
        {
          $set: {
            otpHash: challenge.otpHash,
            expiresAt: challenge.expiresAt,
            attempts: 0,
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
      try {
        await sendEmail({
          to: user.email,
          subject: "Your CricketVault password reset code",
          text: `Hi ${user.name},\n\nYour password reset code is ${challenge.otp}. It expires in 10 minutes. If you did not request this, you can ignore this email.`,
          html: `<p>Hi ${user.name.replace(/[&<>"']/g, "")},</p><p>Your CricketVault password reset code is:</p><p style="font-size:24px;font-weight:bold;letter-spacing:6px">${challenge.otp}</p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>`,
        });
      } catch (error) {
        console.error(JSON.stringify({
          level: "error",
          message: "Password reset email could not be sent",
          userId: user.id,
          error: error instanceof Error ? error.message : "Unknown email error",
        }));
      }
    }
    res.json({
      message: "If an eligible account exists for that email, a password reset code has been sent.",
    });
  }),
);
app.post(
  "/api/v1/auth/password-reset/complete",
  rateLimit({ windowMs: 15 * 60e3, max: 10 }),
  asyncRoute(async (req, res) => {
    const input = z
      .object({
        email: z.string().email().transform((v) => v.toLowerCase()),
        otp: z.string().regex(/^\d{6}$/),
        password: z.string().min(8).max(128),
      })
      .parse(req.body);
    const user = await User.findOne({
      email: input.email,
      status: { $ne: "DISABLED" },
    }).select("+passwordHash");
    if (!user?.passwordHash)
      throw Object.assign(new Error("Reset code is invalid or expired."), {
        status: 400,
      });
    const record = await EmailOtp.findOneAndUpdate(
      {
        user: user._id,
        purpose: "PASSWORD_RESET",
        expiresAt: { $gt: new Date() },
        attempts: { $lt: 5 },
      },
      { $inc: { attempts: 1 } },
      { new: true },
    );
    const expectedHash = record
      ? hashEmailOtp(user.id, input.otp, "PASSWORD_RESET")
      : "";
    const hashMatches = Boolean(
      record &&
        crypto.timingSafeEqual(
          Buffer.from(record.otpHash, "hex"),
          Buffer.from(expectedHash, "hex"),
        ),
    );
    if (!record || !hashMatches)
      throw Object.assign(new Error("Reset code is invalid or expired."), {
        status: 400,
      });
    const consumed = await EmailOtp.deleteOne({
      _id: record._id,
      otpHash: record.otpHash,
    });
    if (consumed.deletedCount !== 1)
      throw Object.assign(new Error("Reset code is invalid or expired."), {
        status: 400,
      });
    user.passwordHash = await bcrypt.hash(input.password, 12);
    user.set("tokenVersion", Number(user.get("tokenVersion") || 0) + 1);
    await user.save();
    await EmailOtp.deleteMany({ user: user._id, purpose: "PASSWORD_RESET" });
    res.json({ reset: true, message: "Password reset successfully. Sign in with your new password." });
  }),
);
app.post(
  "/api/v1/auth/login",
  asyncRoute(async (req, res) => {
    const input = z
      .object({
        email: z
          .string()
          .email()
          .transform((v) => v.toLowerCase()),
        password: z.string(),
      })
      .parse(req.body);
    const user = await User.findOne({ email: input.email }).select(
      "+passwordHash",
    );
    if (!user || !user.passwordHash || !(await bcrypt.compare(input.password, user.passwordHash)))
      throw Object.assign(new Error("Invalid email or password"), {
        status: 401,
      });
    if (user.status === "DISABLED")
      throw Object.assign(new Error("Account disabled"), { status: 403 });
    if (
      user.role === "PLAYER" &&
      user.status === "PENDING" &&
      !user.emailVerified &&
      (user.signupVerificationMethod === "EMAIL" ||
        signupVerificationMethod() === "email")
    )
      throw Object.assign(
        new Error("Verify your email before signing in. You can request a new email code."),
        { status: 403, code: "EMAIL_NOT_VERIFIED" },
      );
    if (
      user.role === "PLAYER" &&
      signupVerificationMethod() === "phone" &&
      user.signupVerificationMethod !== "EMAIL" &&
      !user.phoneVerified
    )
      throw Object.assign(
        new Error("Verify your mobile number before signing in. You can request a new SMS code."),
        { status: 403, code: "PHONE_NOT_VERIFIED" },
      );
    const token = jwt.sign({
      id: user.id,
      role: user.role,
      pv: user.get("tokenVersion") ?? 0,
    }, secret(), {
      expiresIn: "7d",
    });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        signupVerificationMethod: user.signupVerificationMethod,
        subscriptionEmailVerified: Boolean(user.subscriptionEmailVerifiedAt),
        referralCode: user.referralCode,
        referralReviewCredits: user.referralReviewCredits,
        role: user.role,
      },
    });
  }),
);
app.post(
  "/api/v1/auth/google",
  asyncRoute(async (req, res) => {
    const input = z
      .object({
        credential: z.string().min(1),
        intent: z.enum(["login", "signup"]),
        role: z.enum(["PLAYER", "COACH"]),
      })
      .parse(req.body);
    if (input.intent === "signup")
      throw Object.assign(
        new Error("Player sign-up requires a mobile number and SMS verification. Use the player sign-up form."),
        { status: 403 },
      );
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId)
      throw Object.assign(
        new Error("Google sign-in is not configured on this server"),
        { status: 503 },
      );
    let payload;
    try {
      const ticket = await googleOAuthClient.verifyIdToken({
        idToken: input.credential,
        audience: clientId,
      });
      payload = ticket.getPayload();
    } catch {
      throw Object.assign(new Error("Google sign-in token is invalid or expired"), {
        status: 401,
      });
    }
    if (!payload?.sub || !payload.email || payload.email_verified !== true)
      throw Object.assign(new Error("Google account must have a verified email"), {
        status: 401,
      });
    const email = payload.email.toLowerCase();
    let user = await User.findOne({ googleId: payload.sub }).select("+googleId");
    let newlyCreatedPlayer = false;
    if (user && user.email !== email)
      throw Object.assign(
        new Error("The Google account email does not match the linked account"),
        { status: 403 },
      );
    if (!user) {
      user = await User.findOne({ email }).select("+googleId");
      if (user?.googleId && user.googleId !== payload.sub)
        throw Object.assign(new Error("This email is linked to another Google account"), {
          status: 409,
        });
      if (user) {
        user.googleId = payload.sub;
        await user.save();
      } else {
        if (input.intent === "login")
          throw Object.assign(
            new Error("No account found. Choose Sign Up and select your account role."),
            { status: 404 },
          );
        user = await User.create({
          name: payload.name?.trim() || email.split("@")[0],
          email,
          googleId: payload.sub,
          role: input.role,
          status: input.role === "COACH" ? "PENDING" : "ACTIVE",
          emailVerified: true,
        });
        if (input.role === "PLAYER") {
          await Player.create({ user: user._id });
          newlyCreatedPlayer = true;
        }
        else await Coach.create({ user: user._id, approved: false });
      }
    }
    if (!user.emailVerified) {
      user.emailVerified = true;
      await user.save();
    }
    if (user.status === "DISABLED")
      throw Object.assign(new Error("Account disabled"), { status: 403 });
    if (newlyCreatedPlayer) {
      await sendPlayerNotificationEmail(
        user.id,
        "Welcome to CricketVault",
        "Your player account is ready. Explore coaching plans and start your cricket development journey.",
        true,
      );
    }
    const token = jwt.sign({
      id: user.id,
      role: user.role,
      pv: user.get("tokenVersion") ?? 0,
    }, secret(), {
      expiresIn: "7d",
    });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        signupVerificationMethod: user.signupVerificationMethod,
        subscriptionEmailVerified: Boolean(user.subscriptionEmailVerifiedAt),
        referralCode: user.referralCode,
        referralReviewCredits: user.referralReviewCredits,
        role: user.role,
      },
    });
  }),
);
app.get(
  "/api/v1/auth/me",
  auth,
  asyncRoute(async (req: Authed, res) => {
    const user = await User.findById(req.user!.id);
    res.json({ user });
  }),
);
app.get(
  "/api/v1/users/me/preferences",
  auth,
  asyncRoute(async (req: Authed, res) => {
    const user = await User.findById(req.user!.id).select("preferences");
    res.json({
      preferences: user?.preferences || { emailAlerts: true, smsAlerts: false },
    });
  }),
);
app.put(
  "/api/v1/users/me/preferences",
  auth,
  asyncRoute(async (req: Authed, res) => {
    const preferences = z
      .object({
        emailAlerts: z.boolean(),
        smsAlerts: z.boolean(),
      })
      .parse(req.body);
    const user = await User.findByIdAndUpdate(
      req.user!.id,
      { $set: { preferences } },
      { new: true },
    ).select("preferences");
    res.json({ preferences: user?.preferences });
  }),
);
app.get(
  "/api/v1/players/me",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) =>
    res.json({
      profile: await Player.findOne({ user: req.user!.id }).populate(
        "user",
        "name email",
      ),
    }),
  ),
);
app.get(
  "/api/v1/players/me/referral",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    let user = await User.findById(req.user!.id);
    if (!user) throw Object.assign(new Error("Account unavailable"), { status: 404 });
    if (!user.referralCode) {
      user.referralCode = generateReferralCode();
      await user.save();
    }
    const successfulReferrals = await User.countDocuments({
      referredBy: user._id,
      referralRewardedAt: { $exists: true },
    });
    res.json({
      referralCode: user.referralCode,
      reviewCredits: user.referralReviewCredits || 0,
      successfulReferrals,
    });
  }),
);
app.put(
  "/api/v1/players/me",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const data = z
      .object({
        ageGroup: z.string().optional(),
        location: z.string().optional(),
        playingRole: z.string().optional(),
        battingStyle: z.string().optional(),
        bowlingStyle: z.string().optional(),
        skillLevel: z.string().optional(),
        formats: z.array(z.string()).optional(),
        goals: z.array(z.string()).optional(),
        improvements: z.array(z.string()).optional(),
        availability: z.string().max(200).optional(),
      })
      .parse(req.body);
    const profile = await Player.findOneAndUpdate(
      { user: req.user!.id },
      data,
      { new: true, upsert: true },
    );
    res.json({ profile });
  }),
);
app.get(
  "/api/v1/coaches",
  asyncRoute(async (req, res) => {
    await releaseExpiredSubscriptions();
    await releaseExpiredCoachRequests();
    const filter: any = {
      approved: true,
      available: true,
      $expr: {
        $lt: [
          {
            $add: [
              { $ifNull: ["$activeCount", 0] },
              { $ifNull: ["$reservedCount", 0] },
            ],
          },
          { $ifNull: ["$capacity", 8] },
        ],
      },
    };
    const coaches = await Coach.find(filter)
      .populate("user", "name email role")
      .sort({ experience: -1 });
    res.json({ coaches });
  }),
);
app.get(
  "/api/v1/coaches/me",
  ...roles("COACH"),
  asyncRoute(async (req: Authed, res) =>
    res.json({ profile: await Coach.findOne({ user: req.user!.id }) }),
  ),
);
app.put(
  "/api/v1/coaches/me",
  ...roles("COACH"),
  asyncRoute(async (req: Authed, res) => {
    const body = z
      .object({
        bio: z.string().max(1000).optional(),
        approach: z.string().max(1000).optional(),
        experience: z.number().min(0).optional(),
        pricePerReview: z.number().min(0).optional(),
        specialties: z.array(z.string()).optional(),
        levels: z.array(z.string()).optional(),
        formats: z.array(z.string()).optional(),
        available: z.boolean().optional(),
        location: z.string().max(200).optional(),
      })
      .parse(req.body);
    res.json({
      profile: await Coach.findOneAndUpdate({ user: req.user!.id }, body, {
        new: true,
      }),
    });
  }),
);
app.get(
  "/api/v1/plans",
  asyncRoute(async (_q, res) =>
    res.json({
      plans: await Plan.find({ published: true }).sort({ pricePaise: 1 }),
    }),
  ),
);
app.post(
  "/api/v1/admin/plans",
  ...roles("ADMIN"),
  asyncRoute(async (req, res) => {
    const plan = await Plan.create(
      z
        .object({
          name: z.string().min(2),
          description: z.string(),
          pricePaise: z.number().int().positive(),
          durationDays: z.number().int().positive(),
          maxVideos: z.number().int().positive(),
          includedReviews: z.number().int().positive(),
          feedbackFrequency: z.string(),
          features: z.array(z.string()),
          published: z.boolean(),
        })
        .parse(req.body),
    );
    await Audit.create({
      actor: (req as Authed).user!.id,
      action: "PLAN_CREATED",
      target: plan.id,
      meta: { name: plan.name, published: plan.published },
    });
    res.status(201).json({ plan });
  }),
);
app.get(
  "/api/v1/admin/plans",
  ...roles("ADMIN"),
  asyncRoute(async (_req, res) =>
    res.json({ plans: await Plan.find().sort({ createdAt: -1 }) }),
  ),
);
app.patch(
  "/api/v1/admin/plans/:id",
  ...roles("ADMIN"),
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        name: z.string().min(2).optional(),
        description: z.string().optional(),
        pricePaise: z.number().int().positive().optional(),
        durationDays: z.number().int().positive().optional(),
        maxVideos: z.number().int().positive().optional(),
        includedReviews: z.number().int().positive().optional(),
        feedbackFrequency: z.string().optional(),
        features: z.array(z.string()).optional(),
        published: z.boolean().optional(),
      })
      .parse(req.body);
    const plan = await Plan.findByIdAndUpdate(req.params.id, data, {
      new: true,
      runValidators: true,
    });
    if (!plan)
      throw Object.assign(new Error("Plan not found"), { status: 404 });
    await Audit.create({
      actor: (req as Authed).user!.id,
      action: "PLAN_UPDATED",
      target: req.params.id,
      meta: data,
    });
    res.json({ plan });
  }),
);
app.delete(
  "/api/v1/admin/plans/:id",
  ...roles("ADMIN"),
  asyncRoute(async (req, res) => {
    const planId = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
    if (await Subscription.exists({ plan: planId }))
      throw Object.assign(
        new Error("This plan has subscription history. Unpublish it instead of deleting it."),
        { status: 409 },
      );
    const plan = await Plan.findByIdAndDelete(planId);
    if (!plan) throw Object.assign(new Error("Plan not found"), { status: 404 });
    await Audit.create({
      actor: (req as Authed).user!.id,
      action: "PLAN_DELETED",
      target: plan.id,
      meta: { name: plan.name },
    });
    res.status(204).end();
  }),
);
app.get(
  "/api/v1/admin/coupons",
  ...roles("ADMIN"),
  asyncRoute(async (_req, res) =>
    res.json({ coupons: await Coupon.find().sort({ createdAt: -1 }) }),
  ),
);
app.post(
  "/api/v1/admin/coupons",
  ...roles("ADMIN"),
  asyncRoute(async (req: Authed, res) => {
    const data = z
      .object({
        code: z.string().trim().regex(/^[A-Z0-9_-]{3,30}$/i).transform((code) => code.toUpperCase()),
        discountType: z.enum(["PERCENTAGE", "FIXED"]),
        discountValue: z.number().int().positive(),
        active: z.boolean(),
        expiresAt: z.string().datetime().nullable().optional(),
      })
      .parse(req.body);
    if (data.discountType === "PERCENTAGE" && data.discountValue >= 100)
      throw Object.assign(new Error("Percentage coupons must be below 100%"), {
        status: 400,
      });
    let coupon;
    try {
      coupon = await Coupon.create({
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
      });
    } catch (error: any) {
      if (error.code === 11000)
        throw Object.assign(new Error("That coupon code already exists"), {
          status: 409,
        });
      throw error;
    }
    await Audit.create({
      actor: req.user!.id,
      action: "COUPON_CREATED",
      target: coupon.id,
      meta: { code: coupon.code, discountType: coupon.discountType },
    });
    res.status(201).json({ coupon });
  }),
);
app.patch(
  "/api/v1/admin/coupons/:id",
  ...roles("ADMIN"),
  asyncRoute(async (req: Authed, res) => {
    const couponId = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
    const data = z
      .object({
        code: z.string().trim().regex(/^[A-Z0-9_-]{3,30}$/i).transform((code) => code.toUpperCase()).optional(),
        discountType: z.enum(["PERCENTAGE", "FIXED"]).optional(),
        discountValue: z.number().int().positive().optional(),
        active: z.boolean().optional(),
        expiresAt: z.string().datetime().nullable().optional(),
      })
      .parse(req.body);
    const existing = await Coupon.findById(couponId);
    if (!existing)
      throw Object.assign(new Error("Coupon not found"), { status: 404 });
    const discountType = data.discountType ?? existing.discountType;
    const discountValue = data.discountValue ?? existing.discountValue;
    if (discountType === "PERCENTAGE" && discountValue >= 100)
      throw Object.assign(new Error("Percentage coupons must be below 100%"), {
        status: 400,
      });
    let coupon;
    try {
      const { expiresAt, ...fields } = data;
      const update = {
        ...fields,
        ...(expiresAt ? { expiresAt: new Date(expiresAt) } : {}),
      };
      if (expiresAt === null) {
        coupon = await Coupon.findByIdAndUpdate(
          couponId,
          { $set: update, $unset: { expiresAt: 1 } },
          { new: true, runValidators: true },
        );
      } else {
        coupon = await Coupon.findByIdAndUpdate(couponId, update, {
          new: true,
          runValidators: true,
        });
      }
    } catch (error: any) {
      if (error.code === 11000)
        throw Object.assign(new Error("That coupon code already exists"), {
          status: 409,
        });
      throw error;
    }
    if (!coupon)
      throw Object.assign(new Error("Coupon not found"), { status: 404 });
    await Audit.create({
      actor: req.user!.id,
      action: "COUPON_UPDATED",
      target: coupon.id,
      meta: data,
    });
    res.json({ coupon });
  }),
);
app.delete(
  "/api/v1/admin/coupons/:id",
  ...roles("ADMIN"),
  asyncRoute(async (req: Authed, res) => {
    const couponId = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
    const coupon = await Coupon.findByIdAndDelete(couponId);
    if (!coupon)
      throw Object.assign(new Error("Coupon not found"), { status: 404 });
    await Audit.create({
      actor: req.user!.id,
      action: "COUPON_DELETED",
      target: coupon.id,
      meta: { code: coupon.code },
    });
    res.status(204).end();
  }),
);
app.post(
  "/api/v1/coupons/validate",
  ...roles("PLAYER"),
  asyncRoute(async (_req, res) => {
    const { planId, code } = z
      .object({
        planId: z.string().regex(/^[a-f\d]{24}$/i),
        code: z.string().trim().min(1).max(30),
      })
      .parse(_req.body);
    const plan = await Plan.findOne({ _id: planId, published: true });
    if (!plan)
      throw Object.assign(new Error("Plan unavailable"), { status: 404 });
    const { coupon, discountPaise, finalAmountPaise } = await pricePlanWithCoupon(plan, code);
    res.json({
      coupon: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        expiresAt: coupon.expiresAt,
      },
      originalAmountPaise: plan.pricePaise,
      discountPaise,
      finalAmountPaise,
    });
  }),
);
app.get(
  "/api/v1/admin/coaches",
  ...roles("ADMIN"),
  asyncRoute(async (_req, res) =>
    res.json({
      coaches: await Coach.find()
        .populate("user", "name email status")
        .sort({ createdAt: -1 }),
    }),
  ),
);
app.post(
  "/api/v1/admin/coaches",
  ...roles("ADMIN"),
  asyncRoute(async (req: Authed, res) => {
    const data = z
      .object({
        name: z.string().trim().min(2).max(120),
        email: z.string().email().transform((value) => value.toLowerCase()),
        password: z.string().min(8).max(128),
        bio: z.string().max(1000).optional(),
        experience: z.number().min(0).max(80).optional(),
        pricePerReview: z.number().min(0).max(1000000).optional(),
        specialties: z.array(z.string().trim().min(1).max(80)).min(1).max(10),
        location: z.string().trim().max(200).optional(),
        capacity: z.number().int().min(1).max(100).default(8),
      })
      .parse(req.body);
    if (await User.exists({ email: data.email }))
      throw Object.assign(new Error("Email already registered"), {
        status: 409,
      });

    const { password, ...coachData } = data;
    const user = await User.create({
      name: coachData.name,
      email: coachData.email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "COACH",
      status: "ACTIVE",
    });
    try {
      const profile = await Coach.create({
        user: user._id,
        bio: coachData.bio,
        experience: coachData.experience,
        pricePerReview: coachData.pricePerReview,
        specialties: coachData.specialties,
        location: coachData.location,
        capacity: coachData.capacity,
        available: true,
        approved: true,
      });
      await Audit.create({
        actor: req.user!.id,
        action: "COACH_CREATED",
        target: user.id,
        meta: { email: user.email, coachProfileId: profile.id },
      });
      res.status(201).json({
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        profile,
      });
    } catch (error) {
      await Coach.deleteOne({ user: user._id });
      await User.deleteOne({ _id: user._id });
      throw error;
    }
  }),
);
app.get(
  "/api/v1/admin/users",
  ...roles("ADMIN"),
  asyncRoute(async (_req, res) => {
    const users = await User.find().sort({ createdAt: -1 });
    const [players, coaches] = await Promise.all([
      Player.find({ user: { $in: users.map((user) => user._id) } }),
      Coach.find({ user: { $in: users.map((user) => user._id) } }),
    ]);
    const playerByUser = new Map(players.map((profile) => [String(profile.user), profile]));
    const coachByUser = new Map(coaches.map((profile) => [String(profile.user), profile]));
    res.json({
      users: users.map((user) => ({
        ...user.toObject(),
        playerProfile: playerByUser.get(user.id) || null,
        coachProfile: coachByUser.get(user.id) || null,
      })),
    });
  }),
);
app.get(
  "/api/v1/admin/users/:id/deletion-preview",
  ...roles("ADMIN"),
  asyncRoute(async (req, res) => {
    const userId = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
    await releaseExpiredSubscriptions();
    await releaseExpiredCoachRequests();
    const user = await User.findById(userId);
    if (!user)
      throw Object.assign(new Error("User not found"), { status: 404 });
    res.json(await buildUserDeletionPreview(user));
  }),
);
app.delete(
  "/api/v1/admin/users/:id",
  ...roles("ADMIN"),
  asyncRoute(async (req: Authed, res) => {
    z.object({ confirmed: z.literal(true) }).parse(req.body);
    const userId = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
    await releaseExpiredSubscriptions();
    await releaseExpiredCoachRequests();
    const user = await User.findById(userId);
    if (!user)
      throw Object.assign(new Error("User not found"), { status: 404 });
    const preview = await buildUserDeletionPreview(user);
    if (!preview.canDelete)
      throw Object.assign(new Error(preview.blockers.join(" ")), { status: 409 });

    if (user.role === "COACH") {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const current = await User.findOne({
            _id: user._id,
            role: "COACH",
          }).session(session);
          if (!current)
            throw Object.assign(new Error("Coach account is no longer available"), {
              status: 409,
            });
          await Coach.updateOne(
            { user: user._id },
            { $set: { available: false, approved: false } },
            { session },
          );
          const [activeAssignments, pendingRequests] = await Promise.all([
            Subscription.countDocuments({
              coach: user._id,
              status: "ACTIVE",
            }).session(session),
            CoachRequest.countDocuments({
              coach: user._id,
              status: "PENDING",
            }).session(session),
          ]);
          if (activeAssignments || pendingRequests)
            throw Object.assign(
              new Error("Coach assignments or requests changed; resolve them before deletion"),
              { status: 409 },
            );
          await Promise.all([
            Notification.deleteMany({ user: user._id }, { session }),
            User.deleteOne({ _id: user._id }, { session }),
            Audit.create(
              [
                {
                  actor: req.user!.id,
                  action: "COACH_DELETED",
                  target: String(user._id),
                },
              ],
              { session },
            ),
          ]);
          await Coach.deleteOne({ user: user._id }, { session });
        });
      } finally {
        await session.endSession();
      }
      return res.json({ deleted: true });
    }

    const previousStatus = user.status;
    const disableResult = await User.updateOne(
      { _id: user._id, role: "PLAYER", status: previousStatus },
      { $set: { status: "DISABLED" } },
    );
    if (!disableResult.matchedCount)
      throw Object.assign(
        new Error("Player account changed while deletion was starting; retry"),
        { status: 409 },
      );
    const disabledByThisRequest = Boolean(disableResult.modifiedCount);
    const disabledUser = await User.findById(user._id);
    if (!disabledUser)
      throw Object.assign(new Error("Player account is no longer available"), {
        status: 409,
      });
    let currentPreview;
    try {
      currentPreview = await buildUserDeletionPreview(disabledUser);
    } catch (error) {
      if (disabledByThisRequest) {
        await User.updateOne(
          { _id: user._id, role: "PLAYER" },
          { $set: { status: previousStatus } },
        );
      }
      throw error;
    }
    if (!currentPreview.canDelete) {
      if (disabledByThisRequest) {
        await User.updateOne(
          { _id: user._id, role: "PLAYER" },
          { $set: { status: previousStatus } },
        );
      }
      throw Object.assign(new Error(currentPreview.blockers.join(" ")), {
        status: 409,
      });
    }
    try {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const current = await User.findOne({
            _id: user._id,
            role: "PLAYER",
          }).session(session);
          if (!current)
            throw Object.assign(new Error("Player account is no longer available"), {
              status: 409,
            });
          const subscriptions = await Subscription.find({
            player: user._id,
          }).session(session);
          const currentPlanIds = new Set(
            currentPreview.subscriptions.map((subscription) => subscription.id),
          );
          const unplannedActiveSubscription = subscriptions.find(
            (subscription) =>
              deletionStatuses.includes(
                subscription.status as (typeof deletionStatuses)[number],
              ) &&
              !currentPlanIds.has(String(subscription._id)),
          );
          if (unplannedActiveSubscription)
            throw Object.assign(
              new Error("A subscription changed during deletion; refresh and retry"),
              { status: 409 },
            );
          const subscriptionIds = subscriptions.map((item) => item._id);
          const requests = await CoachRequest.find({
            subscription: { $in: subscriptionIds },
            status: "PENDING",
          }).session(session);
          for (const request of requests) {
            await Coach.updateOne(
              { user: request.coach, reservedCount: { $gt: 0 } },
              { $inc: { reservedCount: -1 } },
              { session },
            );
          }
          for (const subscription of subscriptions) {
            if (subscription.status === "ACTIVE" && subscription.coach) {
              await Coach.updateOne(
                { user: subscription.coach, activeCount: { $gt: 0 } },
                { $inc: { activeCount: -1 } },
                { session },
              );
            }
          }
          for (const subscription of subscriptions) {
            const payment = await Payment.findOne({
              subscription: subscription._id,
            }).session(session);
            const refundInProgress =
              subscription.status === "REFUND_PENDING" ||
              payment?.refundStatus === "CREATING" ||
              payment?.state === "REFUND_PENDING";
            const refundComplete =
              subscription.status === "REFUNDED" ||
              payment?.state === "REFUNDED";
            const preservedRefundStatus = refundComplete
              ? "REFUNDED"
              : refundInProgress
                ? "REFUND_PENDING"
                : undefined;
            await Subscription.updateOne(
              { _id: subscription._id },
              {
                $set: {
                  ...(!preservedRefundStatus &&
                  ["ACTIVE", "AWAITING_COACH", "PENDING_PAYMENT"].includes(
                    subscription.status,
                  )
                    ? { status: "CANCELLED" }
                    : {}),
                  ...(preservedRefundStatus
                    ? {
                        status: preservedRefundStatus,
                        paymentState: preservedRefundStatus,
                      }
                    : {}),
                  activeSlot: false,
                  coachRequestPending: false,
                  paymentOrderPending: false,
                },
              },
              { session },
            );
          }
          await Promise.all([
            CoachRequest.deleteMany(
              { subscription: { $in: subscriptionIds } },
              { session },
            ),
            Review.deleteMany(
              { subscription: { $in: subscriptionIds } },
              { session },
            ),
            ActionPlan.deleteMany(
              { subscription: { $in: subscriptionIds } },
              { session },
            ),
            Video.deleteMany(
              {
                $or: [
                  { player: user._id },
                  { subscription: { $in: subscriptionIds } },
                ],
              },
              { session },
            ),
            Notification.deleteMany({ user: user._id }, { session }),
            EmailVerification.deleteOne({ user: user._id }, { session }),
            EmailOtp.deleteMany({ user: user._id }, { session }),
            PhoneVerification.deleteOne({ user: user._id }, { session }),
            Player.deleteOne({ user: user._id }, { session }),
            User.deleteOne({ _id: user._id }, { session }),
            Audit.create(
              [
                {
                  actor: req.user!.id,
                  action: "PLAYER_DELETED",
                  target: String(user._id),
                },
              ],
              { session },
            ),
          ]);
        });
      } finally {
        await session.endSession();
      }
    } catch (error) {
      if (disabledByThisRequest) {
        await User.updateOne(
          { _id: user._id, role: "PLAYER" },
          { $set: { status: previousStatus } },
        );
      }
      throw error;
    }
    if (user.preferences?.emailAlerts) {
      try {
        await sendEmail({
          to: user.email,
          subject: "Your CricketVault player account was deleted",
          text: `Hi ${user.name},\n\nAn administrator deleted your CricketVault player account after reviewing the account conditions. No refund was initiated as part of this deletion. Contact support if you believe this was a mistake.`,
          html: `<p>Hi ${user.name.replace(/[&<>"']/g, "")},</p><p>An administrator deleted your CricketVault player account after reviewing the account conditions. No refund was initiated as part of this deletion.</p><p>Contact CricketVault support if you believe this was a mistake.</p>`,
        });
      } catch (error) {
        console.error(JSON.stringify({
          level: "error",
          message: "Unable to deliver player account deletion email",
          userId: String(user._id),
          error: error instanceof Error ? error.message : "Unknown email error",
        }));
      }
    }
    res.json({ deleted: true });
  }),
);
app.patch(
  "/api/v1/admin/coaches/:id",
  ...roles("ADMIN"),
  asyncRoute(async (req, res) => {
    const update = z
      .object({
        approved: z.boolean().optional(),
        available: z.boolean().optional(),
        capacity: z.number().int().min(1).optional(),
      })
      .parse(req.body);
    const filter: any = { _id: req.params.id };
    if (update.capacity !== undefined)
      filter.$expr = {
        $lte: [
          {
            $add: [
              { $ifNull: ["$activeCount", 0] },
              { $ifNull: ["$reservedCount", 0] },
            ],
          },
          update.capacity,
        ],
      };
    const profile = await Coach.findOneAndUpdate(filter, update, {
      new: true,
      runValidators: true,
    });
    if (!profile)
      throw Object.assign(
        new Error(
          "Coach not found or capacity is below active and reserved assignments",
        ),
        { status: 409 },
      );
    await Audit.create({
      actor: (req as Authed).user!.id,
      action: "COACH_UPDATED",
      target: req.params.id,
      meta: update,
    });
    res.json({ profile });
  }),
);
app.get(
  "/api/v1/admin/overview",
  ...roles("ADMIN"),
  asyncRoute(async (_q, res) => {
    const [users, plans, subscriptions, pending] = await Promise.all([
      User.countDocuments(),
      Plan.countDocuments(),
      Subscription.countDocuments(),
      CoachRequest.countDocuments({ status: "PENDING" }),
    ]);
    res.json({ users, plans, subscriptions, pending });
  }),
);
app.get(
  "/api/v1/admin/subscriptions",
  ...roles("ADMIN"),
  asyncRoute(async (_req, res) => {
    await releaseExpiredSubscriptions();
    res.json({
      subscriptions: await Subscription.find()
        .populate("player coach", "name email")
        .sort({ createdAt: -1 })
        .limit(200),
      payments: await Payment.find().sort({ createdAt: -1 }).limit(200),
    });
  }),
);
app.get(
  "/api/v1/admin/audit",
  ...roles("ADMIN"),
  asyncRoute(async (_req, res) =>
    res.json({
      logs: await Audit.find()
        .populate("actor", "name email")
        .sort({ createdAt: -1 })
        .limit(200),
    }),
  ),
);
app.get(
  "/api/v1/admin/coach-requests",
  ...roles("ADMIN"),
  asyncRoute(async (_req, res) =>
    res.json({
      requests: await CoachRequest.find()
        .populate({
          path: "subscription",
          populate: {
            path: "player",
            select: "name email",
            populate: { path: "playerProfile" },
          },
        })
        .populate("coach", "name email")
        .sort({ createdAt: -1 })
        .limit(200),
    }),
  ),
);
app.get(
  "/api/v1/admin/assignable-subscriptions",
  ...roles("ADMIN"),
  asyncRoute(async (_req, res) => {
    await releaseExpiredCoachRequests();
    const [subscriptions, coaches] = await Promise.all([
      Subscription.find({
        status: "AWAITING_COACH",
        paymentState: "VERIFIED",
        activeSlot: true,
        coach: { $exists: false },
      })
        .populate("player", "name email")
        .populate("plan", "name")
        .sort({ createdAt: 1 }),
      Coach.find({
        approved: true,
        available: true,
        $expr: {
          $lt: [
            { $add: [{ $ifNull: ["$activeCount", 0] }, { $ifNull: ["$reservedCount", 0] }] },
            { $ifNull: ["$capacity", 8] },
          ],
        },
      })
        .populate("user", "name")
        .sort({ createdAt: -1 }),
    ]);
    res.json({
      subscriptions,
      coaches: coaches.map((coach: any) => ({
        id: String(coach._id),
        userId: String(coach.user?._id),
        name: coach.user?.name || "Coach",
        activeCount: coach.activeCount || 0,
        reservedCount: coach.reservedCount || 0,
        capacity: coach.capacity || 8,
      })),
    });
  }),
);
app.post(
  "/api/v1/admin/subscriptions/:id/assign-coach",
  ...roles("ADMIN"),
  asyncRoute(async (req: Authed, res) => {
    const { coachId } = z.object({
      coachId: z.string().regex(/^[a-f\d]{24}$/i),
    }).parse(req.body);
    await releaseExpiredCoachRequests();
    const session = await mongoose.startSession();
    let assigned: any;
    try {
      await session.withTransaction(async () => {
        const sub = await Subscription.findOne({
          _id: req.params.id,
          status: "AWAITING_COACH",
          paymentState: "VERIFIED",
          activeSlot: true,
          coach: { $exists: false },
        }).session(session);
        if (!sub)
          throw Object.assign(new Error("This paid subscription is no longer waiting for a coach."), {
            status: 409,
          });
        const selectedCoach = await Coach.findOne({
          _id: coachId,
          approved: true,
          available: true,
        }).session(session);
        if (!selectedCoach)
          throw Object.assign(new Error("Coach is not approved or available."), {
            status: 409,
          });
        const pending = await CoachRequest.find({
          subscription: sub._id,
          status: "PENDING",
        }).session(session);
        const selectedRequest = pending.find(
          (request) => String(request.coach) === String(selectedCoach.user),
        );
        if (!selectedRequest) {
          const reserved = await reserveCoachCapacity(coachId, session);
          if (!reserved)
            throw Object.assign(new Error("Coach has reached capacity or is no longer available."), {
              status: 409,
            });
        }
        for (const request of pending) {
          const updated = await CoachRequest.findOneAndUpdate(
            { _id: request._id, status: "PENDING" },
            {
              $set: {
                status: String(request._id) === String(selectedRequest?._id) ? "ACCEPTED" : "WITHDRAWN",
                rejectionReason: String(request._id) === String(selectedRequest?._id)
                  ? undefined
                  : "Reassigned by an administrator.",
              },
            },
            { new: true, session },
          );
          if (!updated) continue;
          if (String(request._id) !== String(selectedRequest?._id)) {
            await Coach.updateOne(
              { user: request.coach, reservedCount: { $gt: 0 } },
              { $inc: { reservedCount: -1 } },
              { session },
            );
          }
        }
        const duration = sub.planSnapshot?.durationDays;
        if (!duration)
          throw new Error("Subscription plan duration is missing");
        const now = new Date();
        const subscription = await Subscription.findOneAndUpdate(
          {
            _id: sub._id,
            status: "AWAITING_COACH",
            paymentState: "VERIFIED",
            coach: { $exists: false },
          },
          {
            $set: {
              coach: selectedCoach.user,
              status: "ACTIVE",
              coachRequestPending: false,
              startedAt: now,
              expiresAt: new Date(now.getTime() + duration * 864e5),
            },
          },
          { new: true, session },
        );
        if (!subscription)
          throw Object.assign(new Error("Subscription assignment changed. Refresh and retry."), {
            status: 409,
          });
        const counters = await Coach.updateOne(
          {
            _id: selectedCoach._id,
            reservedCount: { $gt: 0 },
          },
          { $inc: { reservedCount: -1, activeCount: 1 } },
          { session },
        );
        if (!counters.modifiedCount)
          throw Object.assign(new Error("Coach capacity reservation could not be completed."), {
            status: 409,
          });
        if (!selectedRequest) {
          await CoachRequest.create(
            [{
              subscription: sub._id,
              coach: selectedCoach.user,
              status: "ACCEPTED",
              notes: "Assigned directly by an administrator.",
            }],
            { session },
          );
        }
        await Audit.create(
          [{
            actor: req.user!.id,
            action: "COACH_ASSIGNED_BY_ADMIN",
            target: String(sub._id),
            meta: { coachId: String(selectedCoach.user) },
          }],
          { session },
        );
        assigned = {
          subscription,
          player: sub.player,
          coach: selectedCoach.user,
        };
      });
    } finally {
      await session.endSession();
    }
    await Promise.all([
      notice(
        assigned.player,
        "Coach assigned",
        "An administrator assigned a coach to your paid subscription. Your coaching period is now active.",
        "COACH_REQUEST",
      ),
      notice(
        assigned.coach,
        "New player assigned",
        "An administrator assigned a player to you. Review the player's videos and coaching plan.",
        "COACH_REQUEST",
      ),
      sendPlayerNotificationEmail(
        String(assigned.player),
        "Your CricketVault coach has been assigned",
        "An administrator assigned a coach to your paid subscription. Your coaching period is now active.",
      ),
    ]);
    res.json({ subscription: assigned.subscription });
  }),
);
app.get(
  "/api/v1/resources",
  asyncRoute(async (_req, res) =>
    res.json({
      resources: await Resource.find({ published: true }).sort({
        createdAt: -1,
      }),
    }),
  ),
);
app.get(
  "/api/v1/resources/me",
  ...roles("PLAYER", "COACH"),
  asyncRoute(async (req: Authed, res) => {
    const purchases = await ResourcePurchase.find({
      user: req.user!.id,
      status: "VERIFIED",
    }).select("resource");
    res.json({ resourceIds: purchases.map((purchase) => String(purchase.resource)) });
  }),
);
app.post(
  "/api/v1/resources/:id/purchase",
  ...roles("PLAYER", "COACH"),
  asyncRoute(async (req: Authed, res) => {
    const resource = await Resource.findOne({
      _id: req.params.id,
      published: true,
    });
    if (!resource)
      throw Object.assign(new Error("Resource not found"), { status: 404 });
    const filter = { user: req.user!.id, resource: resource._id };
    let purchase = await ResourcePurchase.findOne(filter);
    if (purchase?.status === "VERIFIED")
      return res.json({ purchased: true, resourceId: resource.id });
    if (resource.pricePaise === 0) {
      purchase = await ResourcePurchase.findOneAndUpdate(
        filter,
        { $set: { status: "VERIFIED", amountPaise: 0 } },
        { new: true, upsert: true },
      );
      return res.status(201).json({ purchased: true, resourceId: resource.id });
    }
    if (purchase?.status === "FAILED") {
      await ResourcePurchase.updateOne(
        filter,
        {
          $set: { status: "PENDING", amountPaise: resource.pricePaise },
          $unset: { orderId: 1, paymentId: 1 },
        },
      );
      purchase = await ResourcePurchase.findOne(filter);
    }
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
      throw Object.assign(
        new Error("Razorpay credentials are required for paid resources"),
        { status: 503 },
      );
    if (!purchase) {
      purchase = await ResourcePurchase.create({
        ...filter,
        amountPaise: resource.pricePaise,
        status: "PENDING",
      });
    }
    if (!purchase.orderId) {
      const order = await createRazorpayOrder(
        resource.pricePaise,
        `resource-${resource.id}`,
        resource.id,
      );
      purchase.orderId = order.id;
      purchase.amountPaise = resource.pricePaise;
      await purchase.save();
    }
    res.status(201).json({
      purchased: false,
      purchaseId: purchase.id,
      checkout: {
        enabled: true,
        keyId: process.env.RAZORPAY_KEY_ID,
        orderId: purchase.orderId,
        amount: purchase.amountPaise,
        currency: "INR",
      },
    });
  }),
);
app.post(
  "/api/v1/resources/:id/purchase/verify",
  ...roles("PLAYER", "COACH"),
  asyncRoute(async (req: Authed, res) => {
    const data = z
      .object({
        purchaseId: z.string().regex(/^[a-f\d]{24}$/i),
        razorpay_payment_id: z.string().min(1),
        razorpay_order_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
      })
      .parse(req.body);
    const purchase = await ResourcePurchase.findOne({
      _id: data.purchaseId,
      user: req.user!.id,
      resource: req.params.id,
      status: "PENDING",
    });
    if (!purchase || !purchase.orderId || purchase.amountPaise == null)
      throw Object.assign(new Error("Pending resource purchase not found"), {
        status: 404,
      });
    if (data.razorpay_order_id !== purchase.orderId)
      throw Object.assign(new Error("Payment order does not match"), {
        status: 400,
      });
    await reconcileResourcePayment(
      data.razorpay_payment_id,
      data.razorpay_order_id,
      data.razorpay_signature,
      purchase.amountPaise,
    );
    purchase.paymentId = data.razorpay_payment_id;
    purchase.status = "VERIFIED";
    await purchase.save();
    res.json({ purchased: true, resourceId: req.params.id });
  }),
);
app.post(
  "/api/v1/admin/resources",
  ...roles("ADMIN"),
  asyncRoute(async (req, res) => {
    const data = z
      .object({
        title: z.string().min(2),
        category: z.string().min(1),
        pricePaise: z.number().int().min(0),
        level: z.string().min(1),
        description: z.string().min(1),
        coverImage: z.string().url().or(z.literal("")),
        author: z.string().min(1),
        whatInside: z.array(z.string()),
      })
      .parse(req.body);
    const resource = await Resource.create({
      ...data,
      published: true,
      rating: 0,
      reviewsCount: 0,
    });
    res.status(201).json({ resource });
  }),
);
app.delete(
  "/api/v1/admin/resources/:id",
  ...roles("ADMIN"),
  asyncRoute(async (req, res) => {
    const resource = await Resource.findByIdAndDelete(req.params.id);
    if (!resource)
      throw Object.assign(new Error("Resource not found"), { status: 404 });
    await ResourcePurchase.deleteMany({ resource: resource._id });
    res.status(204).end();
  }),
);
app.post(
  "/api/v1/subscriptions",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const { planId, couponCode } = z
      .object({
        planId: z.string().regex(/^[a-f\d]{24}$/i),
        couponCode: z.string().trim().min(1).max(30).optional(),
      })
      .parse(req.body);
    const purchaser = await User.findById(req.user!.id).select(
      "phoneVerified emailVerified signupVerificationMethod subscriptionEmailVerifiedAt referralReviewCredits",
    );
    if (!purchaser || !hasVerifiedPlayerSignup(purchaser))
      throw Object.assign(new Error("Verify your signup email before purchasing a plan."), {
        status: 403,
      });
    if (!purchaser.subscriptionEmailVerifiedAt)
      throw Object.assign(new Error("Verify your email with the code before purchasing a subscription."), {
        status: 403,
        code: "PURCHASE_EMAIL_NOT_VERIFIED",
      });
    const plan = await Plan.findOne({ _id: planId, published: true });
    if (!plan)
      throw Object.assign(new Error("Plan unavailable"), { status: 404 });
    const pricing = couponCode
      ? await pricePlanWithCoupon(plan, couponCode)
      : { coupon: null, discountPaise: 0, finalAmountPaise: plan.pricePaise };
    const referralReviewsUsed = Math.max(0, Number(purchaser.referralReviewCredits || 0));
    await releaseExpiredSubscriptions();
    const now = new Date();
    const legacy = await Subscription.find({
      player: req.user!.id,
      activeSlot: { $ne: true },
    }).select("status expiresAt");
    if (
      legacy.some((item) =>
        hasBlockingSubscription(item.status, item.expiresAt, now),
      ) ||
      (await Subscription.exists({ player: req.user!.id, activeSlot: true }))
    )
      throw Object.assign(
        new Error("An active or pending subscription already exists"),
        { status: 409 },
      );
    let sub;
    try {
      sub = await Subscription.create({
        player: req.user!.id,
        activeSlot: true,
        plan: plan._id,
        planSnapshot: {
          name: plan.name,
          pricePaise: pricing.finalAmountPaise,
          originalPricePaise: plan.pricePaise,
          discountPaise: pricing.discountPaise,
          couponCode: pricing.coupon?.code,
          durationDays: plan.durationDays,
          maxVideos: plan.maxVideos,
          includedReviews: plan.includedReviews + referralReviewsUsed,
          referralReviewsUsed,
          features: plan.features,
        },
      });
    } catch (error: any) {
      if (error.code === 11000)
        throw Object.assign(
          new Error("An active or pending subscription already exists"),
          { status: 409 },
        );
      throw error;
    }
    try {
      let payment;
      if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
        const order = await createRazorpayOrder(
          pricing.finalAmountPaise,
          sub.id,
          sub.id,
        );
        payment = await Payment.create({
          subscription: sub._id,
          amountPaise: pricing.finalAmountPaise,
          orderId: order.id,
        });
        res
          .status(201)
          .json({
            subscription: sub,
            payment,
            checkout: {
              enabled: true,
              keyId: process.env.RAZORPAY_KEY_ID,
              orderId: order.id,
              amount: order.amount,
              currency: order.currency,
            },
          });
        return;
      }
      if (process.env.NODE_ENV === "production")
        throw Object.assign(
          new Error("Razorpay credentials are required in production"),
          { status: 503 },
        );
      payment = await Payment.create({
        subscription: sub._id,
        amountPaise: pricing.finalAmountPaise,
      });
      res
        .status(201)
        .json({
          subscription: sub,
          payment,
          checkout: { enabled: false, keyId: null },
        });
    } catch (error) {
      await Subscription.deleteOne({ _id: sub._id });
      throw error;
    }
  }),
);
app.post(
  "/api/v1/subscriptions/:id/payment-order",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const purchaser = await User.findById(req.user!.id).select(
      "phoneVerified emailVerified signupVerificationMethod subscriptionEmailVerifiedAt",
    );
    if (!purchaser || !hasVerifiedPlayerSignup(purchaser))
      throw Object.assign(new Error("Verify your signup email before purchasing a plan."), {
        status: 403,
      });
    if (!purchaser.subscriptionEmailVerifiedAt)
      throw Object.assign(new Error("Verify your email with the code before purchasing a subscription."), {
        status: 403,
        code: "PURCHASE_EMAIL_NOT_VERIFIED",
      });
    const sub = await Subscription.findOneAndUpdate(
      {
        _id: req.params.id,
        player: req.user!.id,
        status: "PENDING_PAYMENT",
        paymentOrderPending: { $ne: true },
      },
      { $set: { paymentOrderPending: true } },
      { new: true },
    );
    if (!sub)
      throw Object.assign(
        new Error(
          "Pending subscription not found or payment order is already being created",
        ),
        { status: 409 },
      );
    try {
      const snapshot = sub.planSnapshot;
      if (!snapshot) throw new Error("Subscription plan snapshot is missing");
      if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET)
        throw Object.assign(
          new Error("Razorpay credentials are not configured"),
          { status: 503 },
        );
      const existing = await Payment.findOne({
        subscription: sub._id,
        state: { $in: ["CREATED", "PENDING"] },
        orderId: { $exists: true },
      });
      if (existing) {
        await Subscription.updateOne(
          { _id: sub._id },
          { $set: { paymentOrderPending: false } },
        );
        res.json({
          payment: existing,
          checkout: {
            enabled: true,
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: existing.orderId,
            amount: existing.amountPaise,
            currency: existing.currency,
          },
        });
        return;
      }
      const order = await createRazorpayOrder(
        snapshot.pricePaise!,
        sub.id,
        sub.id,
      );
      const payment = await Payment.create({
        subscription: sub._id,
        amountPaise: snapshot.pricePaise,
        orderId: order.id,
      });
      await Subscription.updateOne(
        { _id: sub._id },
        { $set: { paymentOrderPending: false } },
      );
      res
        .status(201)
        .json({
          payment,
          checkout: {
            enabled: true,
            keyId: process.env.RAZORPAY_KEY_ID,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
          },
        });
    } catch (error) {
      await Subscription.updateOne(
        { _id: sub._id },
        { $set: { paymentOrderPending: false } },
      );
      throw error;
    }
  }),
);
app.post(
  "/api/v1/subscriptions/:id/cancel-pending-payment",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    let subscription = await Subscription.findOne({
      _id: req.params.id,
      player: req.user!.id,
    });
    if (!subscription)
      throw Object.assign(new Error("Subscription not found"), { status: 404 });
    if (subscription.status === "CANCELLED")
      return res.json({ cancelled: true, subscription });
    if (subscription.status !== "PENDING_PAYMENT")
      throw Object.assign(
        new Error("Only a pending payment can be cancelled"),
        { status: 409 },
      );
    if (subscription.paymentOrderPending)
      throw Object.assign(
        new Error("Wait for the payment order to finish before cancelling"),
        { status: 409 },
      );

    let providerStatus: "CAPTURED" | "FAILED" | "IN_PROGRESS" | "UNPAID" = "UNPAID";
    let payment = await Payment.findOne({ subscription: subscription._id });
    if (payment?.orderId && process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      providerStatus = await reconcileRazorpayStatus(payment.orderId);
      subscription = (await Subscription.findById(subscription._id))!;
      payment = await Payment.findOne({ subscription: subscription._id });
    } else if (process.env.NODE_ENV === "production") {
      throw Object.assign(
        new Error("Payment status cannot be verified; the pending plan was not cancelled"),
        { status: 503 },
      );
    }

    if (providerStatus === "CAPTURED" || payment?.state === "VERIFIED")
      throw Object.assign(
        new Error("Payment was captured. Refresh your subscription instead of cancelling it."),
        { status: 409 },
      );
    if (providerStatus === "IN_PROGRESS")
      throw Object.assign(
        new Error("A payment is still processing. Wait for its result before cancelling."),
        { status: 409 },
      );
    if (subscription.status === "CANCELLED")
      return res.json({ cancelled: true, subscription });

    const cancelled = await Subscription.findOneAndUpdate(
      {
        _id: subscription._id,
        player: req.user!.id,
        status: "PENDING_PAYMENT",
        paymentOrderPending: { $ne: true },
      },
      {
        $set: {
          status: "CANCELLED",
          activeSlot: false,
          paymentState: "FAILED",
        },
      },
      { new: true },
    );
    if (!cancelled)
      throw Object.assign(
        new Error("Payment state changed. Refresh your subscription and try again."),
        { status: 409 },
      );
    if (payment && payment.state !== "FAILED") {
      await Payment.updateOne(
        { _id: payment._id, state: { $in: ["CREATED", "PENDING"] } },
        { $set: { state: "FAILED" }, $addToSet: { events: "CANCELLED_BY_PLAYER" } },
      );
    }
    await Audit.create({
      actor: req.user!.id,
      action: "PENDING_SUBSCRIPTION_CANCELLED",
      target: cancelled.id,
      meta: { planName: cancelled.planSnapshot?.name },
    });
    res.json({ cancelled: true, subscription: cancelled });
  }),
);
app.get(
  "/api/v1/subscriptions/me",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    await releaseExpiredSubscriptions();
    res.json({
      subscriptions: await Subscription.find({ player: req.user!.id })
        .populate("plan coach", "name email")
        .sort({ createdAt: -1 }),
    });
  }),
);
app.get(
  "/api/v1/subscriptions/:id/refund-preview",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const subscriptionId = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
    const {
      paymentRecordId: _paymentRecordId,
      originalStatus: _originalStatus,
      originalPaymentState: _originalPaymentState,
      wasActiveSlot: _wasActiveSlot,
      hadCoachRequestPending: _hadCoachRequestPending,
      hadPaymentOrderPending: _hadPaymentOrderPending,
      coachId: _coachId,
      ...refund
    } = await buildPlayerRefundPreview(req.user!.id, subscriptionId);
    res.json({ refund });
  }),
);
app.post(
  "/api/v1/subscriptions/:id/refund",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    z.object({ confirmed: z.literal(true) }).parse(req.body);
    const subscriptionId = z.string().regex(/^[a-f\d]{24}$/i).parse(req.params.id);
    let preview: Awaited<ReturnType<typeof buildPlayerRefundPreview>> | undefined;
    let withdrawnRequests: Array<{
      id: string;
      coachId: string;
      reservedCountReleased: boolean;
    }> = [];
    let activeCountReleased = false;

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        withdrawnRequests = [];
        activeCountReleased = false;
        preview = await buildPlayerRefundPreview(
          req.user!.id,
          subscriptionId,
          session,
        );
        if (!preview.canRequest || !preview.paymentRecordId)
          throw Object.assign(
            new Error(preview.message || "This subscription is not eligible for a refund."),
            { status: 409 },
          );
        const reserved = await Subscription.findOneAndUpdate(
          {
            _id: subscriptionId,
            player: req.user!.id,
            status: preview.originalStatus,
            paymentState: "VERIFIED",
          },
          {
            $set: {
              status: "REFUND_PENDING",
              paymentState: "REFUND_PENDING",
              activeSlot: false,
              coachRequestPending: false,
              paymentOrderPending: false,
            },
          },
          { new: true, session },
        );
        if (!reserved)
          throw Object.assign(
            new Error("Subscription changed; refresh the refund preview and retry."),
            { status: 409 },
          );

        if (preview.originalStatus === "ACTIVE" && preview.coachId) {
          const coachUpdate = await Coach.updateOne(
            { user: preview.coachId, activeCount: { $gt: 0 } },
            { $inc: { activeCount: -1 } },
            { session },
          );
          activeCountReleased = Boolean(coachUpdate.modifiedCount);
        }

        const pendingRequests = await CoachRequest.find({
          subscription: subscriptionId,
          status: "PENDING",
        }).session(session);
        for (const request of pendingRequests) {
          const withdrawn = await CoachRequest.findOneAndUpdate(
            { _id: request._id, status: "PENDING" },
            {
              $set: {
                status: "WITHDRAWN",
                rejectionReason: "Player requested a refund.",
              },
            },
            { new: true, session },
          );
          if (!withdrawn) continue;
          const coachUpdate = await Coach.updateOne(
            { user: request.coach, reservedCount: { $gt: 0 } },
            { $inc: { reservedCount: -1 } },
            { session },
          );
          withdrawnRequests.push({
            id: String(request._id),
            coachId: String(request.coach),
            reservedCountReleased: Boolean(coachUpdate.modifiedCount),
          });
        }
      });
    } finally {
      await session.endSession();
    }

    if (!preview?.paymentRecordId)
      throw new Error("Refund reservation completed without a payment record");

    let refundResult;
    try {
      refundResult = await requestRazorpayRefund(
        preview.paymentRecordId,
        preview.refundPaise,
        {
          subscriptionId,
          playerUserId: req.user!.id,
        },
      );
    } catch (error) {
      const payment = await Payment.findById(preview.paymentRecordId);
      const refundUnresolved =
        payment?.refundStatus === "CREATING" ||
        payment?.state === "REFUND_PENDING" ||
        payment?.state === "REFUNDED";
      if (!refundUnresolved) {
        const rollbackSession = await mongoose.startSession();
        try {
          await rollbackSession.withTransaction(async () => {
            const restored = await Subscription.updateOne(
              {
                _id: subscriptionId,
                player: req.user!.id,
                status: "REFUND_PENDING",
                paymentState: "REFUND_PENDING",
              },
              {
                $set: {
                  status: preview!.originalStatus,
                  paymentState: preview!.originalPaymentState,
                  activeSlot: preview!.wasActiveSlot,
                  coachRequestPending: false,
                  paymentOrderPending: preview!.hadPaymentOrderPending,
                },
              },
              { session: rollbackSession },
            );
            if (!restored.modifiedCount) return;
            if (activeCountReleased && preview!.coachId) {
              await Coach.updateOne(
                { user: preview!.coachId },
                { $inc: { activeCount: 1 } },
                { session: rollbackSession },
              );
            }
            let restoredRequestCount = 0;
            for (const request of withdrawnRequests) {
              const original = await CoachRequest.findById(request.id)
                .session(rollbackSession);
              if (!original || (original.expiresAt && original.expiresAt <= new Date()))
                continue;
              const restoredRequest = await CoachRequest.updateOne(
                {
                  _id: request.id,
                  status: "WITHDRAWN",
                  rejectionReason: "Player requested a refund.",
                },
                { $set: { status: "PENDING" }, $unset: { rejectionReason: 1 } },
                { session: rollbackSession },
              );
              if (!restoredRequest.modifiedCount) continue;
              restoredRequestCount += 1;
              if (request.reservedCountReleased) {
                await Coach.updateOne(
                  { user: request.coachId },
                  { $inc: { reservedCount: 1 } },
                  { session: rollbackSession },
                );
              }
            }
            await Subscription.updateOne(
              { _id: subscriptionId },
              {
                $set: {
                  coachRequestPending: restoredRequestCount > 0,
                },
              },
              { session: rollbackSession },
            );
          });
        } finally {
          await rollbackSession.endSession();
        }
      }
      throw error;
    }

    const refundState =
      refundResult.status === "processed" ? "REFUNDED" : "REFUND_PENDING";
    await Subscription.updateOne(
      { _id: subscriptionId, player: req.user!.id, status: "REFUND_PENDING" },
      { $set: { status: refundState, paymentState: refundState } },
    );
    const updatedPreview = await buildPlayerRefundPreview(
      req.user!.id,
      subscriptionId,
    );
    const {
      paymentRecordId: _paymentRecordId,
      originalStatus: _originalStatus,
      originalPaymentState: _originalPaymentState,
      wasActiveSlot: _wasActiveSlot,
      hadCoachRequestPending: _hadCoachRequestPending,
      hadPaymentOrderPending: _hadPaymentOrderPending,
      coachId: _coachId,
      ...refund
    } = updatedPreview;
    await notice(
      req.user!.id,
      "Refund request submitted",
      "Your Razorpay refund request is being processed.",
      "PAYMENT",
    );
    res.json({ refund });
  }),
);
app.get(
  "/api/v1/payments/me",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const subscriptions = await Subscription.find({
      player: req.user!.id,
    }).distinct("_id");
    res.json({
      payments: await Payment.find({
        subscription: { $in: subscriptions },
      }).sort({ createdAt: -1 }),
    });
  }),
);
app.post(
  "/api/v1/payments/:id/verify",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const purchaser = await User.findById(req.user!.id).select(
      "subscriptionEmailVerifiedAt",
    );
    if (!purchaser?.subscriptionEmailVerifiedAt)
      throw Object.assign(new Error("Verify your email with the code before completing a subscription purchase."), {
        status: 403,
        code: "PURCHASE_EMAIL_NOT_VERIFIED",
      });
    const payment = await Payment.findById(req.params.id).populate(
      "subscription",
    );
    if (!payment)
      throw Object.assign(new Error("Payment not found"), { status: 404 });
    const sub: any = payment.subscription;
    if (String(sub.player) !== req.user!.id)
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    const input = z
      .object({
        razorpay_payment_id: z.string().min(1),
        razorpay_order_id: z.string().min(1),
        razorpay_signature: z.string().min(1),
      })
      .parse(req.body);
    if (input.razorpay_order_id !== payment.orderId)
      throw Object.assign(new Error("Payment order does not match"), {
        status: 400,
      });
    const result = await reconcilePayment(
      input.razorpay_payment_id,
      input.razorpay_order_id,
      input.razorpay_signature,
    );
    if (result.changed)
      await notice(
        req.user!.id,
        "Payment verified",
        "Choose your coach to start your coaching period.",
        "PAYMENT",
      );
    res.json({
      subscription: await Subscription.findById(sub._id),
      payment: result.payment,
    });
  }),
);
app.get(
  "/api/v1/payments/:id/status",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const payment = await Payment.findById(req.params.id).populate(
      "subscription",
    );
    if (!payment)
      throw Object.assign(new Error("Payment not found"), { status: 404 });
    const sub: any = payment.subscription;
    if (String(sub.player) !== req.user!.id)
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    res.json({ payment, subscription: sub });
  }),
);
app.post(
  "/api/v1/payments/:id/reconcile",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const payment = await Payment.findById(req.params.id).populate(
      "subscription",
    );
    if (!payment)
      throw Object.assign(new Error("Payment not found"), { status: 404 });
    const sub: any = payment.subscription;
    if (String(sub.player) !== req.user!.id)
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    if (!payment.orderId)
      throw Object.assign(new Error("This payment has no Razorpay order"), {
        status: 409,
      });
    await reconcileRazorpayStatus(payment.orderId);
    res.json({
      payment: await Payment.findById(payment._id),
      subscription: await Subscription.findById(sub._id),
    });
  }),
);
app.post(
  "/api/v1/subscriptions/:id/dev-confirm-payment",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    if (process.env.NODE_ENV === "production")
      throw Object.assign(new Error("Not available in production"), {
        status: 404,
      });
    const purchaser = await User.findById(req.user!.id).select(
      "phoneVerified emailVerified signupVerificationMethod subscriptionEmailVerifiedAt",
    );
    if (!purchaser || !hasVerifiedPlayerSignup(purchaser))
      throw Object.assign(new Error("Verify your signup email before purchasing a plan."), {
        status: 403,
      });
    if (!purchaser.subscriptionEmailVerifiedAt)
      throw Object.assign(new Error("Verify your email with the code before purchasing a subscription."), {
        status: 403,
        code: "PURCHASE_EMAIL_NOT_VERIFIED",
      });
    const sub = await Subscription.findOne({
      _id: req.params.id,
      player: req.user!.id,
      status: "PENDING_PAYMENT",
    });
    if (!sub)
      throw Object.assign(new Error("Pending subscription not found"), {
        status: 404,
      });
    const payment = await Payment.findOne({ subscription: sub._id });
    if (!payment)
      throw Object.assign(new Error("Payment not found"), { status: 404 });
    if (payment.state === "VERIFIED") return res.json({ subscription: sub });
    payment.state = "VERIFIED";
    await payment.save();
    sub.status = "AWAITING_COACH";
    sub.paymentState = "VERIFIED";
    await sub.save();
    await applyReferralReviews(String(sub._id));
    await awardReferralForFirstPurchase(String(sub.player));
    await notice(
      req.user!.id,
      "Demo payment confirmed",
      "Development entitlement is ready for coach selection.",
      "PAYMENT",
    );
    await sendPlayerNotificationEmail(
      req.user!.id,
      "CricketVault payment successful",
      "Your development payment was confirmed. Choose an eligible coach to begin your coaching period.",
    );
    res.json({ subscription: sub });
  }),
);
app.post(
  "/api/v1/subscriptions/:id/coach-requests",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const purchaser = await User.findById(req.user!.id).select(
      "subscriptionEmailVerifiedAt",
    );
    if (!purchaser?.subscriptionEmailVerifiedAt)
      throw Object.assign(new Error("Verify your email with the code before continuing with a subscription."), {
        status: 403,
        code: "PURCHASE_EMAIL_NOT_VERIFIED",
      });
    const { coachId, notes } = z
      .object({
        coachId: z.string().regex(/^[a-f\d]{24}$/i),
        notes: z.string().max(1000).optional(),
      })
      .parse(req.body);
    const session = await mongoose.startSession();
    let result: any;
    try {
      await session.withTransaction(async () => {
        const sub = await Subscription.findOne({
          _id: req.params.id,
          player: req.user!.id,
        }).session(session);
        if (!sub || !canRequestCoach(sub.status, sub.paymentState))
          throw Object.assign(
            new Error("A verified subscription awaiting a coach is required"),
            { status: 409 },
          );
        const claimed = await Subscription.findOneAndUpdate(
          {
            _id: sub._id,
            status: "AWAITING_COACH",
            paymentState: "VERIFIED",
            coachRequestPending: { $ne: true },
          },
          { $set: { coachRequestPending: true } },
          { new: true, session },
        );
        if (!claimed)
          throw Object.assign(new Error("A coach request is already pending"), {
            status: 409,
          });
        const coach = await reserveCoachCapacity(coachId, session);
        if (!coach)
          throw Object.assign(new Error("Coach is no longer available"), {
            status: 409,
          });
        const [request] = await CoachRequest.create(
          [
            {
              subscription: sub._id,
              coach: coach.user,
              notes,
              status: "PENDING",
              expiresAt: new Date(Date.now() + 7 * 864e5),
            },
          ],
          { session },
        );
        result = { request, coachUser: coach.user };
      });
    } finally {
      await session.endSession();
    }
    await notice(
      result.coachUser,
      "New coaching request",
      "A player is waiting for your response.",
      "COACH_REQUEST",
    );
    res.status(201).json({ request: result.request });
  }),
);
app.get(
  "/api/v1/coach-requests/incoming",
  ...roles("COACH"),
  asyncRoute(async (req: Authed, res) => {
    await releaseExpiredCoachRequests(req.user!.id);
    res.json({
      requests: await CoachRequest.find({
        coach: req.user!.id,
      })
        .populate({
          path: "subscription",
          populate: {
            path: "player",
            select: "name email",
            populate: { path: "playerProfile" },
          },
        })
        .populate("coach", "name email")
        .sort({ createdAt: -1 }),
    });
  }),
);
app.get(
  "/api/v1/coach-requests/me",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    res.json({
      requests: await CoachRequest.find({
        subscription: {
          $in: await Subscription.find({ player: req.user!.id }).distinct("_id"),
        },
      })
        .populate({
          path: "subscription",
          populate: {
            path: "player",
            select: "name email",
            populate: { path: "playerProfile" },
          },
        })
        .populate("coach", "name email")
        .sort({ createdAt: -1 }),
    });
  }),
);
app.post(
  "/api/v1/coach-requests/:id/respond",
  ...roles("COACH", "ADMIN"),
  asyncRoute(async (req: Authed, res) => {
    const { accept, reason } = z
      .object({ accept: z.boolean(), reason: z.string().max(1000).optional() })
      .parse(req.body);
    const session = await mongoose.startSession();
    let outcome: any;
    try {
      await session.withTransaction(async () => {
        const requestFilter: Record<string, unknown> = {
          _id: req.params.id,
          status: "PENDING",
        };
        if (req.user!.role === "COACH") requestFilter.coach = req.user!.id;
        const request = await CoachRequest.findOneAndUpdate(
          requestFilter,
          {
            $set: {
              status: accept ? "ACCEPTED" : "REJECTED",
              rejectionReason: accept ? undefined : reason,
            },
          },
          { new: true, session },
        );
        if (!request)
          throw Object.assign(
            new Error("Request unavailable or already handled"),
            { status: 409 },
          );
        const coach = await Coach.findOne({ user: request.coach }).session(session);
        if (!coach)
          throw Object.assign(new Error("Coach profile missing"), {
            status: 404,
          });
        const sub = await Subscription.findById(request.subscription).session(
          session,
        );
        if (!sub)
          throw Object.assign(new Error("Subscription not found"), {
            status: 404,
          });
        if (accept) {
          const duration = sub.planSnapshot?.durationDays;
          if (!duration)
            throw new Error("Subscription plan duration is missing");
          const assigned = await Subscription.findOneAndUpdate(
            {
              _id: sub._id,
              status: "AWAITING_COACH",
              coach: { $exists: false },
              paymentState: "VERIFIED",
            },
            {
              $set: {
                coach: request.coach,
                status: "ACTIVE",
                coachRequestPending: false,
                startedAt: new Date(),
                expiresAt: new Date(Date.now() + duration * 864e5),
              },
            },
            { new: true, session },
          );
          if (!assigned)
            throw Object.assign(
              new Error("Subscription is no longer eligible"),
              { status: 409 },
            );
          await Coach.updateOne(
            { _id: coach._id },
            { $inc: { reservedCount: -1, activeCount: 1 } },
            { session },
          );
          outcome = { subscription: assigned, player: sub.player };
        } else {
          await Subscription.updateOne(
            { _id: sub._id },
            { $set: { coachRequestPending: false } },
            { session },
          );
          await Coach.updateOne(
            { _id: coach._id },
            { $inc: { reservedCount: -1 } },
            { session },
          );
          outcome = { request, player: sub.player };
        }
      });
    } finally {
      await session.endSession();
    }
    await notice(
      outcome.player,
      accept ? "Coach request accepted" : "Coach request declined",
      accept
        ? "Your coaching subscription is now active."
        : "Please choose another available coach—no new payment is needed.",
      "COACH_REQUEST",
    );
    if (accept) {
      await sendPlayerNotificationEmail(
        String(outcome.player),
        "Your coach accepted your request",
        "Your coach accepted your assignment request. Your coaching subscription is now active.",
      );
    }
    res.json(
      accept
        ? { subscription: outcome.subscription }
        : { request: outcome.request },
    );
  }),
);
app.get(
  "/api/v1/coach/players",
  ...roles("COACH"),
  asyncRoute(async (req: Authed, res) => {
    await releaseExpiredSubscriptions();
    res.json({
      subscriptions: await Subscription.find({
        coach: req.user!.id,
        status: "ACTIVE",
      })
        .populate({
          path: "player",
          select: "name email",
          populate: { path: "playerProfile" },
        })
        .sort({ expiresAt: 1 }),
    });
  }),
);
app.post(
  "/api/v1/videos",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const { subscriptionId, title, category, notes, linkUrl } = z
      .object({
        subscriptionId: z.string().regex(/^[a-f\d]{24}$/i),
        title: z.string().min(1).max(120),
        category: z.enum([
          "Batting",
          "Bowling",
          "Fielding",
          "Wicketkeeping",
          "Fitness",
        ]),
        notes: z.string().max(2000).optional(),
        linkUrl: z.string().trim().min(1).max(2048),
      })
      .parse(req.body);
    const externalVideo = validateExternalVideoUrl(linkUrl);
    const session = await mongoose.startSession();
    let video;
    try {
      video = await session.withTransaction(async () => {
        const sub = await Subscription.findOne({
          _id: subscriptionId,
          player: req.user!.id,
          status: "ACTIVE",
          paymentState: "VERIFIED",
          expiresAt: { $gt: new Date() },
        }).session(session);
        if (!sub)
          throw Object.assign(
            new Error("An active subscription is required to submit a video link"),
            { status: 403 },
          );
        if (!sub.planSnapshot?.maxVideos)
          throw new Error("Subscription video allowance is unavailable");
        const count = await Video.countDocuments({
          subscription: sub._id,
        }).session(session);
        if (count >= sub.planSnapshot.maxVideos)
          throw Object.assign(new Error("Video allowance reached"), {
            status: 409,
          });
        const claimed = await Subscription.findOneAndUpdate(
          {
            _id: sub._id,
            status: "ACTIVE",
            paymentState: "VERIFIED",
            expiresAt: { $gt: new Date() },
          },
          { $set: { submittedVideoCount: count + 1 } },
          { new: true, session },
        );
        if (!claimed)
          throw Object.assign(
            new Error("Subscription changed; refresh and try again."),
            { status: 409 },
          );
        const [createdVideo] = await Video.create(
          [
            {
              subscription: sub._id,
              player: req.user!.id,
              sourceType: externalVideo.sourceType,
              sourceUrl: externalVideo.sourceUrl,
              title,
              category,
              notes,
            },
          ],
          { session },
        );
        return createdVideo;
      });
    } finally {
      await session.endSession();
    }
    if (!video) throw new Error("Video submission did not complete");
    await notice(
      req.user!.id,
      "Video received",
      "Your coach has been notified of a new submission.",
      "VIDEO",
    );
    const sub = await Subscription.findById(subscriptionId);
    if (sub?.coach)
      await notice(
        sub.coach,
        "New player video",
        "A new video is ready for review.",
        "VIDEO",
      );
    res.status(201).json({ video });
  }),
);
app.get(
  "/api/v1/admin/videos",
  ...roles("ADMIN"),
  asyncRoute(async (_req, res) => {
    res.json({
      videos: await Video.find()
        .populate("player", "name email")
        .sort({ createdAt: -1 })
        .limit(500),
    });
  }),
);
app.get(
  "/api/v1/videos",
  auth,
  asyncRoute(async (req: Authed, res) => {
    const query =
      req.user!.role === "PLAYER"
        ? { player: req.user!.id }
        : req.user!.role === "COACH"
          ? {
              subscription: {
                $in: await Subscription.find({ coach: req.user!.id }).distinct(
                  "_id",
                ),
              },
            }
          : {};
    res.json({ videos: await Video.find(query).sort({ createdAt: -1 }) });
  }),
);
app.get(
  "/api/v1/videos/:id/access",
  auth,
  asyncRoute(async (req: Authed, res) => {
    const video = await Video.findById(req.params.id);
    if (!video)
      throw Object.assign(new Error("Video not found"), { status: 404 });
    const sub = await Subscription.findById(video.subscription);
    if (
      !canAccessVideo(
        req.user!.role,
        req.user!.id,
        { player: String(video.player) },
        sub?.coach ? String(sub.coach) : undefined,
      )
    )
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    res.json({
      url: video.sourceUrl || "",
      sourceType: video.sourceType || "FILE",
    });
  }),
);
app.post(
  "/api/v1/videos/:id/reviews",
  ...roles("COACH"),
  asyncRoute(async (req: Authed, res) => {
    const video = await Video.findById(req.params.id);
    if (!video)
      throw Object.assign(new Error("Video not found"), { status: 404 });
    const sub = await Subscription.findOne({
      _id: video.subscription,
      coach: req.user!.id,
    });
    if (!sub || !active(sub))
      throw Object.assign(new Error("You cannot review this video"), {
        status: 403,
      });
    const body = z
      .object({
        category: z.string().min(1),
        strengths: z.string(),
        issues: z.string(),
        drills: z.string(),
        recommendations: z.string().min(1),
        targets: z.string(),
        followUp: z.string().datetime().optional(),
        timestamps: z.array(z.string()).default([]),
      })
      .parse(req.body);
    const reviewLimit = sub.planSnapshot?.includedReviews;
    if (!reviewLimit)
      throw Object.assign(new Error("Subscription review allowance is unavailable"), {
        status: 409,
      });
    const claimed = await Subscription.findOneAndUpdate(
      {
        _id: sub._id,
        coach: req.user!.id,
        status: "ACTIVE",
        expiresAt: { $gt: new Date() },
        $expr: {
          $lt: [{ $ifNull: ["$reviewCount", 0] }, reviewLimit],
        },
      },
      { $inc: { reviewCount: 1 } },
      { new: true },
    );
    if (!claimed)
      throw Object.assign(new Error("Review allowance is exhausted"), {
        status: 409,
      });
    let review;
    try {
      review = await Review.create({
        ...body,
        followUp: body.followUp ? new Date(body.followUp) : undefined,
        video: video._id,
        subscription: sub._id,
        coach: req.user!.id,
      });
    } catch (error) {
      await Subscription.updateOne(
        { _id: sub._id },
        { $inc: { reviewCount: -1 } },
      );
      throw error;
    }
    await notice(
      video.player,
      "New coaching feedback",
      "Your coach has completed a video review.",
      "REVIEW",
    );
    await sendPlayerNotificationEmail(
      String(video.player),
      "Your coach reviewed your video",
      "Your coach completed your video review. Sign in to CricketVault to view the feedback.",
    );
    res.status(201).json({ review });
  }),
);
app.get(
  "/api/v1/videos/:id/reviews",
  auth,
  asyncRoute(async (req: Authed, res) => {
    const video = await Video.findById(req.params.id);
    if (!video) throw Object.assign(new Error("Not found"), { status: 404 });
    const sub = await Subscription.findById(video.subscription);
    if (
      !canAccessVideo(
        req.user!.role,
        req.user!.id,
        { player: String(video.player) },
        sub?.coach ? String(sub.coach) : undefined,
      )
    )
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    res.json({
      reviews: await Review.find({ video: video._id }).sort({ createdAt: -1 }),
    });
  }),
);
app.get(
  "/api/v1/action-plans/:subscriptionId",
  auth,
  asyncRoute(async (req: Authed, res) => {
    const plan = await ActionPlan.findOne({
      subscription: req.params.subscriptionId,
    });
    if (!plan) return res.json({ plan: null });
    const sub = await Subscription.findById(plan.subscription);
    if (!sub)
      throw Object.assign(new Error("Subscription not found"), { status: 404 });
    if (req.user!.role === "PLAYER" && String(sub.player) !== req.user!.id)
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    if (req.user!.role === "COACH" && String(sub.coach) !== req.user!.id)
      throw Object.assign(new Error("Forbidden"), { status: 403 });
    res.json({
      plan,
      editable: isSubscriptionActive(sub.status, sub.expiresAt),
    });
  }),
);
app.put(
  "/api/v1/action-plans/:subscriptionId",
  ...roles("COACH"),
  asyncRoute(async (req: Authed, res) => {
    const sub = await Subscription.findOne({
      _id: req.params.subscriptionId,
      coach: req.user!.id,
    });
    if (!sub || !active(sub))
      throw Object.assign(new Error("An active assignment is required"), {
        status: 403,
      });
    const data = z
      .object({
        title: z.string().min(2),
        description: z.string(),
        objectives: z.array(z.string()),
        tasks: z.array(
          z.object({
            title: z.string(),
            instructions: z.string(),
            frequency: z.string(),
            dueDate: z.string().optional(),
          }),
        ),
        startDate: z.string().optional(),
        dueDate: z.string().optional(),
      })
      .parse(req.body);
    const plan = await ActionPlan.findOneAndUpdate(
      { subscription: sub._id },
      { ...data, coach: req.user!.id },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    await notice(
      sub.player,
      "Action plan published",
      "Your personalized training plan is ready.",
      "ACTION_PLAN",
    );
    await sendPlayerNotificationEmail(
      String(sub.player),
      "Your coach published an action plan",
      "Your personalized action plan is ready. Sign in to CricketVault to review the plan and its tasks.",
    );
    res.json({ plan });
  }),
);
app.patch(
  "/api/v1/action-plans/:subscriptionId/tasks/:taskId",
  ...roles("PLAYER"),
  asyncRoute(async (req: Authed, res) => {
    const sub = await Subscription.findOne({
      _id: req.params.subscriptionId,
      player: req.user!.id,
    });
    if (!sub || !active(sub))
      throw Object.assign(new Error("An active subscription is required"), {
        status: 403,
      });
    const data = z
      .object({
        completed: z.boolean(),
        progressNote: z.string().max(1000).optional(),
      })
      .parse(req.body);
    const plan = await ActionPlan.findOne({ subscription: sub._id });
    const task: any = plan?.tasks.id(String(req.params.taskId));
    if (!task)
      throw Object.assign(new Error("Task not found"), { status: 404 });
    task.completedAt = data.completed ? new Date() : undefined;
    task.progressNote = data.progressNote;
    await plan!.save();
    res.json({ plan });
  }),
);
app.get(
  "/api/v1/notifications",
  auth,
  asyncRoute(async (req: Authed, res) =>
    res.json({
      notifications: await Notification.find({ user: req.user!.id })
        .sort({ createdAt: -1 })
        .limit(50),
    }),
  ),
);
app.patch(
  "/api/v1/notifications/:id/read",
  auth,
  asyncRoute(async (req: Authed, res) => {
    await Notification.updateOne(
      { _id: req.params.id, user: req.user!.id },
      { $set: { readAt: new Date() } },
    );
    res.status(204).end();
  }),
);
app.use((_req, _res, next) =>
  next(Object.assign(new Error("Route not found"), { status: 404 })),
);
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError)
    return res
      .status(400)
      .json({ error: "Validation error", issues: err.flatten() });
  if (err.code === 11000)
    return res
      .status(409)
      .json({ error: "A record with this value already exists" });
  if (err.name === "CastError")
    return res.status(400).json({ error: "Invalid resource identifier" });
  const status = err.status || 500;
  console.error(
    JSON.stringify({
      level: "error",
      message: err.message,
      status,
    }),
  );
  res
    .status(status)
    .json({
      error:
        err.publicMessage ||
        (status >= 500 ? "Internal server error" : err.message || "Request failed"),
    });
});
export default app;
