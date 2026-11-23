import crypto from "node:crypto";
import { User } from "./models.js";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]!);

export function createEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  };
}

export function hashEmailVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function createEmailOtp(userId: string, purpose: string) {
  const otp = crypto.randomInt(100_000, 1_000_000).toString();
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET or JWT_SECRET is required");
  return {
    otp,
    otpHash: crypto
      .createHmac("sha256", secret)
      .update(`${userId}:${purpose}:${otp}`)
      .digest("hex"),
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  };
}

export function hashEmailOtp(userId: string, otp: string, purpose: string) {
  const secret = process.env.OTP_HASH_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error("OTP_HASH_SECRET or JWT_SECRET is required");
  return crypto
    .createHmac("sha256", secret)
    .update(`${userId}:${purpose}:${otp}`)
    .digest("hex");
}

function parseEmailSender(from: string) {
  const formatted = from.trim().match(/^(.*?)\s*<([^<>]+)>$/);
  const email = (formatted?.[2] ?? from).trim();
  const name = formatted?.[1].trim().replace(/^["']|["']$/g, "");
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return null;
  return name ? { email, name } : { email };
}

export async function sendEmail(message: EmailMessage) {
  const apiKey = process.env.BREVO_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  const sender = from ? parseEmailSender(from) : null;
  if (!apiKey || !sender) {
    throw Object.assign(
      new Error(
        "Email delivery is not configured correctly (BREVO_API_KEY and a valid EMAIL_FROM sender are required)",
      ),
      { status: 503 },
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender,
        to: [{ email: message.to }],
        subject: message.subject,
        textContent: message.text,
        ...(message.html ? { htmlContent: message.html } : {}),
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      console.error(JSON.stringify({
        level: "error",
        message: "Brevo transactional email request failed",
        status: response.status,
      }));
      throw Object.assign(new Error("Unable to send email"), { status: 502 });
    }
  } catch (error) {
    const code =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : undefined;
    if (!(error instanceof Error && "status" in error)) {
      console.error(JSON.stringify({
        level: "error",
        message: "Brevo transactional email request failed",
        ...(code ? { code } : {}),
      }));
      throw Object.assign(new Error("Unable to send email"), { status: 502 });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendPlayerNotificationEmail(
  userId: string,
  subject: string,
  message: string,
  always = false,
) {
  try {
    const user = await User.findById(userId).select("name email role preferences");
    if (!user || user.role !== "PLAYER" ||
      (!always && user.preferences?.emailAlerts === false)) {
      return;
    }
    const safeName = escapeHtml(user.name);
    const safeMessage = escapeHtml(message);
    await sendEmail({
      to: user.email,
      subject,
      text: `Hi ${user.name},\n\n${message}\n\nCricketVault`,
      html: `<p>Hi ${safeName},</p><p>${safeMessage}</p><p>CricketVault</p>`,
    });
  } catch (error) {
    console.error(JSON.stringify({
      level: "error",
      message: "Unable to deliver player notification email",
      userId,
      subject,
      error: error instanceof Error ? error.message : "Unknown email error",
    }));
  }
}
