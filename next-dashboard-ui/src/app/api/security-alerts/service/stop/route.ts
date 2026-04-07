import { NextResponse } from 'next/server';

import { stopSecurityAlertService } from '@/lib/securityAlertServiceManager';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const result = await stopSecurityAlertService();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to stop anomaly service' },
      { status: 500 }
    );
  }
}
