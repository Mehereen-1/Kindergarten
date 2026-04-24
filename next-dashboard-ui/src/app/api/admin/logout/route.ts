import { NextResponse } from 'next/server';
import { clearAdminSessionCookie } from '@/lib/admin/session';

export async function POST() {
  const response = NextResponse.json({ message: 'Admin logged out successfully' }, { status: 200 });
  clearAdminSessionCookie(response);
  return response;
}
