import { connectDB } from '@/lib/mongodb';
import AdminResetThrottle from '@/lib/models/AdminResetThrottle';

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 3;

async function consumeKey(key: string): Promise<boolean> {
  const now = new Date();
  const windowCutoff = new Date(Date.now() - WINDOW_MS);

  const existing = await AdminResetThrottle.findOne({ key });

  if (!existing || existing.windowStart < windowCutoff) {
    await AdminResetThrottle.findOneAndUpdate(
      { key },
      {
        key,
        count: 1,
        windowStart: now,
        expiresAt: new Date(Date.now() + WINDOW_MS),
      },
      { upsert: true, new: true }
    );
    return true;
  }

  if (existing.count >= MAX_REQUESTS) {
    return false;
  }

  existing.count += 1;
  existing.expiresAt = new Date(Date.now() + WINDOW_MS);
  await existing.save();
  return true;
}

export async function ensureResetRateLimit(email: string, requestIP: string) {
  await connectDB();

  const emailAllowed = await consumeKey(`admin-reset:email:${email.toLowerCase()}`);
  if (!emailAllowed) {
    return { allowed: false };
  }

  const ipAllowed = await consumeKey(`admin-reset:ip:${requestIP}`);
  if (!ipAllowed) {
    return { allowed: false };
  }

  return { allowed: true };
}
