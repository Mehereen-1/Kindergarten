import { NextResponse } from 'next/server';

import { startSecurityAlertService } from '@/lib/securityAlertServiceManager';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const result = await startSecurityAlertService();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to start anomaly service' },
      { status: 500 }
    );
  }
}
