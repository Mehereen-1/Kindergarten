import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { requireAdminSession } from '@/lib/admin/requireAdmin';
import { changePasswordSchema } from '@/lib/admin/validators';
import { getRequestIP } from '@/lib/admin/ip';
import { logAdminAction } from '@/lib/admin/audit';

export async function POST(request: NextRequest) {
  try {
    const sessionResult = await requireAdminSession(request);
    if (!sessionResult.ok) {
      return sessionResult.response;
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    if (!sessionResult.admin.password) {
      return NextResponse.json({ error: 'Password setup is incomplete' }, { status: 400 });
    }

    const isMatch = await bcrypt.compare(currentPassword, sessionResult.admin.password);
    if (!isMatch) {
      await logAdminAction(String(sessionResult.admin._id), 'ADMIN_CHANGE_PASSWORD_FAIL', getRequestIP(request), {
        reason: 'CURRENT_PASSWORD_MISMATCH',
      });
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    sessionResult.admin.password = await bcrypt.hash(newPassword, 12);
    await sessionResult.admin.save();

    await logAdminAction(String(sessionResult.admin._id), 'ADMIN_CHANGE_PASSWORD', getRequestIP(request));

    return NextResponse.json({ message: 'Password updated successfully' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to change password' }, { status: 500 });
  }
}
