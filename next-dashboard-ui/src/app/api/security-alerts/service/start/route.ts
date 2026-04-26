import { NextRequest, NextResponse } from 'next/server';

import { startSecurityAlertService } from '@/lib/securityAlertServiceManager';
import { requireSecurityAlertRoles } from '@/lib/securityAlertsAccess';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const access = requireSecurityAlertRoles(request, ['admin'], 'start anomaly service');
  if (!access.ok) {
    return access.response;
  }

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
