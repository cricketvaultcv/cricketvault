export function normalizeIndiaPhoneNumber(phone: string) {
  const normalized = phone.replace(/[\s()-]/g, "");
  const e164 = normalized.startsWith("+91")
    ? normalized
    : normalized.startsWith("91") && normalized.length === 12
      ? `+${normalized}`
      : normalized.length === 10
        ? `+91${normalized}`
        : "";
  if (!/^\+91[6-9]\d{9}$/.test(e164)) {
    throw Object.assign(
      new Error("Enter a valid Indian mobile number, including the +91 country code."),
      { status: 400 },
    );
  }
  return e164;
}

export async function sendOtpSms(phone: string, otp: string) {
  const authKey = process.env.MSG91_AUTH_KEY;
  const templateId = process.env.MSG91_TEMPLATE_ID;
  if (!authKey || !templateId) {
    throw Object.assign(
      new Error("Mobile verification is not configured (MSG91_AUTH_KEY and MSG91_TEMPLATE_ID are required)."),
      { status: 503 },
    );
  }

  let response: Response;
  try {
    response = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        authkey: authKey,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(10_000),
      body: JSON.stringify({
        template_id: templateId,
        short_url: "0",
        recipients: [
          {
            mobiles: phone.replace("+", ""),
            var1: otp,
          },
        ],
      }),
    });
  } catch {
    throw Object.assign(new Error("Unable to send the mobile verification code. Please try again."), {
      status: 502,
    });
  }

  if (!response.ok) {
    console.error(JSON.stringify({
      level: "error",
      message: "MSG91 rejected mobile verification message",
      status: response.status,
    }));
    throw Object.assign(new Error("Unable to send the mobile verification code. Please try again."), {
      status: 502,
    });
  }
  const result = await response.json().catch(() => null) as { type?: string } | null;
  if (result?.type?.toLowerCase() === "error") {
    console.error(JSON.stringify({
      level: "error",
      message: "MSG91 rejected mobile verification message",
    }));
    throw Object.assign(new Error("Unable to send the mobile verification code. Please try again."), {
      status: 502,
    });
  }
}
