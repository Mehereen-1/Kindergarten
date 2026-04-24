import Admin from '@/lib/models/Admin';
import { connectDB } from '@/lib/mongodb';
import { generateTokenPair } from '@/lib/admin/security';
import { sendAdminSetupEmail } from '@/lib/admin/email';
import { logAdminAction } from '@/lib/admin/audit';

const SETUP_WINDOW_MS = 30 * 60 * 1000;

export async function bootstrapAdminAccount(email: string, requestIP: string) {
  await connectDB();

  const existingAdminCount = await Admin.countDocuments();
  if (existingAdminCount > 0) {
    return {
      ok: false as const,
      status: 409,
      error: 'Bootstrap is only allowed before the first admin account exists.',
    };
  }

  const existingAdmin = await Admin.findOne({ email });
  if (existingAdmin) {
    return {
      ok: false as const,
      status: 409,
      error: 'Admin already exists for this email.',
    };
  }

  const { rawToken, hashedToken, expiry } = generateTokenPair(SETUP_WINDOW_MS);

  const admin = await Admin.create({
    email,
    password: null,
    isFirstLogin: true,
    setupToken: hashedToken,
    setupTokenExpiry: expiry,
    resetToken: undefined,
    resetTokenExpiry: undefined,
    isApprovedForReset: false,
    resetRequestMeta: {},
    auditLogs: [],
  });

  const emailResult = await sendAdminSetupEmail(admin.email, rawToken);
  await logAdminAction(String(admin._id), 'ADMIN_BOOTSTRAP_CREATED', requestIP, {
    setupTokenExpiry: expiry,
  });

  return {
    ok: true as const,
    admin,
    emailResult,
    rawToken,
  };
}
