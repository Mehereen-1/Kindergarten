import { NextRequest, NextResponse } from 'next/server';

import { extractSessionUser } from '@/lib/auth';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin/session';

type SupportedRole = 'admin' | 'teacher' | 'parent';

type AccessGranted = {
  ok: true;
  role: SupportedRole;
  userId?: string;
};

type AccessDenied = {
  ok: false;
  response: NextResponse;
};

function normalizeRole(role: string | undefined | null): SupportedRole | null {
  const value = String(role || '').trim().toLowerCase();
  if (value === 'admin' || value === 'teacher' || value === 'parent') {
    return value;
  }
  return null;
}

function denied(status: number, message: string): AccessDenied {
  return {
    ok: false,
    response: NextResponse.json({ error: message }, { status }),
  };
}

export function requireSecurityAlertRoles(
  request: NextRequest,
  allowedRoles: SupportedRole[],
  actionLabel: string
): AccessGranted | AccessDenied {
  const adminSessionToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  if (adminSessionToken) {
    const payload = verifyAdminSessionToken(adminSessionToken);
    if (!payload) {
      return denied(401, `Unauthorized: invalid or expired admin session for ${actionLabel}`);
    }
    if (!allowedRoles.includes('admin')) {
      return denied(403, `Forbidden: role "admin" is not allowed to ${actionLabel}`);
    }
    return { ok: true, role: 'admin', userId: payload.sub };
  }

  const sessionUser = extractSessionUser(request.cookies.get('user')?.value);
  const fallbackRole = request.cookies.get('userRole')?.value;
  const resolvedRole = normalizeRole(sessionUser?.role || fallbackRole);

  if (!sessionUser?.id) {
    return denied(401, `Unauthorized: sign in required to ${actionLabel}`);
  }

  if (!resolvedRole) {
    return denied(403, `Forbidden: account role is missing for ${actionLabel}`);
  }

  if (!allowedRoles.includes(resolvedRole)) {
    return denied(
      403,
      `Forbidden: role "${resolvedRole}" is not allowed to ${actionLabel}. Allowed roles: ${allowedRoles.join(', ')}`
    );
  }

  return { ok: true, role: resolvedRole, userId: sessionUser.id };
}
