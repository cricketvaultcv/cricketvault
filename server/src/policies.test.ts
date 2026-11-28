import { describe, expect, it } from "vitest";
import {
  canAccessVideo,
  canRequestCoach,
  hasBlockingSubscription,
  isSubscriptionActive,
  safeSignatureEqual,
  videoSubmissionAllowance,
} from "./policies.js";
import { Subscription } from "./models.js";

describe("resource authorization", () => {
  const video = { player: "player-1" };

  it("allows only the owner, assigned coach, or administrator to access a video", () => {
    expect(canAccessVideo("PLAYER", "player-1", video, "coach-1")).toBe(true);
    expect(canAccessVideo("PLAYER", "player-2", video, "coach-1")).toBe(false);
    expect(canAccessVideo("COACH", "coach-1", video, "coach-1")).toBe(true);
    expect(canAccessVideo("COACH", "coach-2", video, "coach-1")).toBe(false);
    expect(canAccessVideo("ADMIN", "admin-1", video)).toBe(true);
  });
});

describe("subscription and coach assignment policy", () => {
  it("blocks duplicates while payment, coach selection, or an active period is pending", () => {
    const now = new Date("2026-10-27T00:00:00Z");
    expect(hasBlockingSubscription("PENDING_PAYMENT", null, now)).toBe(true);
    expect(hasBlockingSubscription("AWAITING_COACH", null, now)).toBe(true);
    expect(
      hasBlockingSubscription("ACTIVE", new Date("2026-10-28T00:00:00Z"), now),
    ).toBe(true);
    expect(
      hasBlockingSubscription("ACTIVE", new Date("2026-10-26T00:00:00Z"), now),
    ).toBe(false);
    expect(hasBlockingSubscription("CANCELLED", null, now)).toBe(false);
  });

  it("enforces one open subscription per player with a partial unique index", () => {
    const activeSlotIndex = Subscription.schema.indexes().find(
      ([keys, options]) =>
        JSON.stringify(keys) === JSON.stringify({ player: 1 }) &&
        options?.unique === true,
    );
    expect(activeSlotIndex?.[1]).toMatchObject({
      unique: true,
      partialFilterExpression: { activeSlot: true },
    });
  });

  it("allows rejected coach reassignment with the already-verified payment", () => {
    const rejectedRequest = {
      status: "REJECTED",
      subscriptionStatus: "AWAITING_COACH",
      paymentState: "VERIFIED",
    };
    expect(
      canRequestCoach(
        rejectedRequest.subscriptionStatus,
        rejectedRequest.paymentState,
      ),
    ).toBe(true);
    expect(canRequestCoach("AWAITING_COACH", "VERIFIED")).toBe(true);
    expect(canRequestCoach("AWAITING_COACH", "FAILED")).toBe(false);
    expect(canRequestCoach("PENDING_PAYMENT", "VERIFIED")).toBe(false);
  });

  it("rejects mutations after expiry while preserving readable history", () => {
    const now = new Date("2026-10-27T00:00:00Z");
    expect(
      isSubscriptionActive("ACTIVE", new Date("2026-10-28T00:00:00Z"), now),
    ).toBe(true);
    expect(
      isSubscriptionActive("ACTIVE", new Date("2026-10-26T00:00:00Z"), now),
    ).toBe(false);
    expect(isSubscriptionActive("EXPIRED", null, now)).toBe(false);
  });
});

it("compares payment signatures without accepting malformed lengths", () => {
  expect(safeSignatureEqual("aabb", "aabb")).toBe(true);
  expect(safeSignatureEqual("aabb", "aab")).toBe(false);
  expect(safeSignatureEqual("aabb", "zzzz")).toBe(false);
});

it("requires an explicit referral-credit approval only after the plan video-review limit", () => {
  expect(videoSubmissionAllowance(1, 2, 5, false)).toBe("PLAN");
  expect(videoSubmissionAllowance(2, 2, 0, false)).toBe("LIMIT_REACHED");
  expect(videoSubmissionAllowance(2, 2, 1, false)).toBe("CONFIRM_REFERRAL");
  expect(videoSubmissionAllowance(2, 2, 1, true)).toBe("REFERRAL");
});
