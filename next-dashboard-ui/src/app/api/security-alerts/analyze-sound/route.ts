import { NextRequest, NextResponse } from 'next/server';

import {
  ensureSecurityAlertAudioServiceReady,
  getServiceUrl,
} from '@/lib/securityAlertServiceManager';

export const runtime = 'nodejs';

type UpstreamModelResult = {
  model_name?: string;
  event_type?: string;
  label?: string;
  confidence?: number;
  detected?: boolean;
  frame_index?: number;
  timestamp?: number;
  metadata?: Record<string, unknown>;
};

function isAudioExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  return (
    lower.endsWith('.wav') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.m4a') ||
    lower.endsWith('.aac') ||
    lower.endsWith('.flac') ||
    lower.endsWith('.ogg')
  );
}

function toPercent(value: number) {
  if (!Number.isFinite(value)) return 0;
  if (value <= 1) return Math.max(0, Math.min(100, value * 100));
  return Math.max(0, Math.min(100, value));
}

function pickAudioRows(modelResults: UpstreamModelResult[]) {
  return modelResults.filter((row) => String(row.model_name || '').toLowerCase() === 'audio_security_model');
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const media = formData.get('media');
    if (!(media instanceof File)) {
      return NextResponse.json({ error: 'Media file is required' }, { status: 400 });
    }

    const declaredType = String(formData.get('media_type') || '').trim().toLowerCase();
    const autoType = media.type.startsWith('audio/') || isAudioExtension(media.name) ? 'audio' : 'video';
    const mediaType = declaredType === 'audio' || declaredType === 'video' ? declaredType : autoType;

    await ensureSecurityAlertAudioServiceReady(90000);

    const upstreamForm = new FormData();
    const endpoint = mediaType === 'audio' ? '/anomaly/analyze-audio' : '/anomaly/analyze-video';

    if (mediaType === 'audio') {
      upstreamForm.set('audio', media, media.name || 'upload.wav');
    } else {
      upstreamForm.set('video', media, media.name || 'upload.mp4');
      upstreamForm.set('notify_ingest', 'false');
    }

    upstreamForm.set('camera_name', 'Audio Validation');
    upstreamForm.set('class_name', 'audio-validation-lab');

    const response = await fetch(`${getServiceUrl()}${endpoint}`, {
      method: 'POST',
      body: upstreamForm,
      cache: 'no-store',
    });

    const upstreamJson = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json(
        { error: upstreamJson?.detail || upstreamJson?.error || 'Sound anomaly request failed' },
        { status: response.status || 500 }
      );
    }

    const modelResults: UpstreamModelResult[] = Array.isArray(upstreamJson?.model_results)
      ? upstreamJson.model_results
      : [];
    const audioRows = pickAudioRows(modelResults);

    if (audioRows.length === 0) {
      const returnedModelNames = modelResults
        .map((row) => String(row.model_name || '').trim())
        .filter(Boolean)
        .reduce<string[]>((acc, name) => {
          if (acc.indexOf(name) < 0) {
            acc.push(name);
          }
          return acc;
        }, []);

      return NextResponse.json({
        verdict: 'unavailable',
        confidenceRaw: 0,
        confidencePercent: 0,
        sourceMode: mediaType === 'audio' ? 'audio-file' : 'video-extracted-audio',
        reason: returnedModelNames.length
          ? `No audio model rows were returned. Backend models: ${returnedModelNames.join(', ')}.`
          : 'No audio model rows were returned by the backend.',
        audioSummary: {
          rows: 0,
          detectedRows: 0,
          topLabel: 'audio_unavailable',
          topEventType: 'audio_unavailable',
        },
        result: {
          status: 'warning',
          frame_index: upstreamJson?.frame_index ?? 0,
          timestamp: upstreamJson?.timestamp ?? 0,
          errors: [
            ...(Array.isArray(upstreamJson?.errors) ? upstreamJson.errors : []),
            'Audio model did not return any rows. The security-alert service may be running without the TensorFlow audio stack.',
          ],
          audio_model_results: audioRows,
        },
      });
    }

    const detectedRows = audioRows.filter((row) => Boolean(row.detected));
    const topAudioRow = [...audioRows].sort(
      (a, b) => Number(b.confidence || 0) - Number(a.confidence || 0)
    )[0];

    const verdict = detectedRows.length > 0 ? 'anomaly' : 'normal';
    const confidenceRaw = Number(topAudioRow?.confidence || 0);

    return NextResponse.json({
      verdict,
      confidenceRaw,
      confidencePercent: toPercent(confidenceRaw),
      sourceMode: mediaType === 'audio' ? 'audio-file' : 'video-extracted-audio',
      audioSummary: {
        rows: audioRows.length,
        detectedRows: detectedRows.length,
        topLabel: topAudioRow?.label || 'security_audio',
        topEventType: topAudioRow?.event_type || 'security_audio',
      },
      result: {
        status: upstreamJson?.status || 'ok',
        frame_index: upstreamJson?.frame_index ?? 0,
        timestamp: upstreamJson?.timestamp ?? 0,
        errors: Array.isArray(upstreamJson?.errors) ? upstreamJson.errors : [],
        audio_model_results: audioRows,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to analyze sound anomaly' },
      { status: 500 }
    );
  }
}
