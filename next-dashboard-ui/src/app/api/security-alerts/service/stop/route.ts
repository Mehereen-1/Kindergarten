import { NextRequest, NextResponse } from 'next/server';

import { stopSecurityAlertService } from '@/lib/securityAlertServiceManager';
import { requireSecurityAlertRoles } from '@/lib/securityAlertsAccess';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const access = requireSecurityAlertRoles(request, ['admin'], 'stop anomaly service');
  if (!access.ok) {
    return access.response;
  }

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
