'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Bell, Camera, Clock3, Mail, RefreshCw, ShieldAlert, Trash2, Upload, Volume2 } from 'lucide-react';

import SecurityAlertsLiveAudioTester from '@/app/components/SecurityAlertsLiveAudioTester';
import SecurityAlertsWebcamTester from '@/app/components/SecurityAlertsWebcamTester';

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

type LocalAnomalyModel = {
  fileName: string;
  modelName: string;
  eventType: string;
  fileSize: number;
  uploadedAt: string | null;
  checksumSha256: string | null;
  notes: string;
  protected: boolean;
  loadedByService: boolean;
};

type AnomalyModelPanelState = {
  models: LocalAnomalyModel[];
  audio: {
    expectedModelFile: string;
    expectedConfigFile: string;
    hasModelFile: boolean;
    hasConfigFile: boolean;
    modelFileSize: number;
    configFileSize: number;
    uploadedAt: string | null;
    modelChecksumSha256: string | null;
    configChecksumSha256: string | null;
    notes: string;
    enabled: boolean;
    loadedByService: boolean;
    loadError: string | null;
  } | null;
  loading: boolean;
  busy: boolean;
  message: string;
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

type SoundCheckResponse = {
  verdict: 'anomaly' | 'normal' | 'unavailable';
  confidenceRaw: number;
  confidencePercent: number;
  sourceMode: 'audio-file' | 'video-extracted-audio';
  reason?: string;
  audioSummary?: {
    rows: number;
    detectedRows: number;
    topLabel: string;
    topEventType: string;
  };
  result?: {
    errors?: string[];
    audio_model_results?: Array<{
      label?: string;
      confidence?: number;
      detected?: boolean;
      timestamp?: number;
    }>;
  };
};

type SoundCheckStreamEvent =
  | {
      type: 'started';
      progress_percent?: number;
      processed_windows?: number;
      message?: string;
    }
  | {
      type: 'progress';
      progress_percent?: number;
      processed_windows?: number;
      message?: string;
      audio_result?: {
        event_type?: string;
        confidence?: number;
        detected?: boolean;
        timestamp?: number;
      };
    }
  | {
      type: 'final';
      progress_percent?: number;
      processed_windows?: number;
      result?: Record<string, unknown> | SoundCheckResponse;
  }
  | {
      type: 'error';
      error?: string;
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

function formatBytes(bytes: number) {
  const value = Number(bytes || 0);
  if (!Number.isFinite(value) || value <= 0) return '0 B';
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function mapAssignedTo(targetRole?: string) {
  if (targetRole === 'admin') return 'Admin Team';
  if (targetRole === 'teacher') return 'Teachers';
  if (targetRole === 'parent') return 'Parents';
  if (targetRole === 'student') return 'Students';
  if (targetRole === 'all') return 'All Users';
  return 'Unknown';
}

function normalizeSoundCheckResult(rawResult: any, sourceType: 'video' | 'audio'): SoundCheckResponse | null {
  if (!rawResult || typeof rawResult !== 'object') {
    return null;
  }

  if (typeof rawResult.verdict === 'string') {
    return rawResult as SoundCheckResponse;
  }

  const modelResults = Array.isArray(rawResult.model_results) ? rawResult.model_results : [];
  const audioRows = modelResults.filter(
    (row: any) => String(row?.model_name || '').toLowerCase() === 'audio_security_model'
  );

  if (audioRows.length === 0) {
    const returnedModelNames = modelResults
      .map((row: any) => String(row?.model_name || '').trim())
      .filter(Boolean)
      .reduce<string[]>((acc, name) => {
        if (acc.indexOf(name) < 0) {
          acc.push(name);
        }
        return acc;
      }, []);

    return {
      verdict: 'unavailable',
      confidenceRaw: 0,
      confidencePercent: 0,
      sourceMode: sourceType === 'audio' ? 'audio-file' : 'video-extracted-audio',
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
        errors: Array.isArray(rawResult.errors) ? rawResult.errors : [],
        audio_model_results: [],
      },
    };
  }

  const detectedRows = audioRows.filter((row: any) => Boolean(row?.detected));
  const topAudioRow = [...audioRows].sort(
    (a: any, b: any) => Number(b?.confidence || 0) - Number(a?.confidence || 0)
  )[0];
  const confidenceRaw = Number(topAudioRow?.confidence || 0);
  const verdict = detectedRows.length > 0 ? 'anomaly' : 'normal';

  return {
    verdict,
    confidenceRaw,
    confidencePercent: toPercent(confidenceRaw),
    sourceMode: sourceType === 'audio' ? 'audio-file' : 'video-extracted-audio',
    audioSummary: {
      rows: audioRows.length,
      detectedRows: detectedRows.length,
      topLabel: topAudioRow?.label || 'security_audio',
      topEventType: topAudioRow?.event_type || 'security_audio',
    },
    result: {
      errors: Array.isArray(rawResult.errors) ? rawResult.errors : [],
      audio_model_results: audioRows,
    },
  };
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
  const [modelPanel, setModelPanel] = useState<AnomalyModelPanelState>({
    models: [],
    audio: null,
    loading: false,
    busy: false,
    message: '',
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadEventType, setUploadEventType] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [audioModelFile, setAudioModelFile] = useState<File | null>(null);
  const [audioConfigFile, setAudioConfigFile] = useState<File | null>(null);
  const [audioNotes, setAudioNotes] = useState('');
  const [soundVideoFile, setSoundVideoFile] = useState<File | null>(null);
  const [soundAudioFile, setSoundAudioFile] = useState<File | null>(null);
  const [soundCheckBusy, setSoundCheckBusy] = useState(false);
  const [soundCheckMessage, setSoundCheckMessage] = useState('');
  const [soundCheckResult, setSoundCheckResult] = useState<SoundCheckResponse | null>(null);
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

  const refreshModelPanel = useCallback(async () => {
    setModelPanel((prev) => ({ ...prev, loading: true }));
    try {
      const response = await fetch('/api/security-alerts/models', { cache: 'no-store' });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch anomaly model list');
      }

      setModelPanel((prev) => ({
        ...prev,
        loading: false,
        models: Array.isArray(data?.models) ? data.models : [],
        audio: data?.audio || null,
      }));

      if (data?.service) {
        setServiceStatus((prev) => (prev ? { ...prev, ...data.service } : data.service));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setModelPanel((prev) => ({ ...prev, loading: false, message }));
    }
  }, []);

  const handleModelUpload = useCallback(async () => {
    if (!uploadFile) {
      setModelPanel((prev) => ({ ...prev, message: 'Choose a .onnx model file first.' }));
      return;
    }

    setModelPanel((prev) => ({ ...prev, busy: true, message: '' }));
    try {
      const form = new FormData();
      form.set('model', uploadFile);
      if (uploadName.trim()) form.set('name', uploadName.trim());
      if (uploadEventType.trim()) form.set('eventType', uploadEventType.trim());
      if (uploadNotes.trim()) form.set('notes', uploadNotes.trim());

      const response = await fetch('/api/security-alerts/models', {
        method: 'POST',
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to upload model');
      }

      setUploadFile(null);
      setUploadName('');
      setUploadEventType('');
      setUploadNotes('');
      setModelPanel((prev) => ({
        ...prev,
        busy: false,
        message:
          data?.message ||
          'Model uploaded. Restart anomaly service to apply the new model cleanly.',
      }));
      await refreshModelPanel();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setModelPanel((prev) => ({ ...prev, busy: false, message }));
    }
  }, [refreshModelPanel, uploadEventType, uploadFile, uploadName, uploadNotes]);

  const handleDeleteModel = useCallback(
    async (fileName: string) => {
      if (!window.confirm(`Delete model ${fileName}?`)) {
        return;
      }

      setModelPanel((prev) => ({ ...prev, busy: true, message: '' }));
      try {
        const response = await fetch(`/api/security-alerts/models?name=${encodeURIComponent(fileName)}`, {
          method: 'DELETE',
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to delete model');
        }

        setModelPanel((prev) => ({
          ...prev,
          busy: false,
          message: data?.message || 'Model deleted.',
        }));
        await refreshModelPanel();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setModelPanel((prev) => ({ ...prev, busy: false, message }));
      }
    },
    [refreshModelPanel]
  );

  const handleAudioUpload = useCallback(async () => {
    if (!audioModelFile || !audioConfigFile) {
      setModelPanel((prev) => ({ ...prev, message: 'Select both .keras and .json files for audio anomaly.' }));
      return;
    }

    setModelPanel((prev) => ({ ...prev, busy: true, message: '' }));
    try {
      const form = new FormData();
      form.set('kind', 'audio');
      form.set('audio_model', audioModelFile);
      form.set('audio_config', audioConfigFile);
      if (audioNotes.trim()) form.set('notes', audioNotes.trim());

      const response = await fetch('/api/security-alerts/models', {
        method: 'POST',
        body: form,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to upload audio anomaly files');
      }

      setAudioModelFile(null);
      setAudioConfigFile(null);
      setAudioNotes('');

      setModelPanel((prev) => ({
        ...prev,
        busy: false,
        message:
          data?.message ||
          'Audio files uploaded. Restart anomaly service to activate sound anomaly.',
      }));
      await refreshModelPanel();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setModelPanel((prev) => ({ ...prev, busy: false, message }));
    }
  }, [audioConfigFile, audioModelFile, audioNotes, refreshModelPanel]);

  const handleDeleteAudio = useCallback(async () => {
    if (!window.confirm('Remove uploaded audio anomaly model and config?')) {
      return;
    }

    setModelPanel((prev) => ({ ...prev, busy: true, message: '' }));
    try {
      const response = await fetch('/api/security-alerts/models?kind=audio', {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to remove audio anomaly files');
      }

      setModelPanel((prev) => ({ ...prev, busy: false, message: data?.message || 'Audio files removed.' }));
      await refreshModelPanel();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setModelPanel((prev) => ({ ...prev, busy: false, message }));
    }
  }, [refreshModelPanel]);

  const handleRestartService = useCallback(async () => {
    setServiceBusy(true);
    setModelPanel((prev) => ({ ...prev, busy: true }));
    try {
      await fetch('/api/security-alerts/service/stop', { method: 'POST' });
      const startResponse = await fetch('/api/security-alerts/service/start', { method: 'POST' });
      const startData = await startResponse.json().catch(() => null);
      if (!startResponse.ok) {
        throw new Error(startData?.error || 'Failed to restart anomaly service');
      }

      await Promise.all([refreshServiceStatus(), refreshModelPanel()]);
      setServiceMessage(startData?.reason || 'Anomaly service restarted.');
      setModelPanel((prev) => ({
        ...prev,
        busy: false,
        message: 'Service restarted. Newly uploaded models are now available for detection.',
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setServiceMessage(message);
      setModelPanel((prev) => ({ ...prev, busy: false, message }));
    } finally {
      setServiceBusy(false);
    }
  }, [refreshModelPanel, refreshServiceStatus]);

  const runSoundCheck = useCallback(
    async (sourceType: 'video' | 'audio') => {
      const media = sourceType === 'video' ? soundVideoFile : soundAudioFile;
      if (!media) {
        setSoundCheckMessage(sourceType === 'video' ? 'Please choose a video file first.' : 'Please choose an audio file first.');
        return;
      }

      setSoundCheckBusy(true);
      setSoundCheckMessage('Starting streamed sound anomaly check...');
      setSoundCheckResult(null);
      try {
        const form = new FormData();
        form.set('media', media);
        form.set('media_type', sourceType);

        const response = await fetch('/api/security-alerts/analyze-sound-progress', {
          method: 'POST',
          body: form,
        });
        if (!response.ok || !response.body) {
          const data = await response.json().catch(() => null);
          throw new Error(data?.error || 'Sound anomaly analysis failed');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let finalResult: SoundCheckResponse | null = null;

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

            let event: SoundCheckStreamEvent | null = null;
            try {
              event = JSON.parse(trimmed) as SoundCheckStreamEvent;
            } catch {
              continue;
            }

            if (event.type === 'started') {
              setSoundCheckMessage(event.message || 'Streaming audio windows...');
              continue;
            }

            if (event.type === 'progress') {
              const windowLabel = Number(event.processed_windows || 0);
              const audioResult = event.audio_result;
              setSoundCheckMessage(
                audioResult?.detected
                  ? `Audio alert emerging at ${formatSeconds(audioResult.timestamp)} (window ${windowLabel}).`
                  : `Streaming audio windows... processed ${windowLabel}`
              );
              continue;
            }

            if (event.type === 'final') {
              finalResult = normalizeSoundCheckResult(event.result, sourceType);
              if (finalResult) {
                setSoundCheckResult(finalResult);
                setSoundCheckMessage(
                  finalResult.verdict === 'anomaly'
                    ? `Anomaly detected by audio model (${Number(finalResult.confidencePercent || 0).toFixed(1)}%).`
                    : finalResult.verdict === 'unavailable'
                      ? `Audio analysis unavailable: ${finalResult.reason || 'the backend did not return any audio model rows.'}`
                      : `Marked normal by audio model (${Number(finalResult.confidencePercent || 0).toFixed(1)}%).`
                );
              }
              return;
            }

            if (event.type === 'error') {
              throw new Error(event.error || 'Sound anomaly analysis failed');
            }
          }
        }

        if (!finalResult) {
          throw new Error('Sound anomaly analysis ended before a final result was received.');
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        setSoundCheckMessage(message);
      } finally {
        setSoundCheckBusy(false);
      }
    },
    [soundAudioFile, soundVideoFile]
  );

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
          await Promise.all([refreshServiceStatus(), refreshModelPanel()]);
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
  }, [refreshAlertsFromServer, refreshModelPanel, refreshServiceStatus, role]);

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
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Sound Anomaly Validation (Live Microphone)</h2>
              <p className="mt-1 text-sm text-slate-500">
                Open the browser microphone and stream raw audio directly into the anomaly service. The backend keeps
                the rolling temporal state, so this behaves like a realtime system instead of a batch file upload.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              <Volume2 className="h-4 w-4" />
              Live audio verdict
            </div>
          </div>

          <SecurityAlertsLiveAudioTester onAlertStored={() => void refreshAlertsFromServer()} />

          <div className="mt-6 border-t border-slate-200 pt-6">
            <div className="mb-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">Offline file validation</h3>
              <p className="mt-1 text-xs text-slate-600">
                Use a video or audio file when you want a repeatable batch test or need to compare against saved
                footage.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">Test from video</h3>
              <p className="mt-1 text-xs text-slate-600">Extract audio from uploaded video and run sound anomaly model.</p>
              <input
                type="file"
                accept="video/*"
                onChange={(event) => setSoundVideoFile(event.target.files?.[0] || null)}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void runSoundCheck('video')}
                disabled={!soundVideoFile || soundCheckBusy}
                className="mt-3 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {soundCheckBusy ? 'Testing...' : 'Check sound from video'}
              </button>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">Test from audio</h3>
              <p className="mt-1 text-xs text-slate-600">Run direct sound anomaly detection using uploaded audio clip.</p>
              <input
                type="file"
                accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.flac"
                onChange={(event) => setSoundAudioFile(event.target.files?.[0] || null)}
                className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void runSoundCheck('audio')}
                disabled={!soundAudioFile || soundCheckBusy}
                className="mt-3 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {soundCheckBusy ? 'Testing...' : 'Check sound from audio'}
              </button>
            </div>
          </div>

          {soundCheckMessage && (
            <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{soundCheckMessage}</p>
          )}

          {soundCheckResult && (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    soundCheckResult.verdict === 'anomaly'
                      ? 'bg-rose-100 text-rose-700'
                      : soundCheckResult.verdict === 'unavailable'
                        ? 'bg-slate-200 text-slate-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {soundCheckResult.verdict === 'anomaly'
                    ? 'ANOMALY'
                    : soundCheckResult.verdict === 'unavailable'
                      ? 'UNAVAILABLE'
                      : 'NORMAL'}
                </span>
                <span className="text-sm font-semibold text-slate-800">
                  Confidence:{' '}
                  {soundCheckResult.verdict === 'unavailable'
                    ? 'N/A'
                    : `${Number(soundCheckResult.confidencePercent || 0).toFixed(1)}%`}
                </span>
                <span className="text-xs text-slate-600">Source: {soundCheckResult.sourceMode}</span>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-slate-700 md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="font-semibold text-slate-900">Top label</p>
                  <p>{soundCheckResult.audioSummary?.topLabel || (soundCheckResult.verdict === 'unavailable' ? 'audio_unavailable' : 'security_audio')}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="font-semibold text-slate-900">Event type</p>
                  <p>{soundCheckResult.audioSummary?.topEventType || (soundCheckResult.verdict === 'unavailable' ? 'audio_unavailable' : 'security_audio')}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-3 py-2">
                  <p className="font-semibold text-slate-900">Detected frames</p>
                  <p>
                    {Number(soundCheckResult.audioSummary?.detectedRows || 0)} / {Number(soundCheckResult.audioSummary?.rows || 0)}
                  </p>
                </div>
              </div>

              {soundCheckResult.verdict === 'unavailable' && (
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  {soundCheckResult.reason || 'The audio model did not return any rows in this runtime.'}
                </div>
              )}

              {Array.isArray(soundCheckResult.result?.errors) && soundCheckResult.result?.errors?.length ? (
                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {soundCheckResult.result.errors.join(' | ')}
                </div>
              ) : null}
            </div>
          )}

          </div>
        </section>
      )}

      {role === 'admin' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Webcam Live Test</h2>
              <p className="mt-1 text-sm text-slate-500">
                Open your browser camera and stream live frames into the security pipeline. The service keeps the
                temporal model state warm, so this behaves like a real monitoring feed.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
              <Camera className="h-4 w-4" />
              Live webcam stream
            </div>
          </div>

          <SecurityAlertsWebcamTester onAlertStored={refreshAlertsFromServer} />
        </section>
      )}

      {role === 'admin' && (
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900">Anomaly Model Registry</h2>
              <p className="mt-1 text-sm text-slate-500">
                Upload validated .onnx checkpoints to secuirty-alerts/anomalyModels. Restart service after updates.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refreshModelPanel()}
                disabled={modelPanel.loading || modelPanel.busy}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh models
              </button>
              <button
                type="button"
                onClick={() => void handleRestartService()}
                disabled={serviceBusy || modelPanel.busy || !serviceIsLocal}
                className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Restart service
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input
              type="file"
              accept=".onnx"
              onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={uploadName}
              onChange={(event) => setUploadName(event.target.value)}
              placeholder="Model name (optional)"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={uploadEventType}
              onChange={(event) => setUploadEventType(event.target.value)}
              placeholder="Event type (optional)"
              className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => void handleModelUpload()}
              disabled={!uploadFile || modelPanel.busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              Upload model
            </button>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-800">Sound Anomaly Files</h3>
                <p className="mt-1 text-xs text-slate-600">
                  Upload paired audio files: .keras model and .json config. They are stored as fixed runtime names.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-semibold ${
                    modelPanel.audio?.loadedByService
                      ? 'bg-emerald-100 text-emerald-700'
                      : modelPanel.audio?.enabled === false
                        ? 'bg-slate-200 text-slate-700'
                        : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {modelPanel.audio?.loadedByService
                    ? 'Audio loaded'
                    : modelPanel.audio?.enabled === false
                      ? 'Audio disabled'
                      : 'Audio not loaded'}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDeleteAudio()}
                  disabled={modelPanel.busy}
                  className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove audio files
                </button>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <input
                type="file"
                accept=".keras"
                onChange={(event) => setAudioModelFile(event.target.files?.[0] || null)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <input
                type="file"
                accept=".json"
                onChange={(event) => setAudioConfigFile(event.target.files?.[0] || null)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => void handleAudioUpload()}
                disabled={!audioModelFile || !audioConfigFile || modelPanel.busy}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Upload className="h-4 w-4" />
                Upload sound anomaly
              </button>
            </div>

            <textarea
              value={audioNotes}
              onChange={(event) => setAudioNotes(event.target.value)}
              placeholder="Audio upload notes (optional)"
              className="mt-3 min-h-[64px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">Expected model file</p>
                <p>{modelPanel.audio?.expectedModelFile || 'final_audio_model_extratune.keras'}</p>
                <p className="mt-1 text-slate-500">{formatBytes(modelPanel.audio?.modelFileSize || 0)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
                <p className="font-semibold text-slate-900">Expected config file</p>
                <p>{modelPanel.audio?.expectedConfigFile || 'final_audio_config_extratune.json'}</p>
                <p className="mt-1 text-slate-500">{formatBytes(modelPanel.audio?.configFileSize || 0)}</p>
              </div>
            </div>

            {modelPanel.audio?.loadError ? (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                Audio load error: {modelPanel.audio.loadError}
              </p>
            ) : modelPanel.audio?.enabled === false ? (
              <p className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                Audio is disabled in the current Python runtime, so the service can start but sound anomaly detection
                stays unavailable until you switch to a Python 3.12 or 3.11 environment with TensorFlow support.
              </p>
            ) : null}
          </div>

          <textarea
            value={uploadNotes}
            onChange={(event) => setUploadNotes(event.target.value)}
            placeholder="Upload notes (optional)"
            className="mt-3 min-h-[72px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
          />

          {modelPanel.message ? (
            <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">{modelPanel.message}</p>
          ) : null}

          <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">File</th>
                  <th className="px-3 py-2">Event</th>
                  <th className="px-3 py-2">Size</th>
                  <th className="px-3 py-2">Loaded</th>
                  <th className="px-3 py-2">Uploaded</th>
                  <th className="px-3 py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {modelPanel.models.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-3 py-5 text-center text-slate-500">
                      {modelPanel.loading ? 'Loading models...' : 'No .onnx model files found.'}
                    </td>
                  </tr>
                ) : (
                  modelPanel.models.map((model) => (
                    <tr key={model.fileName} className="border-t border-slate-200">
                      <td className="px-3 py-2 font-semibold text-slate-900">{model.fileName}</td>
                      <td className="px-3 py-2 text-slate-700">{model.eventType}</td>
                      <td className="px-3 py-2 text-slate-700">{formatBytes(model.fileSize)}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                            model.loadedByService ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {model.loadedByService ? 'Loaded' : 'Pending restart'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-700">{model.uploadedAt ? new Date(model.uploadedAt).toLocaleString() : 'Unknown'}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => void handleDeleteModel(model.fileName)}
                          disabled={model.protected || modelPanel.busy}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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
