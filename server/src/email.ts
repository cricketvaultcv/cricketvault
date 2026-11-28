import crypto from "node:crypto";
import { User } from "./models.js";

type EmailMessage = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  preheader?: string;
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

/**
 * Keeps all transactional messages visually consistent. Callers provide only
 * the message body; this function adds the CricketVault brand, logo and a
 * readable footer that works in common email clients.
 */
function brandedEmailHtml(content: string, preheader?: string) {
  const clientUrl = process.env.CLIENT_URL?.trim().replace(/\/$/, "") || "https://cricketvault.tech";
  const logoUrl = process.env.EMAIL_LOGO_URL?.trim() || `${clientUrl}/cricketvault-logo.png`;
  const safeLogoUrl = escapeHtml(logoUrl);
  const safeClientUrl = escapeHtml(clientUrl);
  const safePreheader = escapeHtml(preheader || "Updates from CricketVault");
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${safePreheader}</span>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5f9;padding:32px 12px;"><tr><td align="center">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 10px rgba(15,23,42,.08);">
      <tr><td style="padding:24px 32px;background:#0f172a;">
        <a href="${safeClientUrl}" style="text-decoration:none;display:inline-flex;vertical-align:middle;">
          <img src="${safeLogoUrl}" width="54" height="40" alt="CricketVault" style="display:inline-block;vertical-align:middle;object-fit:contain;margin-right:12px;">
          <span style="font-size:22px;line-height:40px;font-weight:700;color:#ffffff;vertical-align:middle;">Cricket<span style="color:#00bfa6;">Vault</span></span>
        </a>
      </td></tr>
      <tr><td style="padding:32px;font-size:16px;line-height:1.6;color:#334155;">${content}</td></tr>
      <tr><td style="padding:20px 32px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;line-height:1.5;color:#64748b;">
        This is an automated message from <a href="${safeClientUrl}" style="color:#0f766e;text-decoration:none;">CricketVault</a>. Please do not share verification codes with anyone.
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;
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
        ...(message.html
          ? { htmlContent: brandedEmailHtml(message.html, message.preheader) }
          : {}),
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
      preheader: message,
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
