import { connectDB } from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';

const MAX_AUDIT_LOGS = 500;

export async function logAdminAction(
  adminId: string,
  action: string,
  ip?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await connectDB();

    await Admin.findByIdAndUpdate(adminId, {
      $push: {
        auditLogs: {
          $each: [
            {
              action,
              timestamp: new Date(),
              ip: ip || 'unknown',
              metadata,
            },
          ],
          $slice: -MAX_AUDIT_LOGS,
        },
      },
    });
  } catch {
    // Audit logging is best effort and must not block auth flows.
  }
}
