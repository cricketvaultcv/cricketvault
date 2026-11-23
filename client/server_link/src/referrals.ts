import mongoose from "mongoose";
import { Subscription, User } from "./models.js";

export async function applyReferralReviews(subscriptionId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const subscription = await Subscription.findOneAndUpdate(
        { _id: subscriptionId, referralReviewsApplied: { $ne: true } },
        { $set: { referralReviewsApplied: true } },
        { new: true, session },
      );
      if (!subscription) return;
      const credits = Number(subscription.planSnapshot?.referralReviewsUsed || 0);
      if (credits <= 0) return;
      const result = await User.updateOne(
        {
          _id: subscription.player,
          referralReviewCredits: { $gte: credits },
        },
        { $inc: { referralReviewCredits: -credits } },
        { session },
      );
      if (!result.modifiedCount)
        throw new Error("Reserved referral review credits are no longer available");
    });
  } finally {
    await session.endSession();
  }
}

export async function awardReferralForFirstPurchase(referredPlayerId: string) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const referred = await User.findOneAndUpdate(
        {
          _id: referredPlayerId,
          role: "PLAYER",
          referredBy: { $exists: true },
          referralRewardedAt: { $exists: false },
        },
        { $set: { referralRewardedAt: new Date() } },
        { new: true, session },
      );
      if (!referred?.referredBy) return;
      const reward = await User.updateOne(
        { _id: referred.referredBy, role: "PLAYER" },
        { $inc: { referralReviewCredits: 5 } },
        { session },
      );
      if (!reward.modifiedCount) return;
    });
  } finally {
    await session.endSession();
  }
}
