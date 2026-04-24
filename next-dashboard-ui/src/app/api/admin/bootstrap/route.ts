import { NextRequest, NextResponse } from 'next/server';
import { adminBootstrapSchema } from '@/lib/admin/validators';
import { getRequestIP } from '@/lib/admin/ip';
import { bootstrapAdminAccount } from '@/lib/admin/bootstrap';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = adminBootstrapSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid payload' },
        { status: 400 }
      );
    }

    const bootstrapSecret =
      request.headers.get('x-admin-bootstrap-secret') ||
      parsed.data.bootstrapSecret ||
      parsed.data.initSecret;

    const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET || process.env.ADMIN_INIT_SECRET;
    if (!expectedSecret || bootstrapSecret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized bootstrap request' }, { status: 401 });
    }

    const result = await bootstrapAdminAccount(parsed.data.email, getRequestIP(request));
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(
      {
        message: 'Bootstrap admin account created. Setup email sent successfully.',
        previewUrl: result.emailResult.previewUrl,
        ...(process.env.NODE_ENV !== 'production'
          ? { setupLink: `/admin-setup?token=${encodeURIComponent(result.rawToken)}` }
          : {}),
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to bootstrap admin' }, { status: 500 });
  }
}
