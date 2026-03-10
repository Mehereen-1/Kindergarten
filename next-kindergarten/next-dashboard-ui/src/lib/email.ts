import nodemailer from 'nodemailer';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface EventEmailPayload {
  subject: string;
  text: string;
  html: string;
}

// ─── Transporter (created once per process) ───────────────────────────────────
let _transporter: nodemailer.Transporter | null = null;
let _testAccountEmail: string | null = null;

async function getTransporter() {
  if (_transporter) return _transporter;

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (user && pass) {
    // Real SMTP (Gmail or other)
    _transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 587),
      secure: false,
      auth: { user, pass },
    });
    console.log('[Email] Using real SMTP:', user);
  } else {
    // Auto Ethereal test account — perfect for demos without real credentials
    const testAccount = await nodemailer.createTestAccount();
    _testAccountEmail = testAccount.user;
    _transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAccount.user, pass: testAccount.pass },
    });
    console.log('[Email] No SMTP configured — using Ethereal test account:', testAccount.user);
  }

  return _transporter;
}

// ─── Send email ────────────────────────────────────────────────────────────────
export async function sendEmail(
  to: string | string[],
  payload: EventEmailPayload
): Promise<{ previewUrl?: string }> {
  const transporter = await getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'Kinder Vision <no-reply@kindergarten.local>';

  const info = await transporter.sendMail({
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
  });

  // For Ethereal test accounts, return the preview URL so it shows in the API response
  const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
  if (previewUrl) {
    console.log('[Email] Preview URL:', previewUrl);
  }

  return { previewUrl: previewUrl || undefined };
}

// ─── HTML template helpers ────────────────────────────────────────────────────
export function buildReminderEmail(opts: {
  eventTitle: string;
  eventDate: string;
  description?: string;
  location?: string;
  timing: 'day-before' | 'day-of';
}): EventEmailPayload {
  const when = opts.timing === 'day-before' ? 'tomorrow' : 'today';
  const headlineColor = opts.timing === 'day-before' ? '#f59e0b' : '#ef4444';
  const subject =
    opts.timing === 'day-before'
      ? `Reminder: "${opts.eventTitle}" is tomorrow`
      : `Today's Event: "${opts.eventTitle}"`;

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /></head>
<body style="font-family: Arial, sans-serif; background:#f3f4f6; margin:0; padding:20px;">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.12);">
    <div style="background:${headlineColor};padding:20px 24px;">
      <h1 style="color:#fff;margin:0;font-size:20px;">📅 School Event ${when === 'tomorrow' ? 'Tomorrow' : 'Today'}</h1>
    </div>
    <div style="padding:24px;">
      <h2 style="margin-top:0;color:#111;">${opts.eventTitle}</h2>
      <p style="color:#555;font-size:15px;margin:0 0 12px;">
        <strong>📆 Date:</strong> ${opts.eventDate}
      </p>
      ${opts.location ? `<p style="color:#555;font-size:15px;margin:0 0 12px;"><strong>📍 Location:</strong> ${opts.location}</p>` : ''}
      ${opts.description ? `<p style="color:#555;font-size:15px;margin:0 0 20px;">${opts.description}</p>` : ''}
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/list/events"
         style="display:inline-block;background:${headlineColor};color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:bold;">
        View All Events →
      </a>
    </div>
    <div style="background:#f9fafb;padding:12px 24px;font-size:12px;color:#9ca3af;">
      Kinder Vision — Kindergarten Management System
    </div>
  </div>
</body>
</html>`;

  const text = `${subject}\n\nDate: ${opts.eventDate}\n${opts.location ? `Location: ${opts.location}\n` : ''}${opts.description || ''}`;

  return { subject, text, html };
}
