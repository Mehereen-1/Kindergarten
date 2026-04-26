import { NextRequest, NextResponse } from 'next/server';

import { ensureSecurityAlertServiceReady, getServiceUrl } from '@/lib/securityAlertServiceManager';
import { requireSecurityAlertRoles } from '@/lib/securityAlertsAccess';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const access = requireSecurityAlertRoles(request, ['admin', 'teacher'], 'stream security video analysis');
  if (!access.ok) {
    return access.response;
  }

  try {
    const formData = await request.formData();
    const video = formData.get('video');

    if (!(video instanceof File)) {
      return NextResponse.json({ error: 'Video file is required' }, { status: 400 });
    }

    const cameraName = String(formData.get('camera_name') || '').trim();
    const className = String(formData.get('class_name') || '').trim();

    await ensureSecurityAlertServiceReady(90000);

    const upstreamForm = new FormData();
    upstreamForm.set('video', video, video.name || 'upload.mp4');
    upstreamForm.set('camera_name', cameraName);
    upstreamForm.set('class_name', className);

    const progressUrl = `${getServiceUrl()}/anomaly/analyze-video-progress`;
    const response = await fetch(progressUrl, {
      method: 'POST',
      body: upstreamForm,
      cache: 'no-store',
    });

    if (response.status === 404) {
      const fallbackForm = new FormData();
      fallbackForm.set('video', video, video.name || 'upload.mp4');
      fallbackForm.set('camera_name', cameraName);
      fallbackForm.set('class_name', className);
      fallbackForm.set('notify_ingest', 'false');

      const fallbackResponse = await fetch(`${getServiceUrl()}/anomaly/analyze-video`, {
        method: 'POST',
        body: fallbackForm,
        cache: 'no-store',
      });

      const fallbackJson = await fallbackResponse.json().catch(() => ({}));
      if (!fallbackResponse.ok) {
        return NextResponse.json(
          { error: fallbackJson?.detail || fallbackJson?.error || 'Fallback anomaly analysis failed' },
          { status: fallbackResponse.status || 500 }
        );
      }

      const payload =
        JSON.stringify({
          type: 'started',
          progress_percent: 0,
          processed_frames: 0,
          total_frames: null,
          message: 'Video analysis started',
        }) +
        '\n' +
        JSON.stringify({
          type: 'final',
          progress_percent: 100,
          processed_frames: fallbackJson?.frame_index || 0,
          total_frames: fallbackJson?.frame_index || 0,
          result: fallbackJson,
        }) +
        '\n';

      return new Response(payload, {
        status: 200,
        headers: {
          'Content-Type': 'application/x-ndjson',
          'Cache-Control': 'no-store',
        },
      });
    }

    if (!response.ok || !response.body) {
      const body = await response.text().catch(() => '');
      return NextResponse.json(
        { error: body || 'Anomaly progress stream request failed' },
        { status: response.status || 500 }
      );
    }

    return new Response(response.body, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-ndjson',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to start streaming video analysis' },
      { status: 500 }
    );
  }
}
