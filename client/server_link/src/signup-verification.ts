export type SignupVerificationMethod = "phone" | "email";

export function getSignupVerificationMethod(
  templateId = process.env.MSG91_TEMPLATE_ID,
): SignupVerificationMethod {
  return templateId?.trim() ? "phone" : "email";
}
