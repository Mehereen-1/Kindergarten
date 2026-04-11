'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, Clock3, Mail, ShieldAlert } from 'lucide-react';

type AlertRole = 'admin' | 'teacher';
type AlertSeverity = 'critical' | 'high' | 'medium' | 'low';
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
    severity?: AlertSeverity | 'low';
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
  status: 'ok' | 'warning' | 'error';
  alerts: Array<{
    type: string;
    severity: AlertSeverity;
    summary: string;
    confidence: number;
    triggered_by?: string[];
    metadata?: Record<string, unknown>;
  }>;
  model_results: Array<{
    model_name: string;
    event_type: string;
    label: string;
    confidence: number;
    detected: boolean;
    frame_index: number;
    timestamp: number;
    metadata?: Record<string, unknown>;
  }>;
  system_metrics?: {
    fps?: number;
    processing_time_ms?: number;
    active_models?: string[];
  };
  errors?: string[];
  progress_percent?: number;
  processed_frames?: number;
  total_frames?: number | null;
};

type ServiceControlStatus = {
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  serviceUrl: string;
  health: any;
  logs: string[];
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
  isAnalyzing: boolean;
  progressPercent?: number;
};

const UI_CONFIDENCE_REDUCTION_POINTS = 12;

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
    isAnalyzing: false,
    progressPercent: 0,
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

function formatSeconds(value: number | null | undefined) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '0.0s';
  return `${value.toFixed(1)}s`;
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
  const severityRaw = String(notice?.metadata?.severity || '').toLowerCase();
  const severity: AlertSeverity =
    severityRaw === 'critical'
      ? 'critical'
      : severityRaw === 'high'
        ? 'high'
        : confidencePercent >= 90
          ? 'critical'
          : confidencePercent >= 80
            ? 'high'
            : 'medium';

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

function isLocalServiceUrl(serviceUrl?: string | null) {
  if (!serviceUrl) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|::1)(?::\d+)?(?:\/|$)/i.test(serviceUrl);
}

export default function SecurityAlertsWorkspace({ role }: { role: AlertRole }) {
  const [streams, setStreams] = useState<ClassroomStream[]>(() => createInitialStreams());
  const [serverAlerts, setServerAlerts] = useState<AlertItem[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<AlertItem | null>(null);
  const [focusStreamId, setFocusStreamId] = useState<string | null>(null);
  const [serviceStatus, setServiceStatus] = useState<ServiceControlStatus | null>(null);
  const [serviceBusy, setServiceBusy] = useState(false);
  const [serviceMessage, setServiceMessage] = useState('');
  const serviceIsLocal = serviceStatus ? isLocalServiceUrl(serviceStatus.serviceUrl) : true;

  const incidentModalPlayerRef = useRef<HTMLVideoElement | null>(null);
  const uploadedFilesRef = useRef<Record<string, File | null>>({});
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

  const primaryConfidence = useCallback((result: StreamScanResult | null) => {
    if (!result) return null;
    const topAlert = [...(result.alerts || [])].sort((a, b) => b.confidence - a.confidence)[0];
    if (topAlert) return topAlert.confidence;
    const topModel = [...(result.model_results || [])]
      .filter((item) => item.detected)
      .sort((a, b) => b.confidence - a.confidence)[0];
    return topModel?.confidence ?? null;
  }, []);

  const refreshServiceStatus = useCallback(async () => {
    const response = await fetch('/api/security-alerts/service/status', { cache: 'no-store' });
    const data = await response.json().catch(() => null);
    if (response.ok && data) {
      setServiceStatus(data);
      return data;
    }
    throw new Error(data?.error || 'Failed to fetch anomaly service status');
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
        if (role === 'admin') {
          await refreshServiceStatus();
        }
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
  }, [refreshAlertsFromServer, refreshServiceStatus, role]);

  useEffect(() => {
    return () => {
      for (const stream of streamsRef.current) {
        if (stream.videoUrl) {
          URL.revokeObjectURL(stream.videoUrl);
        }
      }
    };
  }, []);

  const analyzeOneStream = useCallback(
    async (streamId: string) => {
      const stream = streamsRef.current.find((item) => item.id === streamId);
      const file = uploadedFilesRef.current[streamId];
      if (!stream || !file) return;

      updateStream(streamId, {
        scanState: 'scanning',
        isAnalyzing: true,
        progressPercent: 0,
        message: 'Starting streamed anomaly analysis...',
      });

      try {
        const formData = new FormData();
        formData.set('video', file);
        formData.set('camera_name', stream.cameraName);
        formData.set('class_name', stream.className);
        const response = await fetch('/api/security-alerts/analyze-video-progress', {
          method: 'POST',
          body: formData,
        });
        if (!response.ok || !response.body) {
          const body = await response.json().catch(() => ({}));
          updateStream(streamId, {
            scanState: 'error',
            isAnalyzing: false,
            message: `Analysis failed: ${body?.error || response.statusText}`,
          });
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;
            let event: any = null;
            try {
              event = JSON.parse(trimmed);
            } catch {
              continue;
            }

            if (event.type === 'started') {
              updateStream(streamId, {
                message: event.message || 'Video analysis started...',
                progressPercent: Number(event.progress_percent || 0),
              });
              continue;
            }

            if (event.type === 'progress') {
              const partialResult: StreamScanResult = {
                status: 'ok',
                alerts: Array.isArray(event.alerts) ? event.alerts : [],
                model_results: Array.isArray(event.model_results) ? event.model_results : [],
                system_metrics: undefined,
                errors: Array.isArray(event.errors) ? event.errors : [],
                progress_percent: Number(event.progress_percent || 0),
                processed_frames: Number(event.processed_frames || 0),
                total_frames: event.total_frames ?? null,
              };

              const latestAlert = partialResult.alerts[0];
              const progressText =
                partialResult.total_frames && partialResult.total_frames > 0
                  ? `${partialResult.processed_frames}/${partialResult.total_frames} frames`
                  : `${partialResult.processed_frames} frames`;

              updateStream(streamId, {
                scanResult: partialResult,
                progressPercent: partialResult.progress_percent || 0,
                message: latestAlert
                  ? `Detected ${latestAlert.type} while processing (${progressText})`
                  : `Analyzing video... ${progressText}`,
              });
              continue;
            }

            if (event.type === 'final') {
              const result = event.result || {};
              const alertCount = Array.isArray(result?.alerts) ? result.alerts.length : 0;
              const topAlert = Array.isArray(result?.alerts)
                ? [...result.alerts].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0]
                : null;
              const topMessage = topAlert
                ? `${topAlert.summary} (${adjustDisplayedPercent(Number(topAlert.confidence || 0) * 100).toFixed(1)}%)`
                : 'No alert raised for this clip.';

              updateStream(streamId, {
                scanState: 'done',
                isAnalyzing: false,
                scanResult: { ...result, progress_percent: 100, processed_frames: result.frame_index, total_frames: result.frame_index },
                progressPercent: 100,
                message:
                  alertCount > 0
                    ? `${alertCount} alert${alertCount > 1 ? 's' : ''}: ${topMessage}`
                    : `Analysis finished. ${topMessage}`,
              });

              if (alertCount > 0) {
                await refreshAlertsFromServer();
              }
              return;
            }

            if (event.type === 'error') {
              updateStream(streamId, {
                scanState: 'error',
                isAnalyzing: false,
                message: `Analysis failed: ${event.error || 'Unknown stream error'}`,
              });
              return;
            }
          }
        }

        updateStream(streamId, {
          scanState: 'error',
          isAnalyzing: false,
          message: 'Analysis stream ended before a final result was received.',
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        updateStream(streamId, {
          scanState: 'error',
          isAnalyzing: false,
          message: `Analysis failed: ${message}`,
        });
      }
    },
    [refreshAlertsFromServer, updateStream]
  );

  const handleServiceAction = useCallback(
    async (action: 'start' | 'stop' | 'refresh') => {
      setServiceBusy(true);
      try {
        const response =
          action === 'refresh'
            ? await fetch('/api/security-alerts/service/status', { cache: 'no-store' })
            : await fetch(`/api/security-alerts/service/${action}`, {
                method: 'POST',
              });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || `Failed to ${action} anomaly service`);
        }

        if (data?.status) {
          setServiceStatus(data.status);
        } else if (action === 'refresh' && data) {
          setServiceStatus(data);
        } else {
          await refreshServiceStatus();
        }

        if (action === 'start') {
          setServiceMessage(data?.reason || 'Anomaly service start requested.');
        } else if (action === 'stop') {
          setServiceMessage(data?.reason || 'Anomaly service stop requested.');
        } else {
          setServiceMessage('Service status refreshed.');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setServiceMessage(message);
      } finally {
        setServiceBusy(false);
      }
    },
    [refreshServiceStatus]
  );

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

    uploadedFilesRef.current[streamId] = file;
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
      message: `Loaded footage: ${file.name}. Ready to run anomaly test.`,
      isAnalyzing: false,
      progressPercent: 0,
    });
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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Anomaly Service Control</h2>
              <p className="mt-1 text-sm text-slate-500">
                Start the Python security service here before testing uploaded classroom clips.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void handleServiceAction('start')}
                disabled={serviceBusy || serviceStatus?.running || !serviceIsLocal}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {serviceBusy && !serviceStatus?.running
                  ? 'Starting...'
                  : !serviceIsLocal
                    ? 'Service hosted externally'
                    : 'Start service'}
              </button>
              <button
                type="button"
                onClick={() => void handleServiceAction('stop')}
                disabled={serviceBusy || !serviceStatus?.running || !serviceIsLocal}
                className="rounded-xl bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Stop service
              </button>
              <button
                type="button"
                onClick={() => void handleServiceAction('refresh')}
                disabled={serviceBusy}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Refresh status
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Service</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {serviceStatus?.running ? 'Running' : 'Stopped'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">PID</p>
              <p className="mt-1 text-sm font-bold text-slate-900">{serviceStatus?.pid ?? 'N/A'}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Service URL</p>
              <p className="mt-1 break-all text-sm font-bold text-slate-900">
                {serviceStatus?.serviceUrl || process.env.NEXT_PUBLIC_ANOMALY_SERVICE_URL || 'http://127.0.0.1:8010'}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Health</p>
              <p className="mt-1 text-sm font-bold text-slate-900">
                {serviceStatus?.health?.status || 'Unknown'}
              </p>
            </div>
          </div>

          {serviceMessage && (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{serviceMessage}</p>
          )}

          {!serviceIsLocal && (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">
              This deployment uses a separate Azure security-alert service, so start and stop are managed outside this dashboard.
            </p>
          )}

          {serviceStatus?.logs?.length ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-950 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Recent service logs</p>
              <div className="max-h-44 space-y-1 overflow-auto font-mono text-xs text-slate-200">
                {serviceStatus.logs.slice(-10).map((line, index) => (
                  <p key={`${index}-${line}`} className="break-all">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </section>
      )}

      {role === 'admin' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-slate-900">Classroom Security Test Lab</h2>
              <p className="text-sm text-slate-500">Upload a class video, run the anomaly pipeline, and review the stored alerts below.</p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  serviceStatus?.running
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {serviceStatus?.running ? 'Service running' : 'Service stopped'}
              </span>
              {!serviceStatus?.running && serviceIsLocal && (
                <button
                  type="button"
                  onClick={() => void handleServiceAction('start')}
                  disabled={serviceBusy}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {serviceBusy ? 'Starting...' : 'Start here'}
                </button>
              )}
            </div>
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
                      onClick={() => void analyzeOneStream(stream.id)}
                      disabled={!stream.videoUrl || stream.isAnalyzing}
                      className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {stream.isAnalyzing ? 'Testing...' : 'Run test'}
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-900 p-2">
                  {stream.videoUrl ? (
                    <video
                      controls
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
                        ? (() => {
                            const confidence = primaryConfidence(stream.scanResult);
                            return confidence !== null
                              ? `${adjustDisplayedPercent(confidence * 100).toFixed(1)}%`
                              : 'No alert';
                          })()
                        : 'Waiting for scan'}
                    </div>
                  </div>
                </div>

                {stream.isAnalyzing && (
                  <div className="mt-3">
                    <div className="mb-1 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      <span>Analysis progress</span>
                      <span>{Math.round(stream.progressPercent || 0)}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-red-500 transition-all"
                        style={{ width: `${Math.max(4, Math.min(100, stream.progressPercent || 0))}%` }}
                      />
                    </div>
                  </div>
                )}

                {stream.scanResult && stream.scanResult.alerts.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {stream.scanResult.alerts.slice(0, 3).map((alert, idx) => (
                      <span
                        key={`${stream.id}-${idx}`}
                        className="rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700"
                      >
                        {alert.type}: {adjustDisplayedPercent(Number(alert.confidence || 0) * 100).toFixed(1)}%
                      </span>
                    ))}
                  </div>
                )}

                {stream.scanResult && stream.scanResult.model_results.filter((result) => result.detected).length > 0 && (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                      Detected timeline
                    </p>
                    <div className="space-y-2">
                      {stream.scanResult.model_results
                        .filter((result) => result.detected)
                        .sort((a, b) => b.confidence - a.confidence)
                        .slice(0, 4)
                        .map((result, idx) => (
                          <div
                            key={`${stream.id}-result-${idx}-${result.model_name}-${result.event_type}`}
                            className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-2 text-xs"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-slate-800">
                                {result.label || result.event_type}
                              </p>
                              <p className="truncate text-slate-500">
                                {result.model_name} • frame {result.frame_index} • {formatSeconds(result.timestamp)}
                              </p>
                            </div>
                            <span className="shrink-0 font-semibold text-slate-700">
                              {adjustDisplayedPercent(result.confidence * 100).toFixed(1)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {stream.message && (
                  <div className="mt-2 rounded-lg bg-white px-2.5 py-1.5 text-xs text-slate-600">
                    <p>{stream.message}</p>
                    {!serviceStatus?.running && !stream.isAnalyzing && (
                      <button
                        type="button"
                        onClick={() => void handleServiceAction('start')}
                        disabled={serviceBusy}
                        className="mt-2 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {serviceBusy ? 'Starting service...' : 'Start anomaly service'}
                      </button>
                    )}
                  </div>
                )}

                {stream.scanResult?.errors?.length ? (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-xs text-amber-800">
                    {stream.scanResult.errors.slice(0, 2).map((error, idx) => (
                      <p key={`${stream.id}-error-${idx}`}>{error}</p>
                    ))}
                  </div>
                ) : null}
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
