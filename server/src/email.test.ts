import { afterEach, describe, expect, it, vi } from "vitest";
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn() }));
vi.stubGlobal("fetch", fetchMock);
import {
  createEmailVerificationToken,
  createEmailOtp,
  hashEmailOtp,
  hashEmailVerificationToken,
  sendEmail,
} from "./email.js";

afterEach(() => {
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.OTP_HASH_SECRET;
  delete process.env.JWT_SECRET;
  fetchMock.mockReset();
  vi.restoreAllMocks();
});

describe("email verification tokens", () => {
  it("creates a random token with a matching hash and bounded expiry", () => {
    const first = createEmailVerificationToken();
    const second = createEmailVerificationToken();

    expect(first.token).toMatch(/^[a-f\d]{64}$/);
    expect(first.tokenHash).toBe(hashEmailVerificationToken(first.token));
    expect(first.tokenHash).not.toContain(first.token);
    expect(first.token).not.toBe(second.token);
    expect(first.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(first.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 24 * 60 * 60 * 1000);
  });

  it("creates a short-lived, user-bound OTP and stores only its keyed hash", () => {
    process.env.OTP_HASH_SECRET = "test-only-otp-secret";
    const challenge = createEmailOtp("player-id", "PHONE_VERIFICATION");

    expect(challenge.otp).toMatch(/^\d{6}$/);
    expect(challenge.otpHash).toBe(hashEmailOtp("player-id", challenge.otp, "PHONE_VERIFICATION"));
    expect(challenge.otpHash).not.toContain(challenge.otp);
    expect(hashEmailOtp("another-player", challenge.otp, "PHONE_VERIFICATION")).not.toBe(challenge.otpHash);
    expect(hashEmailOtp("player-id", challenge.otp, "PASSWORD_RESET")).not.toBe(challenge.otpHash);
    expect(challenge.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(challenge.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 10 * 60 * 1000);
  });

  it("sends transactional email through the Brevo HTTPS API", async () => {
    process.env.BREVO_API_KEY = "test-brevo-api-key";
    process.env.EMAIL_FROM = "CricketVault <no-reply@example.com>";
    fetchMock.mockResolvedValue({ ok: true, status: 201 });

    await expect(sendEmail({
      to: "player@example.com",
      subject: "Welcome",
      text: "Welcome to CricketVault",
      html: "<p>Welcome to CricketVault</p>",
    })).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.brevo.com/v3/smtp/email",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "api-key": "test-brevo-api-key",
          "content-type": "application/json",
        }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual(
      expect.objectContaining({
        sender: { name: "CricketVault", email: "no-reply@example.com" },
        to: [{ email: "player@example.com" }],
        subject: "Welcome",
        textContent: "Welcome to CricketVault",
        htmlContent: expect.stringContaining("<p>Welcome to CricketVault</p>"),
      }),
    );
  });

  it("accepts a bare verified sender address", async () => {
    process.env.BREVO_API_KEY = "test-brevo-api-key";
    process.env.EMAIL_FROM = "no-reply@example.com";
    fetchMock.mockResolvedValue({ ok: true, status: 201 });

    await sendEmail({
      to: "player@example.com",
      subject: "Welcome",
      text: "Welcome to CricketVault",
    });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).sender).toEqual({
      email: "no-reply@example.com",
    });
  });

  it("surfaces Brevo delivery errors without exposing provider details", async () => {
    process.env.BREVO_API_KEY = "test-brevo-api-key";
    process.env.EMAIL_FROM = "CricketVault <no-reply@example.com>";
    fetchMock.mockResolvedValue({ ok: false, status: 401 });
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(sendEmail({
      to: "player@example.com",
      subject: "Welcome",
      text: "Welcome to CricketVault",
    })).rejects.toMatchObject({ status: 502, message: "Unable to send email" });
    expect(errorLog).toHaveBeenCalledWith(
      expect.stringContaining('"status":401'),
    );
  });

  it("surfaces email configuration errors", async () => {
    await expect(sendEmail({
      to: "player@example.com",
      subject: "Welcome",
      text: "Welcome to CricketVault",
    })).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects malformed sender addresses before calling Brevo", async () => {
    process.env.BREVO_API_KEY = "test-brevo-api-key";
    process.env.EMAIL_FROM = "not-an-email";

    await expect(sendEmail({
      to: "player@example.com",
      subject: "Welcome",
      text: "Welcome to CricketVault",
    })).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
