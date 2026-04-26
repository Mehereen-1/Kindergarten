import { NextRequest, NextResponse } from 'next/server';

import { getSecurityAlertServiceStatus } from '@/lib/securityAlertServiceManager';
import { requireSecurityAlertRoles } from '@/lib/securityAlertsAccess';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const access = requireSecurityAlertRoles(request, ['admin'], 'view anomaly service status');
  if (!access.ok) {
    return access.response;
  }

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
