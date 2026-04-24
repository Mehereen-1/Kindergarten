import { NextRequest, NextResponse } from 'next/server';

import {
  ensureSecurityAlertAudioServiceReady,
  getServiceUrl,
} from '@/lib/securityAlertServiceManager';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const media = formData.get('media');
    if (!(media instanceof File)) {
      return NextResponse.json({ error: 'Media file is required' }, { status: 400 });
    }

    const mediaType = String(formData.get('media_type') || '').trim().toLowerCase() === 'audio' ? 'audio' : 'video';

    await ensureSecurityAlertAudioServiceReady(90000);

    const upstreamForm = new FormData();
    upstreamForm.set('media', media, media.name || (mediaType === 'audio' ? 'upload.wav' : 'upload.mp4'));
    upstreamForm.set('media_type', mediaType);
    upstreamForm.set('camera_name', 'Audio Validation');
    upstreamForm.set('class_name', 'audio-validation-lab');

    const progressUrl = `${getServiceUrl()}/anomaly/analyze-audio-progress`;
    const response = await fetch(progressUrl, {
      method: 'POST',
      body: upstreamForm,
      cache: 'no-store',
    });

    if (response.status === 404) {
      const fallbackResponse = await fetch(new URL('/api/security-alerts/analyze-sound', request.url), {
        method: 'POST',
        body: formData,
        cache: 'no-store',
      });

      const fallbackJson = await fallbackResponse.json().catch(() => ({}));
      if (!fallbackResponse.ok) {
        return NextResponse.json(
          { error: fallbackJson?.error || fallbackJson?.detail || 'Sound anomaly request failed' },
          { status: fallbackResponse.status || 500 }
        );
      }

      const payload =
        JSON.stringify({
          type: 'started',
          progress_percent: 0,
          processed_windows: 0,
          message: 'Sound analysis started',
        }) +
        '\n' +
        JSON.stringify({
          type: 'final',
          progress_percent: 100,
          processed_windows: 1,
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
        { error: body || 'Sound anomaly progress request failed' },
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
      { error: error?.message || 'Failed to start sound anomaly stream' },
      { status: 500 }
    );
  }
}
