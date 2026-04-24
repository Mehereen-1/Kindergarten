import { sendEmail } from '@/lib/email';
import { getServerAppUrl } from '@/lib/serverConfig';

function buildMessageLayout(title: string, description: string, ctaLabel: string, ctaUrl: string) {
  const subject = title;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family: Arial, sans-serif; background:#f3f4f6; margin:0; padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">
    <div style="background:#1f3b4d;padding:20px 24px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">${title}</h1>
    </div>
    <div style="padding:24px; color:#374151; line-height:1.6;">
      <p style="margin-top:0;">${description}</p>
      <a href="${ctaUrl}"
         style="display:inline-block;background:#1f3b4d;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:bold;">
        ${ctaLabel}
      </a>
      <p style="font-size:12px;margin-top:16px;word-break:break-all;">${ctaUrl}</p>
    </div>
  </div>
</body>
</html>`;

  const text = `${description}\n\n${ctaLabel}: ${ctaUrl}`;
  return { subject, html, text };
}

export async function sendAdminSetupEmail(email: string, setupToken: string) {
  const setupUrl = `${getServerAppUrl()}/admin-setup?token=${encodeURIComponent(setupToken)}`;
  const payload = buildMessageLayout(
    'Admin Account Setup',
    'Your admin account is ready. Use this secure link to set your password and activate access before it expires.',
    'Complete Setup',
    setupUrl
  );

  return sendEmail(email, payload);
}

export async function sendAdminResetEmail(email: string, resetToken: string) {
  const resetUrl = `${getServerAppUrl()}/admin-reset-password?token=${encodeURIComponent(resetToken)}`;
  const payload = buildMessageLayout(
    'Admin Password Reset',
    'A password reset was requested for your admin account. Use the link below to set a new password.',
    'Reset Password',
    resetUrl
  );

  return sendEmail(email, payload);
}

export async function sendAdminEmailVerification(email: string, verificationToken: string) {
  const verifyUrl = `${getServerAppUrl()}/api/admin/change-email/verify?token=${encodeURIComponent(verificationToken)}`;
  const payload = buildMessageLayout(
    'Verify New Admin Email',
    'Confirm ownership of this email address to finish your admin email change.',
    'Verify Email',
    verifyUrl
  );

  return sendEmail(email, payload);
}
