'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, Clock3, Mail, ShieldAlert } from 'lucide-react';

type AlertRole = 'admin' | 'teacher';
type AlertSeverity = 'critical' | 'high' | 'medium';
type ScanState = 'idle' | 'scanning' | 'done' | 'error';

type AlertItem = {
  id: string;
  title: string;
  type: string;
  severity: AlertSeverity;
  cameraName: string;
  className: string;
  detectedAt: string;
  confidence: number;
  emailStatus: 'sent' | 'pending' | 'unknown';
  webStatus: 'sent' | 'pending' | 'unknown';
  assignedTo: string;
  videoUrl?: string;
  videoName?: string;
  playbackAtSec?: number;
  source?: 'server';
};

type NoticeApiItem = {
  _id: string;
  title?: string;
  description?: string;
  createdAt?: string;
  date?: string;
  type?: string;
  targetRole?: string;
  metadata?: {
    label?: string;
    confidence?: number;
    cameraName?: string;
    className?: string;
    imageUrl?: string;
    videoUrl?: string;
    videoName?: string;
    playbackAtSec?: number;
    detectedAt?: string;
    emailSent?: boolean;
    webSent?: boolean;
  };
};

type StreamScanResult = {
  detected: boolean;
  label: string;
  confidence: number;
  overallMax: number;
  totalDetections: number;
  topDetections: { classId: number; score: number }[];
};

type ClassroomStream = {
  id: string;
  className: string;
  cameraName: string;
  videoUrl: string;
  videoName: string;
  scanState: ScanState;
  scanResult: StreamScanResult | null;
  message: string;
  isPaused: boolean;
  lastAlertAt: number;
};

const ALERT_AUTO_GENERATE_THRESHOLD = 0.1;
const UI_CONFIDENCE_REDUCTION_POINTS = 12;
const ALERT_COOLDOWN_MS = 15000;
const AUTO_SCAN_INTERVAL_MS = 3000;

const CLASSROOM_BLUEPRINT: Array<Pick<ClassroomStream, 'id' | 'className' | 'cameraName'>> = [
  { id: 'star-kg', className: 'star (kg)', cameraName: 'Star Classroom Camera' },
  { id: 'moon-kg', className: 'moon (kg)', cameraName: 'Moon Classroom Camera' },
  { id: 'sun-kg', className: 'sun (kg)', cameraName: 'Sun Classroom Camera' },
  { id: 'venus-kg', className: 'venus (kg)', cameraName: 'Venus Classroom Camera' },
  { id: 'mars-kg', className: 'mars (kg)', cameraName: 'Mars Classroom Camera' },
  { id: 'jupiter-kg', className: 'jupiter (kg)', cameraName: 'Jupiter Classroom Camera' },
];

function createInitialStreams(): ClassroomStream[] {
  return CLASSROOM_BLUEPRINT.map((item) => ({
    ...item,
    videoUrl: '',
    videoName: '',
    scanState: 'idle',
    scanResult: null,
    message: '',
    isPaused: false,
    lastAlertAt: 0,
  }));
}

function adjustDisplayedPercent(rawPercent: number) {
  return Math.max(0, Math.min(100, rawPercent - UI_CONFIDENCE_REDUCTION_POINTS));
}

function displayAlertTitle(title: string, rawPercent: number) {
  const adjusted = Math.round(adjustDisplayedPercent(rawPercent));
  const stripped = title.replace(/\s*\(\d+(?:\.\d+)?%\)\s*$/, '').trim();
  return `${stripped} (${adjusted}%)`;
}

function mapAssignedTo(targetRole?: string) {
  if (targetRole === 'admin') return 'Admin Team';
  if (targetRole === 'teacher') return 'Teachers';
  if (targetRole === 'parent') return 'Parents';
  if (targetRole === 'student') return 'Students';
  if (targetRole === 'all') return 'All Users';
  return 'Unknown';
}

function mapDeliveryStatus(value: unknown): 'sent' | 'pending' | 'unknown' {
  if (value === true) return 'sent';
  if (value === false) return 'pending';
  return 'unknown';
}

function mapNoticeToAlert(notice: NoticeApiItem): AlertItem {
  const confidenceScore = Number(notice?.metadata?.confidence || 0);
  const confidencePercent = confidenceScore > 1 ? confidenceScore : Math.round(confidenceScore * 100);
  const severity: AlertSeverity = confidencePercent >= 90 ? 'critical' : confidencePercent >= 80 ? 'high' : 'medium';

  return {
    id: String(notice._id),
    title: notice.title || 'Security Alert',
    type: notice.metadata?.label || 'mobile_phone',
    severity,
    cameraName: notice.metadata?.cameraName || 'Unknown Camera',
    className: notice.metadata?.className || 'Unknown Area',
    detectedAt: notice.metadata?.detectedAt || notice.date || notice.createdAt || new Date().toISOString(),
    confidence: confidencePercent,
    emailStatus: mapDeliveryStatus(notice.metadata?.emailSent),
    webStatus: mapDeliveryStatus(notice.metadata?.webSent),
    assignedTo: mapAssignedTo(notice.targetRole),
    videoUrl: notice.metadata?.videoUrl,
    videoName: notice.metadata?.videoName,
    playbackAtSec: Number(notice.metadata?.playbackAtSec || 0),
    source: 'server',
  };
}

export default function SecurityAlertsWorkspace({ role }: { role: AlertRole }) {
  const [streams, setStreams] = useState<ClassroomStream[]>(() => createInitialStreams());
  const [serverAlerts, setServerAlerts] = useState<AlertItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [focusStreamId, setFocusStreamId] = useState<string | null>(null);

  const incidentModalPlayerRef = useRef<HTMLVideoElement | null>(null);
  const streamPlayersRef = useRef<Record<string, HTMLVideoElement | null>>({});
  const scanningLockRef = useRef<Record<string, boolean>>({});
  const streamsRef = useRef<ClassroomStream[]>(streams);

  useEffect(() => {
    streamsRef.current = streams;
  }, [streams]);

  const sortedServerAlerts = useMemo(() => {
    return [...serverAlerts].sort((a, b) => {
      const left = new Date(a.detectedAt).getTime() || 0;
      const right = new Date(b.detectedAt).getTime() || 0;
      return right - left;
    });
  }, [serverAlerts]);

  const summary = useMemo(() => {
    const base = role === 'teacher'
      ? sortedServerAlerts.filter((alert) => alert.assignedTo !== 'Admin Team')
      : sortedServerAlerts;

    return {
      total: base.length,
      unresolved: base.length,
      critical: base.filter((alert) => alert.severity === 'critical').length,
      emailsPending: base.filter((alert) => alert.emailStatus !== 'sent').length,
    };
  }, [sortedServerAlerts, role]);

  const visibleAlerts = useMemo(() => {
    return role === 'teacher'
      ? sortedServerAlerts.filter((alert) => alert.assignedTo !== 'Admin Team')
      : sortedServerAlerts;
  }, [role, sortedServerAlerts]);

  const focusedStream = useMemo(
    () => streams.find((stream) => stream.id === focusStreamId) || null,
    [streams, focusStreamId]
  );

  const updateStream = useCallback((id: string, patch: Partial<ClassroomStream>) => {
    setStreams((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }, []);

  const refreshAlertsFromServer = useCallback(async () => {
    const response = await fetch(`/api/notices?role=${role}&limit=300`, { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) {
      return;
    }

    const notices = Array.isArray(data?.notices) ? data.notices : [];
    const anomalies = notices
      .filter((notice: NoticeApiItem) => notice?.type === 'anomaly-alert')
      .map((notice: NoticeApiItem) => mapNoticeToAlert(notice));

    setServerAlerts(anomalies);
  }, [role]);

  useEffect(() => {
    let mounted = true;

    const sync = async () => {
      try {
        await refreshAlertsFromServer();
      } catch {
        /* ignore polling errors */
      }
    };

    void sync();
    const timer = setInterval(() => {
      if (mounted) {
        void sync();
      }
    }, 15000);

    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [refreshAlertsFromServer]);

  useEffect(() => {
    return () => {
      for (const stream of streamsRef.current) {
        if (stream.videoUrl) {
          URL.revokeObjectURL(stream.videoUrl);
        }
      }
    };
  }, []);

  const ingestAlertForStream = useCallback(
    async (stream: ClassroomStream, confidence: number, playbackAtSec: number) => {
      const now = Date.now();
      if (now - stream.lastAlertAt < ALERT_COOLDOWN_MS) {
        return;
      }

      updateStream(stream.id, { lastAlertAt: now });

      const ingestResponse = await fetch('/api/security-alerts/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          label: 'mobile phone',
          confidence,
          cameraName: stream.cameraName,
          className: stream.className,
          videoName: stream.videoName,
          playbackAtSec,
          detectedAt: new Date().toISOString(),
        }),
      });

      if (!ingestResponse.ok) {
        const body = await ingestResponse.json().catch(() => ({}));
        updateStream(stream.id, {
          message: `Failed to save alert: ${body?.error || ingestResponse.statusText}`,
        });
        return;
      }

      updateStream(stream.id, {
        message: `Alert auto-generated at ${playbackAtSec}s with confidence ${Math.round(
          adjustDisplayedPercent(confidence * 100)
        )}%.`,
      });
      await refreshAlertsFromServer();
    },
    [refreshAlertsFromServer, updateStream]
  );

  const scanOneStream = useCallback(
    async (streamId: string) => {
      if (scanningLockRef.current[streamId]) return;

      const stream = streamsRef.current.find((item) => item.id === streamId);
      if (!stream || !stream.videoUrl || stream.isPaused) return;

      const player = streamPlayersRef.current[streamId];
      if (!player || player.readyState < 2) return;

      scanningLockRef.current[streamId] = true;
      updateStream(streamId, { scanState: 'scanning' });

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 640;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context unavailable');
        ctx.drawImage(player, 0, 0, 640, 640);

        const imageData = ctx.getImageData(0, 0, 640, 640);
        const bytes = new Uint8Array(imageData.data.buffer);
        let binary = '';
        for (let i = 0; i < bytes.length; i += 65536) {
          binary += String.fromCharCode(...(bytes.subarray(i, i + 65536) as unknown as number[]));
        }
        const base64 = btoa(binary);

        const response = await fetch('/api/security-alerts/run-inference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pixels: base64, width: 640, height: 640 }),
        });

        const result = await response.json();
        if (!response.ok) {
          updateStream(streamId, { scanState: 'error', message: `Model error: ${result.error}` });
          return;
        }

        const confidence = Number(result.confidence || 0);
        const adjusted = adjustDisplayedPercent(confidence * 100);

        updateStream(streamId, {
          scanState: 'done',
          scanResult: result,
          message: result.detected
            ? `Detected mobile pattern: ${adjusted.toFixed(1)}%`
            : `No mobile detected (max ${adjustDisplayedPercent(Number(result.overallMax || 0) * 100).toFixed(1)}%)`,
        });

        if (result.detected && confidence >= ALERT_AUTO_GENERATE_THRESHOLD) {
          const latest = streamsRef.current.find((item) => item.id === streamId);
          const playbackAtSec = Math.max(0, Math.floor(player.currentTime || 0));
          if (latest) {
            await ingestAlertForStream(latest, confidence, playbackAtSec);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        updateStream(streamId, { scanState: 'error', message: `Scan failed: ${message}` });
      } finally {
        scanningLockRef.current[streamId] = false;
      }
    },
    [ingestAlertForStream, updateStream]
  );

  useEffect(() => {
    if (role !== 'admin') return;

    const tick = () => {
      for (const stream of streamsRef.current) {
        if (stream.videoUrl && !stream.isPaused) {
          void scanOneStream(stream.id);
        }
      }
    };

    tick();
    const timer = setInterval(tick, AUTO_SCAN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [role, scanOneStream]);

  useEffect(() => {
    if (!selectedAlert || !incidentModalPlayerRef.current) return;

    const player = incidentModalPlayerRef.current;
    const jumpTo = Number(selectedAlert.playbackAtSec || 0);

    const seekWhenReady = () => {
      try {
        player.currentTime = jumpTo;
      } catch {
        /* no-op */
      }
    };

    if (player.readyState >= 1) {
      seekWhenReady();
      return;
    }

    player.addEventListener('loadedmetadata', seekWhenReady, { once: true });
    return () => player.removeEventListener('loadedmetadata', seekWhenReady);
  }, [selectedAlert]);

  const handleVideoUpload = (streamId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const current = streamsRef.current.find((item) => item.id === streamId);
    if (current?.videoUrl) {
      URL.revokeObjectURL(current.videoUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    updateStream(streamId, {
      videoUrl: objectUrl,
      videoName: file.name,
      scanState: 'idle',
      scanResult: null,
      message: `Loaded footage: ${file.name}. Auto-scanning active.`,
      isPaused: false,
    });
  };

  const toggleStreamPause = (streamId: string) => {
    const stream = streamsRef.current.find((item) => item.id === streamId);
    if (!stream) return;
    const nextPaused = !stream.isPaused;
    updateStream(streamId, {
      isPaused: nextPaused,
      message: nextPaused ? 'Auto-scanning stopped.' : 'Auto-scanning resumed.',
    });
  };

  const setStreamPlayer = (streamId: string, element: HTMLVideoElement | null) => {
    streamPlayersRef.current[streamId] = element;
  };

  return (
    <div className="space-y-6 p-4 md:p-6 lg:p-8">
      <section className="rounded-3xl bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 p-6 text-white shadow-xl">
        <div className="max-w-3xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4" />
            Security Alerts
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">Anomaly Alerts</h1>
          <p className="mt-3 max-w-2xl text-sm text-orange-50 md:text-base">
            Concurrent classroom CCTV monitoring with automatic anomaly detection.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Total alerts today</p>
            <AlertTriangle className="h-5 w-5 text-red-500" />
          </div>
          <p className="mt-4 text-3xl font-black text-slate-900">{summary.total}</p>
        </div>

        <div className="rounded-2xl border border-orange-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Unresolved alerts</p>
            <Clock3 className="h-5 w-5 text-orange-500" />
          </div>
          <p className="mt-4 text-3xl font-black text-slate-900">{summary.unresolved}</p>
        </div>

        <div className="rounded-2xl border border-rose-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Critical detections</p>
            <Bell className="h-5 w-5 text-rose-500" />
          </div>
          <p className="mt-4 text-3xl font-black text-slate-900">{summary.critical}</p>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-500">Emails pending</p>
            <Mail className="h-5 w-5 text-blue-500" />
          </div>
          <p className="mt-4 text-3xl font-black text-slate-900">{summary.emailsPending}</p>
        </div>
      </section>

      {role === 'admin' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black text-slate-900">All Classroom CCTV Feeds</h2>
            <p className="text-sm text-slate-500">All classes are scanned in parallel every 3 seconds.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
            {streams.map((stream) => (
              <article key={stream.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-black text-slate-900">{stream.className}</h3>
                    <p className="text-xs text-slate-500">{stream.cameraName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFocusStreamId(stream.id)}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Open
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStreamPause(stream.id)}
                      disabled={!stream.videoUrl}
                      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40"
                    >
                      {stream.isPaused ? 'Resume' : 'Stop'}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-900 p-2">
                  {stream.videoUrl ? (
                    <video
                      ref={(el) => setStreamPlayer(stream.id, el)}
                      controls
                      autoPlay
                      muted
                      className="h-40 w-full rounded-lg bg-black object-contain"
                      src={stream.videoUrl}
                    />
                  ) : (
                    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-700 text-xs text-slate-400">
                      Upload classroom video feed
                    </div>
                  )}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Upload footage</label>
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(event) => handleVideoUpload(stream.id, event)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-slate-500">Confidence output</label>
                    <div className="flex h-[34px] items-center rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700">
                      {stream.scanResult
                        ? stream.scanResult.detected
                          ? `${adjustDisplayedPercent(stream.scanResult.confidence * 100).toFixed(1)}%`
                          : `No mobile (${adjustDisplayedPercent(stream.scanResult.overallMax * 100).toFixed(1)}%)`
                        : 'Waiting for scan'}
                    </div>
                  </div>
                </div>

                {stream.scanResult && stream.scanResult.topDetections.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {stream.scanResult.topDetections.slice(0, 3).map((det, idx) => (
                      <span
                        key={`${stream.id}-${idx}`}
                        className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                      >
                        c{det.classId}: {adjustDisplayedPercent(det.score * 100).toFixed(1)}%
                      </span>
                    ))}
                  </div>
                )}

                {stream.message && (
                  <p className="mt-2 rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-600">{stream.message}</p>
                )}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black text-slate-900">Real anomaly queue</h2>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
            {visibleAlerts.length} alerts
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {visibleAlerts.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
              No anomaly alerts yet.
            </div>
          )}

          {visibleAlerts.map((alert) => (
            <article key={alert.id} className="rounded-2xl border border-slate-200 p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-black text-slate-900">{displayAlertTitle(alert.title, alert.confidence)}</h3>
                  <p className="mt-1 text-sm text-slate-500">{alert.className} • {alert.cameraName}</p>
                </div>
                <p className="text-2xl font-black text-slate-900">{Math.round(adjustDisplayedPercent(alert.confidence))}%</p>
              </div>

              <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Detected at</p>
                  <p className="mt-1 font-semibold text-slate-800">{alert.detectedAt}</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Email</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {alert.emailStatus === 'unknown' ? 'Unknown' : alert.emailStatus === 'sent' ? 'Sent' : 'Pending'}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-3 py-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Website notification</p>
                  <p className="mt-1 font-semibold text-slate-800">
                    {alert.webStatus === 'unknown' ? 'Unknown' : alert.webStatus === 'sent' ? 'Pushed' : 'Queued'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedAlert(alert)}
                className="mt-4 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                View incident
              </button>
            </article>
          ))}
        </div>
      </section>

      {focusStreamId && focusedStream && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="w-full max-w-5xl rounded-3xl bg-white p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900">{focusedStream.className} Live Feed</h3>
                <p className="text-sm text-slate-500">{focusedStream.cameraName}</p>
              </div>
              <button
                type="button"
                onClick={() => setFocusStreamId(null)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-950 p-3">
              {focusedStream.videoUrl ? (
                <video
                  controls
                  autoPlay
                  className="h-[520px] w-full rounded-xl bg-black object-contain"
                  src={focusedStream.videoUrl}
                />
              ) : (
                <div className="flex h-[520px] items-center justify-center rounded-xl border border-dashed border-slate-700 text-slate-300">
                  No feed loaded for this classroom.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Incident Viewer</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedAlert.cameraName} • {selectedAlert.className} • detection at {selectedAlert.playbackAtSec || 0}s
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            {selectedAlert.videoUrl ? (
              <video
                ref={incidentModalPlayerRef}
                controls
                className="h-[420px] w-full rounded-2xl bg-black object-contain"
                src={selectedAlert.videoUrl}
              />
            ) : (
              <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed border-slate-300 text-slate-500">
                No linked CCTV footage for this alert.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
