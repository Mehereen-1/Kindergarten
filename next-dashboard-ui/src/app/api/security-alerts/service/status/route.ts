import { NextResponse } from 'next/server';

import { getSecurityAlertServiceStatus } from '@/lib/securityAlertServiceManager';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const status = await getSecurityAlertServiceStatus();
    return NextResponse.json(status);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to get service status' },
      { status: 500 }
    );
  }
}
