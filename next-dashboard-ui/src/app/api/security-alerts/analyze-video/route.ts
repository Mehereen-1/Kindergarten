import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';

import {
  canAutoStartSecurityAlertService,
  ensureSecurityAlertServiceReady,
  getServiceUrl,
  getSecurityAlertPythonCandidates,
} from '@/lib/securityAlertServiceManager';

export const runtime = 'nodejs';

async function postWithRetry(url: string, buildFormData: () => FormData) {
  let lastError: unknown = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await fetch(url, {
        method: 'POST',
        body: buildFormData(),
        cache: 'no-store',
      });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Failed to connect to anomaly service');
}

async function writeTempVideo(file: File) {
  const tempDir = path.join(os.tmpdir(), 'kindergarten-security-alerts-ui');
  await fs.mkdir(tempDir, { recursive: true });
  const extension = path.extname(file.name || '') || '.mp4';
  const tempPath = path.join(tempDir, `${Date.now()}-${randomUUID()}${extension}`);
  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(tempPath, bytes);
  return tempPath;
}

async function removeTempVideo(tempPath: string | null) {
  if (!tempPath) return;
  await fs.unlink(tempPath).catch(() => undefined);
}

async function runCliFallback(videoPath: string, cameraName: string, className: string) {
  const serviceDir = path.join(process.cwd(), 'secuirty-alerts');
  const mainPath = path.join(serviceDir, 'main.py');
  let lastError = 'CLI fallback failed';

  for (const candidate of getSecurityAlertPythonCandidates()) {
    const args = [
      ...candidate.prefixArgs,
      mainPath,
      '--video',
      videoPath,
      '--camera-name',
      cameraName,
      '--class-name',
      className,
    ];

    const result = await new Promise<{ code: number | null; stdout: string; stderr: string; error?: string }>((resolve) => {
      const child = spawn(candidate.command, args, {
        cwd: serviceDir,
        windowsHide: true,
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      });

      let stdout = '';
      let stderr = '';
      let processError = '';

      child.stdout.on('data', (chunk) => {
        stdout += String(chunk);
      });

      child.stderr.on('data', (chunk) => {
        stderr += String(chunk);
      });

      child.on('error', (error) => {
        processError = error.message;
      });

      child.on('close', (code) => {
        resolve({ code, stdout, stderr, error: processError || undefined });
      });
    });

    if (result.error) {
      lastError = result.error;
      continue;
    }

    if (result.code === 0) {
      try {
        return JSON.parse(result.stdout);
      } catch {
        lastError = result.stderr || result.stdout || 'CLI fallback returned invalid JSON';
        continue;
      }
    }

    lastError = result.stderr || result.stdout || `CLI fallback exited with code ${String(result.code)}`;
  }

  throw new Error(lastError);
}

export async function POST(request: NextRequest) {
  let tempVideoPath: string | null = null;
  try {
    const formData = await request.formData();
    const video = formData.get('video');

    if (!(video instanceof File)) {
      return NextResponse.json({ error: 'Video file is required' }, { status: 400 });
    }

    const cameraName = String(formData.get('camera_name') || '').trim();
    const className = String(formData.get('class_name') || '').trim();
    const storeAlert = String(formData.get('store_alert') || 'true').trim().toLowerCase() !== 'false';
    let upstreamJson: any;
    tempVideoPath = await writeTempVideo(video);

    try {
      await ensureSecurityAlertServiceReady(90000);
      const analyzeUrl = `${getServiceUrl()}/anomaly/analyze-video`;
      const upstreamResponse = await postWithRetry(analyzeUrl, () => {
        const upstreamForm = new FormData();
        upstreamForm.set('video', video, video.name || 'upload.mp4');
        upstreamForm.set('camera_name', cameraName);
        upstreamForm.set('class_name', className);
        upstreamForm.set('notify_ingest', 'false');
        return upstreamForm;
      });

      upstreamJson = await upstreamResponse.json().catch(() => ({}));
      if (!upstreamResponse.ok) {
        throw new Error(upstreamJson?.detail || upstreamJson?.error || 'Anomaly service request failed');
      }
    } catch (serviceError) {
      if (!canAutoStartSecurityAlertService()) {
        throw serviceError;
      }

      try {
        upstreamJson = await runCliFallback(tempVideoPath, cameraName, className);
        upstreamJson = {
          ...upstreamJson,
          errors: [
            ...(Array.isArray(upstreamJson?.errors) ? upstreamJson.errors : []),
            `service_gateway_fallback: ${serviceError instanceof Error ? serviceError.message : String(serviceError)}`,
          ],
        };
      } catch (cliError) {
        throw new Error(
          [
            `service_gateway_failed: ${serviceError instanceof Error ? serviceError.message : String(serviceError)}`,
            `direct_cli_failed: ${cliError instanceof Error ? cliError.message : String(cliError)}`,
          ].join(' | ')
        );
      }
    }

    let ingest: { success?: boolean; alerted?: boolean; reason?: string; error?: string } | null = null;
    if (storeAlert && Array.isArray(upstreamJson?.alerts) && upstreamJson.alerts.length > 0) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (process.env.MODEL_ALERT_TOKEN) {
        headers['x-model-alert-token'] = process.env.MODEL_ALERT_TOKEN;
      }

      const ingestResponse = await fetch(new URL('/api/security-alerts/ingest', request.url), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          source: 'admin-panel',
          cameraName,
          className,
          alerts: upstreamJson.alerts,
          modelResults: upstreamJson.model_results || [],
          systemMetrics: upstreamJson.system_metrics || {},
          detectedAt: new Date().toISOString(),
          videoName: video.name || 'upload.mp4',
        }),
        cache: 'no-store',
      });

      ingest = await ingestResponse.json().catch(() => ({}));
      if (!ingestResponse.ok) {
        return NextResponse.json(
          {
            ...upstreamJson,
            ingest,
            error: ingest?.error || 'Alert analysis succeeded but ingest failed',
          },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      ...upstreamJson,
      ingest,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error?.message ||
          'Failed to analyze security video. Check whether the anomaly service is still starting.',
      },
      { status: 500 }
    );
  } finally {
    await removeTempVideo(tempVideoPath);
  }
}
