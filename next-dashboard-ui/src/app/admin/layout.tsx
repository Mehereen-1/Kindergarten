import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AdminShell from '@/app/components/AdminShell';
import { ADMIN_SESSION_COOKIE, verifyAdminSessionToken } from '@/lib/admin/session';
import { connectDB } from '@/lib/mongodb';
import Admin from '@/lib/models/Admin';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!token) {
    redirect('/admin-login');
  }

  const payload = verifyAdminSessionToken(token);
  if (!payload) {
    redirect('/admin-login');
  }

  await connectDB();
  const admin = await Admin.findById(payload.sub).select('_id');
  if (!admin) {
    redirect('/admin-login');
  }

  return <AdminShell>{children}</AdminShell>;
}
