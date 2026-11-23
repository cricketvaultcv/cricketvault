import mongoose from "mongoose";
import type { ClientSession } from "mongoose";
import { Coach, CoachRequest, Subscription } from "./models.js";

export async function reserveCoachCapacity(
  coachId: string,
  session?: ClientSession,
) {
  return Coach.findOneAndUpdate(
    {
      _id: coachId,
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
    },
    { $inc: { reservedCount: 1 } },
    { new: true, ...(session ? { session } : {}) },
  );
}

export async function releaseExpiredCoachRequests(coachId?: string) {
  const now = new Date();
  const expired = await CoachRequest.find({
    status: "PENDING",
    expiresAt: { $lte: now },
    ...(coachId ? { coach: coachId } : {}),
  })
    .select("_id coach subscription")
    .limit(200);
  for (const candidate of expired) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const request = await CoachRequest.findOneAndUpdate(
          {
            _id: candidate._id,
            status: "PENDING",
            expiresAt: { $lte: now },
          },
          { $set: { status: "WITHDRAWN" } },
          { new: true, session },
        );
        if (!request) return;
        await Promise.all([
          Coach.updateOne(
            { user: request.coach, reservedCount: { $gt: 0 } },
            { $inc: { reservedCount: -1 } },
            { session },
          ),
          Subscription.updateOne(
            { _id: request.subscription, coachRequestPending: true },
            { $set: { coachRequestPending: false } },
            { session },
          ),
        ]);
      });
    } finally {
      await session.endSession();
    }
  }
}

export async function releaseExpiredSubscriptions() {
  const now = new Date();
  const expired = await Subscription.find({
    status: "ACTIVE",
    expiresAt: { $lte: now },
  })
    .select("_id coach")
    .limit(200);
  for (const candidate of expired) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const subscription = await Subscription.findOneAndUpdate(
          {
            _id: candidate._id,
            status: "ACTIVE",
            expiresAt: { $lte: now },
          },
          { $set: { status: "EXPIRED", activeSlot: false } },
          { new: true, session },
        );
        if (!subscription?.coach) return;
        await Coach.updateOne(
          { user: subscription.coach, activeCount: { $gt: 0 } },
          { $inc: { activeCount: -1 } },
          { session },
        );
      });
    } finally {
      await session.endSession();
    }
  }
}
