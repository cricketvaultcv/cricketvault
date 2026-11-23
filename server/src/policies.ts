import crypto from "node:crypto";

export type ResourceRole = "PLAYER" | "COACH" | "ADMIN";

export function canAccessVideo(
  role: ResourceRole,
  userId: string,
  video: { player: string },
  assignedCoachId?: string,
): boolean {
  if (role === "ADMIN") return true;
  if (role === "PLAYER") return video.player === userId;
  return assignedCoachId === userId;
}

export function hasBlockingSubscription(
  status: string,
  expiresAt?: Date | null,
  now = new Date(),
): boolean {
  if (status === "PENDING_PAYMENT" || status === "AWAITING_COACH") return true;
  return status === "ACTIVE" && (!expiresAt || expiresAt > now);
}

export function isSubscriptionActive(
  status: string,
  expiresAt?: Date | null,
  now = new Date(),
): boolean {
  return status === "ACTIVE" && Boolean(expiresAt && expiresAt > now);
}

export function canRequestCoach(status: string, paymentState: string) {
  return status === "AWAITING_COACH" && paymentState === "VERIFIED";
}

export function safeSignatureEqual(expected: string, received: string): boolean {
  const expectedBytes = Buffer.from(expected, "hex");
  const receivedBytes = Buffer.from(received, "hex");
  return (
    expectedBytes.length === receivedBytes.length &&
    expectedBytes.length > 0 &&
    crypto.timingSafeEqual(expectedBytes, receivedBytes)
  );
}
