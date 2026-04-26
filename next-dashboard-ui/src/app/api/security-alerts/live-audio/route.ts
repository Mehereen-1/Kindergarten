import { NextRequest, NextResponse } from 'next/server';

import { ensureSecurityAlertAudioServiceReady, getServiceUrl } from '@/lib/securityAlertServiceManager';
import { requireSecurityAlertRoles } from '@/lib/securityAlertsAccess';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toWebSocketUrl(serviceUrl: string) {
  const url = new URL(serviceUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/anomaly/live-audio`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export async function GET(request: NextRequest) {
  const access = requireSecurityAlertRoles(request, ['admin', 'teacher'], 'access live audio anomaly stream');
  if (!access.ok) {
    return access.response;
  }

  try {
    const status = await ensureSecurityAlertAudioServiceReady(90000);
    const serviceUrl = status.serviceUrl || getServiceUrl();

    return NextResponse.json({
      serviceUrl,
      websocketUrl: toWebSocketUrl(serviceUrl),
      running: Boolean(status.running),
      healthy: Boolean(status.health),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to prepare live microphone stream' },
      { status: 500 }
    );
  }
}
