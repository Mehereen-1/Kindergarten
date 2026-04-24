import { NextResponse } from 'next/server';

import { ensureSecurityAlertServiceReady, getServiceUrl } from '@/lib/securityAlertServiceManager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toWebSocketUrl(serviceUrl: string) {
  const url = new URL(serviceUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/anomaly/live-webcam`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

export async function GET() {
  try {
    const status = await ensureSecurityAlertServiceReady(90000);
    const serviceUrl = status.serviceUrl || getServiceUrl();

    return NextResponse.json({
      serviceUrl,
      websocketUrl: toWebSocketUrl(serviceUrl),
      running: Boolean(status.running),
      healthy: Boolean(status.health),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to prepare live webcam stream' },
      { status: 500 }
    );
  }
}
