'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Camera, ShieldAlert, Square } from 'lucide-react';

type WebcamAlert = {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary?: string;
  confidence: number;
  triggered_by?: string[];
  metadata?: Record<string, unknown>;
};

type WebcamAnalysisResult = {
  type?: 'started' | 'frame' | 'error' | 'stopped';
  status?: 'ok' | 'warning' | 'error';
  source?: string;
  frame_index?: number;
  timestamp?: number;
  sampled?: boolean;
  current_stride?: number;
  buffered_frames?: number;
  latency_ms?: number;
  alerts?: WebcamAlert[];
  model_results?: Array<{
    model_name?: string;
    event_type?: string;
    label?: string;
    confidence?: number;
    detected?: boolean;
    frame_index?: number;
    timestamp?: number;
  }>;
  system_metrics?: {
    fps?: number;
    processing_time_ms?: number;
    processed_frames?: number;
    sampled_frames?: number;
    active_models?: string[];
  };
  errors?: string[];
  ingest?: {
    success?: boolean;
    alerted?: boolean;
    reason?: string;
    error?: string;
  } | null;
  message?: string;
};

type LiveWebcamBootstrap = {
  serviceUrl?: string;
  websocketUrl?: string;
  error?: string;
};

type SecurityAlertsWebcamTesterProps = {
  onAlertStored?: () => void | Promise<void>;
};

const FRAME_INTERVAL_MS = 66;
const VIDEO_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: 'user',
    width: { ideal: 640 },
    height: { ideal: 360 },
    frameRate: { ideal: 15, max: 20 },
  },
  audio: false,
};

function formatSeconds(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0.0s';
  return `${value.toFixed(1)}s`;
}

function formatLatency(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0ms';
  return `${Math.max(0, value).toFixed(0)}ms`;
}

function toConfidencePercent(value: number | null | undefined) {
  const raw = Number(value || 0);
  if (!Number.isFinite(raw)) return 0;
  if (raw <= 1) return Math.max(0, Math.min(100, raw * 100));
  return Math.max(0, Math.min(100, raw));
}

function buildWebSocketUrl(serviceUrl?: string, websocketUrl?: string) {
  if (websocketUrl) {
    return websocketUrl;
  }

  if (!serviceUrl) {
    throw new Error('Live webcam service URL was not provided.');
  }

  const url = new URL(serviceUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/anomaly/live-webcam`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function getTopAlert(alerts: WebcamAlert[] | null | undefined) {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return null;
  }

  return [...alerts].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0] || null;
}

export default function SecurityAlertsWebcamTester({ onAlertStored }: SecurityAlertsWebcamTesterProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const captureTimerRef = useRef<number | null>(null);
  const captureCurrentFrameRef = useRef<() => void>(() => undefined);
  const runningRef = useRef(false);
  const startingRef = useRef(false);
  const sendInFlightRef = useRef(false);
  const captureInFlightRef = useRef(false);
  const pendingCaptureRef = useRef(false);
  const runIdRef = useRef(0);
  const stoppingRef = useRef(false);

  const [starting, setStarting] = useState(false);
  const [running, setRunning] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'open' | 'error'>('idle');
  const [message, setMessage] = useState('Ready to start the webcam test.');
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState<WebcamAnalysisResult | null>(null);

  const clearCaptureTimer = useCallback(() => {
    if (captureTimerRef.current !== null) {
      window.clearInterval(captureTimerRef.current);
      captureTimerRef.current = null;
    }
  }, []);

  const stopWebcam = useCallback(
    (options?: { keepMessage?: boolean; keepError?: boolean }) => {
      runIdRef.current += 1;
      runningRef.current = false;
      startingRef.current = false;
      sendInFlightRef.current = false;
      captureInFlightRef.current = false;
      pendingCaptureRef.current = false;
      stoppingRef.current = true;

      clearCaptureTimer();

      const socket = socketRef.current;
      if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
        try {
          socket.close(1000, 'webcam test stopped');
        } catch {
          // Ignore websocket shutdown errors.
        }
      }
      socketRef.current = null;

      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      const preview = videoRef.current;
      if (preview) {
        preview.pause();
        preview.srcObject = null;
      }

      setRunning(false);
      setStarting(false);
      setProcessing(false);
      setConnectionState('idle');
      if (!options?.keepError) {
        setError('');
      }
      if (!options?.keepMessage) {
        setMessage('Webcam stopped.');
      }
      stoppingRef.current = false;
    },
    [clearCaptureTimer]
  );

  const captureCurrentFrame = useCallback(() => {
    if (!runningRef.current || startingRef.current || sendInFlightRef.current || captureInFlightRef.current) {
      pendingCaptureRef.current = true;
      return;
    }

    const video = videoRef.current;
    const socket = socketRef.current;
    const canvas = canvasRef.current;

    if (!video || !socket || socket.readyState !== WebSocket.OPEN || !canvas) {
      pendingCaptureRef.current = true;
      return;
    }

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;
    if (width <= 0 || height <= 0) {
      pendingCaptureRef.current = true;
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    if (!ctx) {
      setError('Could not prepare the webcam frame canvas.');
      setMessage('Webcam capture paused.');
      return;
    }

    pendingCaptureRef.current = false;
    captureInFlightRef.current = true;
    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        captureInFlightRef.current = false;

        if (!runningRef.current || startingRef.current) {
          return;
        }

        if (!blob || blob.size === 0) {
          setError('Could not capture a webcam frame.');
          setMessage('Webcam capture paused.');
          pendingCaptureRef.current = true;
          window.setTimeout(() => {
            if (runningRef.current) {
              captureCurrentFrameRef.current();
            }
          }, 0);
          return;
        }

        const activeSocket = socketRef.current;
        if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
          pendingCaptureRef.current = true;
          window.setTimeout(() => {
            if (runningRef.current) {
              captureCurrentFrameRef.current();
            }
          }, 0);
          return;
        }

        try {
          sendInFlightRef.current = true;
          setProcessing(true);
          activeSocket.send(blob);
        } catch (sendError) {
          sendInFlightRef.current = false;
          setProcessing(false);
          const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
          setError(errorMessage);
          setMessage('Webcam stream stopped because the frame could not be sent.');
          stopWebcam({ keepMessage: true, keepError: true });
          return;
        }
      },
      'image/jpeg',
      0.82
    );
  }, [stopWebcam]);

  useEffect(() => {
    captureCurrentFrameRef.current = captureCurrentFrame;
  }, [captureCurrentFrame]);

  const scheduleCaptureLoop = useCallback(() => {
    clearCaptureTimer();
    captureTimerRef.current = window.setInterval(() => {
      if (runningRef.current) {
        captureCurrentFrameRef.current();
      }
    }, FRAME_INTERVAL_MS);
  }, [clearCaptureTimer]);

  const handleSocketMessage = useCallback(
    async (event: MessageEvent) => {
      if (!runningRef.current) {
        return;
      }

      let payload: WebcamAnalysisResult;
      try {
        const text =
          typeof event.data === 'string'
            ? event.data
            : event.data instanceof Blob
              ? await event.data.text()
              : event.data instanceof ArrayBuffer
                ? new TextDecoder().decode(event.data)
                : JSON.stringify(event.data || {});
        payload = JSON.parse(text || '{}') as WebcamAnalysisResult;
      } catch {
        setError('Live webcam returned an unreadable response.');
        setMessage('Waiting for the next webcam frame...');
        sendInFlightRef.current = false;
        setProcessing(false);
        pendingCaptureRef.current = true;
        window.setTimeout(() => {
          if (runningRef.current) {
            captureCurrentFrameRef.current();
          }
        }, 0);
        return;
      }

      if (runIdRef.current === 0 || !runningRef.current) {
        return;
      }

      if (payload.type === 'started') {
        setConnectionState('open');
        setMessage(payload.message || 'Live webcam session started.');
        return;
      }

      if (payload.type === 'error') {
        setError(payload.error || 'Live webcam frame failed.');
        setMessage(payload.error || 'A live webcam frame failed, but the stream is still running.');
        sendInFlightRef.current = false;
        setProcessing(false);
        pendingCaptureRef.current = true;
        window.setTimeout(() => {
          if (runningRef.current) {
            captureCurrentFrameRef.current();
          }
        }, 0);
        return;
      }

      sendInFlightRef.current = false;
      setProcessing(false);

      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        setError(payload.errors.join(' | '));
      } else {
        setError('');
      }

      setLastResult(payload);
      if (payload.message) {
        setMessage(payload.message);
      } else if (payload.alerts && payload.alerts.length > 0) {
        const topAlert = getTopAlert(payload.alerts);
        if (topAlert) {
          setMessage(
            `${topAlert.summary || topAlert.type} (${toConfidencePercent(topAlert.confidence).toFixed(1)}%) detected.`
          );
        }
      } else {
        setMessage('Live webcam is running. No anomaly detected in the latest frame.');
      }

      if (payload.ingest?.alerted && onAlertStored) {
        void Promise.resolve(onAlertStored()).catch(() => undefined);
      }

      if (pendingCaptureRef.current) {
        pendingCaptureRef.current = false;
        window.setTimeout(() => {
          if (runningRef.current) {
            captureCurrentFrameRef.current();
          }
        }, 0);
      }
    },
    [onAlertStored]
  );

  const startWebcam = useCallback(async () => {
    if (startingRef.current || runningRef.current) {
      return;
    }

    startingRef.current = true;
    setStarting(true);
    setConnectionState('connecting');
    setError('');
    setMessage('Requesting webcam access...');
    setLastResult(null);

    const sessionId = runIdRef.current + 1;
    runIdRef.current = sessionId;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support webcam access.');
      }

      const stream = await navigator.mediaDevices.getUserMedia(VIDEO_CONSTRAINTS);
      if (runIdRef.current !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;

      const preview = videoRef.current;
      if (preview) {
        preview.srcObject = stream;
        preview.muted = true;
        preview.playsInline = true;
        await preview.play().catch(() => undefined);
      }

      setMessage('Preparing the live anomaly service...');
      const bootstrapResponse = await fetch('/api/security-alerts/live-webcam', {
        method: 'GET',
        cache: 'no-store',
      });
      const bootstrap = (await bootstrapResponse.json().catch(() => ({}))) as LiveWebcamBootstrap;
      if (!bootstrapResponse.ok) {
        throw new Error(bootstrap.error || 'Unable to prepare the live webcam service.');
      }

      const websocketUrl = buildWebSocketUrl(bootstrap.serviceUrl, bootstrap.websocketUrl);
      const socketUrl = new URL(websocketUrl);
      socketUrl.searchParams.set('camera_name', 'Webcam Security Camera');
      socketUrl.searchParams.set('class_name', 'webcam-live-test');
      socketUrl.searchParams.set('notify_ingest', 'true');

      const socket = new WebSocket(socketUrl.toString());
      socketRef.current = socket;

      socket.onopen = () => {
        if (runIdRef.current !== sessionId) {
          try {
            socket.close(1000, 'stale session');
          } catch {
            // Ignore close failures for stale sessions.
          }
          return;
        }

        runningRef.current = true;
        setRunning(true);
        setStarting(false);
        setConnectionState('open');
        setMessage('Live webcam connected. Streaming frames into the anomaly service.');
        scheduleCaptureLoop();
        captureCurrentFrameRef.current();
      };

      socket.onmessage = (event) => {
        if (runIdRef.current !== sessionId) {
          return;
        }

        void handleSocketMessage(event).catch(() => undefined);
      };

      socket.onerror = () => {
        if (runIdRef.current !== sessionId) {
          return;
        }

        setError('The live webcam connection encountered an error.');
        setMessage('Live webcam stream failed.');
        stopWebcam({ keepMessage: true, keepError: true });
        setConnectionState('error');
      };

      socket.onclose = () => {
        if (runIdRef.current !== sessionId) {
          return;
        }

        const unexpectedClose = !stoppingRef.current;
        if (unexpectedClose) {
          setError('Live webcam connection closed unexpectedly.');
          setMessage('Live webcam stream stopped.');
        }
        stopWebcam({ keepMessage: true, keepError: true });
        if (unexpectedClose) {
          setConnectionState('error');
        }
      };
    } catch (startError) {
      const errorMessage = startError instanceof Error ? startError.message : String(startError);
      stopWebcam({ keepMessage: true, keepError: true });
      setError(errorMessage);
      setMessage('Webcam could not be started.');
      setConnectionState('error');
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }, [handleSocketMessage, scheduleCaptureLoop, stopWebcam]);

  useEffect(() => {
    return () => {
      stopWebcam({ keepMessage: true });
    };
  }, [stopWebcam]);

  const alertCount = Array.isArray(lastResult?.alerts) ? lastResult!.alerts!.length : 0;
  const topResult = getTopAlert(lastResult?.alerts);
  const statusLabel = starting
    ? 'Connecting'
    : connectionState === 'open'
      ? processing
        ? 'Streaming and analyzing'
        : 'Streaming'
      : connectionState === 'connecting'
        ? 'Connecting'
        : connectionState === 'error'
          ? 'Error'
          : 'Idle';
  const latencyLabel = formatLatency(lastResult?.latency_ms || lastResult?.system_metrics?.processing_time_ms);
  const strideLabel = String(lastResult?.current_stride || 1);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-3 shadow-sm">
        <video ref={videoRef} autoPlay muted playsInline className="h-64 w-full rounded-xl bg-black object-cover" />
        <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <Camera className="h-4 w-4" />
            Live preview
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void startWebcam()}
              disabled={starting || running}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4" />
              {starting ? 'Starting...' : 'Start webcam test'}
            </button>
            <button
              type="button"
              onClick={() => stopWebcam()}
              disabled={!running && !starting}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{statusLabel}</p>
          <p className="mt-2 text-sm text-slate-700">{message}</p>
          <p className="mt-1 text-xs text-slate-500">
            Live frames are streamed directly into the anomaly service over a persistent websocket. The backend keeps
            the temporal model state, so the stream stays responsive without turning into a batch upload flow.
          </p>
          {error ? <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p> : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest result</p>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                lastResult?.status === 'ok'
                  ? 'bg-emerald-100 text-emerald-700'
                  : lastResult?.status === 'warning'
                    ? 'bg-amber-100 text-amber-700'
                    : lastResult?.status === 'error'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-slate-100 text-slate-600'
              }`}
            >
              {lastResult?.status || 'waiting'}
            </span>
          </div>

          {lastResult ? (
            <div className="mt-3 space-y-2 text-sm text-slate-700">
              <p>
                Source: <span className="font-semibold">{lastResult.source || 'webcam'}</span>
              </p>
              <p>
                Frame: <span className="font-semibold">{lastResult.frame_index ?? 0}</span>
              </p>
              <p>
                Time: <span className="font-semibold">{formatSeconds(lastResult.timestamp)}</span>
              </p>
              <p>
                Alerts: <span className="font-semibold">{alertCount}</span>
              </p>
              <p>
                Latency: <span className="font-semibold">{latencyLabel}</span>
              </p>
              <p>
                Stride: <span className="font-semibold">{strideLabel}</span>
              </p>
              {topResult ? (
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="flex items-center gap-2 font-semibold text-slate-900">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    {topResult.summary || topResult.type}
                  </p>
                  <p className="text-xs text-slate-500">
                    Confidence: {toConfidencePercent(topResult.confidence).toFixed(1)}%
                  </p>
                </div>
              ) : (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  No alert in the latest frame.
                </div>
              )}
              {Array.isArray(lastResult.errors) && lastResult.errors.length > 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {lastResult.errors.join(' | ')}
                </div>
              ) : null}
              {Array.isArray(lastResult.model_results) && lastResult.model_results.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {lastResult.model_results
                    .slice(0, 3)
                    .map((row) => `${row.model_name || 'model'}: ${toConfidencePercent(row.confidence).toFixed(1)}%`)
                    .join(' | ')}
                </div>
              ) : null}
              {lastResult.ingest ? (
                <div
                  className={`rounded-xl px-3 py-2 text-xs ${
                    lastResult.ingest.alerted
                      ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
                      : lastResult.ingest.error
                        ? 'border border-rose-200 bg-rose-50 text-rose-700'
                        : 'border border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {lastResult.ingest.alerted
                    ? 'Alert stored in the system.'
                    : lastResult.ingest.error
                      ? `Ingest error: ${lastResult.ingest.error}`
                      : lastResult.ingest.reason || 'Alert not stored on this frame.'}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">No webcam analysis yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
