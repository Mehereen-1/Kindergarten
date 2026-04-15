import mongoose from 'mongoose';

export interface SessionUser {
  id: string;
  name?: string;
  email?: string;
  role?: 'admin' | 'teacher' | 'parent' | string;
}

export function extractSessionUser(rawCookieValue?: string | null): SessionUser | null {
  if (!rawCookieValue) return null;

  if (mongoose.Types.ObjectId.isValid(rawCookieValue)) {
    return { id: rawCookieValue };
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(rawCookieValue));
    const candidateId = parsed?.id || parsed?._id;

    if (!candidateId || !mongoose.Types.ObjectId.isValid(candidateId)) {
      return null;
    }

    return {
      id: String(candidateId),
      name: parsed?.name,
      email: parsed?.email,
      role: parsed?.role,
    };
  } catch {
    return null;
  }
}

export function extractSessionUserId(rawCookieValue?: string | null): string | null {
  return extractSessionUser(rawCookieValue)?.id || null;
}
