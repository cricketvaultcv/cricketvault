import { afterEach, describe, expect, it, vi } from "vitest";
import { normalizeIndiaPhoneNumber, sendOtpSms } from "./sms.js";
import { getSignupVerificationMethod } from "./signup-verification.js";

afterEach(() => {
  delete process.env.MSG91_AUTH_KEY;
  delete process.env.MSG91_TEMPLATE_ID;
  vi.restoreAllMocks();
});

describe("MSG91 phone verification", () => {
  it("uses email signup verification without a template and SMS when one is configured", () => {
    expect(getSignupVerificationMethod(undefined)).toBe("email");
    expect(getSignupVerificationMethod("  ")).toBe("email");
    expect(getSignupVerificationMethod("signup-template")).toBe("phone");
  });

  it("normalizes Indian mobile numbers and rejects unsupported formats", () => {
    expect(normalizeIndiaPhoneNumber("98765 43210")).toBe("+919876543210");
    expect(normalizeIndiaPhoneNumber("+91-98765-43210")).toBe("+919876543210");
    expect(() => normalizeIndiaPhoneNumber("12345")).toThrow("valid Indian mobile number");
  });

  it("sends a template OTP through MSG91 without exposing credentials to the client", async () => {
    process.env.MSG91_AUTH_KEY = "test-msg91-key";
    process.env.MSG91_TEMPLATE_ID = "test-template";
    const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ type: "success" }), { status: 200 }),
    );

    await expect(sendOtpSms("+919876543210", "123456")).resolves.toBeUndefined();
    expect(fetch).toHaveBeenCalledWith(
      "https://control.msg91.com/api/v5/flow/",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authkey: "test-msg91-key" }),
      }),
    );
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body))).toMatchObject({
      template_id: "test-template",
      recipients: [{ mobiles: "919876543210", var1: "123456" }],
    });
  });

  it("fails explicitly when MSG91 is not configured", async () => {
    await expect(sendOtpSms("+919876543210", "123456")).rejects.toMatchObject({
      status: 503,
    });
  });
});
