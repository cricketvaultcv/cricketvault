import mongoose, { Schema, type InferSchemaType } from "mongoose";
const opts = {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
};
const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    emailVerified: { type: Boolean, default: true },
    phone: { type: String, unique: true, sparse: true },
    phoneVerified: { type: Boolean, default: true },
    signupVerificationMethod: { type: String, enum: ["PHONE", "EMAIL"] },
    subscriptionEmailVerifiedAt: Date,
    referralCode: { type: String, unique: true, sparse: true },
    referredBy: { type: Schema.Types.ObjectId, ref: "User" },
    referralReviewCredits: { type: Number, default: 0, min: 0 },
    referralRewardedAt: Date,
    tokenVersion: { type: Number, default: 0 },
    passwordHash: { type: String, required: false, select: false },
    googleId: { type: String, unique: true, sparse: true, select: false },
    role: {
      type: String,
      enum: ["PLAYER", "COACH", "ADMIN"],
      default: "PLAYER",
    },
    status: {
      type: String,
      enum: ["ACTIVE", "PENDING", "DISABLED"],
      default: "ACTIVE",
    },
    preferences: {
      emailAlerts: { type: Boolean, default: true },
      smsAlerts: { type: Boolean, default: false },
    },
  },
  opts,
);
userSchema.virtual("playerProfile", {
  ref: "PlayerProfile",
  localField: "_id",
  foreignField: "user",
  justOne: true,
});
userSchema.virtual("coachProfile", {
  ref: "CoachProfile",
  localField: "_id",
  foreignField: "user",
  justOne: true,
});
const playerSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    ageGroup: String,
    location: String,
    playingRole: String,
    battingStyle: String,
    bowlingStyle: String,
    skillLevel: String,
    formats: [String],
    goals: [String],
    improvements: [String],
    availability: String,
    photo: String,
  },
  opts,
);
const coachSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      required: true,
    },
    bio: String,
    approach: String,
    experience: Number,
    pricePerReview: Number,
    specialties: [String],
    levels: [String],
    formats: [String],
    available: { type: Boolean, default: true },
    location: String,
    capacity: { type: Number, default: 8, min: 1 },
    reservedCount: { type: Number, default: 0 },
    activeCount: { type: Number, default: 0 },
    approved: { type: Boolean, default: false },
    photo: String,
  },
  opts,
);
const planSchema = new Schema(
  {
    name: { type: String, required: true },
    description: String,
    pricePaise: { type: Number, required: true, min: 1 },
    durationDays: { type: Number, required: true, min: 1 },
    maxVideos: { type: Number, required: true, min: 1 },
    includedReviews: { type: Number, required: true, min: 1 },
    feedbackFrequency: String,
    features: [String],
    published: { type: Boolean, default: false },
  },
  opts,
);
const couponSchema = new Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true, unique: true },
    discountType: {
      type: String,
      enum: ["PERCENTAGE", "FIXED"],
      required: true,
    },
    discountValue: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true },
    expiresAt: Date,
  },
  opts,
);
const subscriptionSchema = new Schema(
  {
    player: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    activeSlot: { type: Boolean, default: false },
    coachRequestPending: { type: Boolean, default: false },
    paymentOrderPending: { type: Boolean, default: false },
    reviewCount: { type: Number, default: 0, min: 0 },
    submittedVideoCount: { type: Number, default: 0, min: 0 },
    referralVideoCreditsUsed: { type: Number, default: 0, min: 0 },
    coach: { type: Schema.Types.ObjectId, ref: "User" },
    plan: { type: Schema.Types.ObjectId, ref: "Plan", required: true },
    planSnapshot: {
      name: String,
      pricePaise: Number,
      originalPricePaise: Number,
      discountPaise: Number,
      couponCode: String,
      durationDays: Number,
      maxVideos: Number,
      includedReviews: Number,
      referralReviewsUsed: { type: Number, default: 0 },
      features: [String],
    },
    status: {
      type: String,
      enum: [
        "PENDING_PAYMENT",
        "AWAITING_COACH",
        "ACTIVE",
        "EXPIRED",
        "CANCELLED",
        "REFUND_PENDING",
        "REFUNDED",
      ],
      default: "PENDING_PAYMENT",
      index: true,
    },
    paymentState: {
      type: String,
      enum: [
        "CREATED",
        "PENDING",
        "VERIFIED",
        "FAILED",
        "REFUND_PENDING",
        "REFUNDED",
      ],
      default: "CREATED",
    },
    referralReviewsApplied: { type: Boolean, default: false },
    startedAt: Date,
    expiresAt: Date,
  },
  opts,
);
subscriptionSchema.index({ player: 1, status: 1 });
subscriptionSchema.index(
  { player: 1 },
  { unique: true, partialFilterExpression: { activeSlot: true } },
);
const requestSchema = new Schema(
  {
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      index: true,
    },
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REJECTED", "WITHDRAWN"],
      default: "PENDING",
    },
    notes: { type: String, maxlength: 1000 },
    rejectionReason: { type: String, maxlength: 1000 },
    expiresAt: Date,
  },
  opts,
);
requestSchema.index({ subscription: 1, coach: 1, status: 1 });
const paymentSchema = new Schema(
  {
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    amountPaise: Number,
    currency: { type: String, default: "INR" },
    provider: { type: String, default: "razorpay" },
    orderId: { type: String, unique: true, sparse: true },
    paymentId: { type: String, unique: true, sparse: true },
    refundId: { type: String, unique: true, sparse: true },
    refundAmountPaise: { type: Number, min: 0 },
    refundStatus: {
      type: String,
      enum: ["CREATING", "PENDING", "PROCESSED", "FAILED", "NOT_REQUIRED"],
    },
    state: {
      type: String,
      enum: [
        "CREATED",
        "PENDING",
        "VERIFIED",
        "FAILED",
        "REFUND_PENDING",
        "REFUNDED",
      ],
      default: "CREATED",
    },
    events: [String],
  },
  opts,
);
const videoSchema = new Schema(
  {
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    player: { type: Schema.Types.ObjectId, ref: "User", required: true },
    sourceUrl: { type: String, trim: true, required: true },
    sourceType: {
      type: String,
      enum: ["YOUTUBE", "GOOGLE_DRIVE"],
      required: true,
    },
    title: { type: String, trim: true },
    category: String,
    notes: String,
    status: { type: String, default: "READY" },
  },
  opts,
);
const reviewSchema = new Schema(
  {
    video: { type: Schema.Types.ObjectId, ref: "Video", required: true },
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
    },
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: String,
    strengths: String,
    issues: String,
    drills: String,
    recommendations: String,
    targets: String,
    followUp: Date,
    timestamps: [String],
  },
  opts,
);
reviewSchema.index({ video: 1 }, { unique: true });
const actionPlanSchema = new Schema(
  {
    subscription: {
      type: Schema.Types.ObjectId,
      ref: "Subscription",
      required: true,
      unique: true,
    },
    coach: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: String,
    description: String,
    objectives: [String],
    tasks: [
      {
        title: String,
        instructions: String,
        frequency: String,
        dueDate: Date,
        completedAt: Date,
        progressNote: String,
      },
    ],
    startDate: Date,
    dueDate: Date,
  },
  opts,
);
const notificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: String,
    body: String,
    type: String,
    readAt: Date,
  },
  opts,
);
const auditSchema = new Schema(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    action: String,
    target: String,
    meta: Schema.Types.Mixed,
  },
  opts,
);
const webhookEventSchema = new Schema(
  {
    providerEventId: { type: String, required: true, unique: true },
    eventType: { type: String, required: true },
    processedAt: Date,
  },
  opts,
);
const emailVerificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    tokenHash: { type: String, required: true, unique: true },
    attempts: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  opts,
);
const phoneVerificationSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    phone: { type: String, required: true },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  opts,
);
const emailOtpSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    purpose: {
      type: String,
      enum: ["EMAIL_VERIFICATION", "PASSWORD_RESET"],
      required: true,
    },
    otpHash: { type: String, required: true },
    attempts: { type: Number, default: 0, min: 0 },
    expiresAt: { type: Date, required: true, expires: 0 },
  },
  opts,
);
emailOtpSchema.index({ user: 1, purpose: 1 }, { unique: true });
const resourceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true },
    pricePaise: { type: Number, required: true, min: 0 },
    level: { type: String, default: "All Levels" },
    description: { type: String, required: true },
    coverImage: { type: String, default: "" },
    author: { type: String, required: true },
    whatInside: [String],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
    published: { type: Boolean, default: true },
  },
  opts,
);
const resourcePurchaseSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    resource: { type: Schema.Types.ObjectId, ref: "Resource", required: true },
    amountPaise: { type: Number, min: 0 },
    currency: { type: String, default: "INR" },
    orderId: { type: String, unique: true, sparse: true },
    paymentId: { type: String, unique: true, sparse: true },
    status: {
      type: String,
      enum: ["PENDING", "VERIFIED", "FAILED"],
      default: "PENDING",
    },
  },
  opts,
);
resourcePurchaseSchema.index({ user: 1, resource: 1 }, { unique: true });
export const User = mongoose.models.User || mongoose.model("User", userSchema);
export const Player = mongoose.models.PlayerProfile || mongoose.model("PlayerProfile", playerSchema);
export const Coach = mongoose.models.CoachProfile || mongoose.model("CoachProfile", coachSchema);
export const Plan = mongoose.models.Plan || mongoose.model("Plan", planSchema);
export const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
export const Subscription = mongoose.models.Subscription || mongoose.model("Subscription", subscriptionSchema);
export const CoachRequest = mongoose.models.CoachRequest || mongoose.model("CoachRequest", requestSchema);
export const Payment = mongoose.models.Payment || mongoose.model("Payment", paymentSchema);
export const Video = mongoose.models.VideoSubmission || mongoose.model("VideoSubmission", videoSchema);
export const Review = mongoose.models.VideoReview || mongoose.model("VideoReview", reviewSchema);
export const ActionPlan = mongoose.models.ActionPlan || mongoose.model("ActionPlan", actionPlanSchema);
export const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export const Audit = mongoose.models.AuditLog || mongoose.model("AuditLog", auditSchema);
export const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model("WebhookEvent", webhookEventSchema);
export const EmailVerification =
  mongoose.models.EmailVerification ||
  mongoose.model("EmailVerification", emailVerificationSchema);
export const EmailOtp = mongoose.models.EmailOtp || mongoose.model("EmailOtp", emailOtpSchema);
export const PhoneVerification =
  mongoose.models.PhoneVerification ||
  mongoose.model("PhoneVerification", phoneVerificationSchema);
export const Resource = mongoose.models.Resource || mongoose.model("Resource", resourceSchema);
export const ResourcePurchase =
  mongoose.models.ResourcePurchase ||
  mongoose.model("ResourcePurchase", resourcePurchaseSchema);
