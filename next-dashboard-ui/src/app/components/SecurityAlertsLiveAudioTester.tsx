'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Mic, ShieldAlert, Square } from 'lucide-react';

type LiveAudioAlert = {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  summary?: string;
  confidence: number;
  triggered_by?: string[];
  metadata?: Record<string, unknown>;
};

type LiveAudioAnalysisResult = {
  type?: 'started' | 'frame' | 'error' | 'stopped';
  status?: 'ok' | 'warning' | 'error';
  source?: string;
  frame_index?: number;
  timestamp?: number;
  alerts?: LiveAudioAlert[];
  model_results?: Array<{
    model_name?: string;
    event_type?: string;
    label?: string;
    confidence?: number;
    detected?: boolean;
    frame_index?: number;
    timestamp?: number;
    metadata?: Record<string, unknown>;
  }>;
  system_metrics?: {
    fps?: number;
    processing_time_ms?: number;
    processed_frames?: number;
    sampled_frames?: number;
    active_models?: string[];
  };
  errors?: string[];
  error?: string;
  ingest?: {
    success?: boolean;
    alerted?: boolean;
    reason?: string;
    error?: string;
  } | null;
  message?: string;
  audio_result?: {
    alert?: boolean;
    reason?: string;
    clip_prob?: number;
    max_frame_prob?: number;
    num_frames?: number;
    alert_at_sec?: number | null;
    frame_probs?: number[];
  };
  latency_ms?: number;
  chunk_index?: number;
  chunk_samples?: number;
  chunk_window_seconds?: number;
  hop_seconds?: number;
  input_sample_rate?: number;
  target_sample_rate?: number;
  encoding?: string;
  channels?: number;
};

type LiveAudioBootstrap = {
  serviceUrl?: string;
  websocketUrl?: string;
  error?: string;
};

type SecurityAlertsLiveAudioTesterProps = {
  onAlertStored?: () => void | Promise<void>;
};

const AUDIO_PACKET_SIZE = 2048;
const AUDIO_WORKLET_NAME = 'live-audio-pcm-chunk-processor';
const MIC_CONSTRAINTS: MediaStreamConstraints = {
  audio: {
    channelCount: 1,
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  },
  video: false,
};

const AUDIO_WORKLET_SOURCE = `
class LiveAudioPcmChunkProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    const requestedPacketSize = Number(options?.processorOptions?.packetSize || 0);
    this.packetSize = Math.max(256, requestedPacketSize || 2048);
    this.buffer = new Float32Array(this.packetSize * 4);
    this.bufferLength = 0;
  }

  pushSamples(samples) {
    if (!samples || samples.length === 0) {
      return;
    }

    let offset = 0;
    while (offset < samples.length) {
      const available = this.buffer.length - this.bufferLength;
      const toCopy = Math.min(available, samples.length - offset);
      this.buffer.set(samples.subarray(offset, offset + toCopy), this.bufferLength);
      this.bufferLength += toCopy;
      offset += toCopy;

      while (this.bufferLength >= this.packetSize) {
        const packet = this.buffer.slice(0, this.packetSize);
        this.port.postMessage(packet, [packet.buffer]);
        const leftover = this.bufferLength - this.packetSize;
        if (leftover > 0) {
          this.buffer.copyWithin(0, this.packetSize, this.packetSize + leftover);
        }
        this.bufferLength = leftover;
      }
    }
  }

  process(inputs) {
    const channelData = inputs[0];
    if (!channelData || channelData.length === 0 || !channelData[0]) {
      return true;
    }

    if (channelData.length === 1) {
      this.pushSamples(channelData[0]);
      return true;
    }

    const length = channelData[0].length;
    const mono = new Float32Array(length);
    for (let index = 0; index < length; index += 1) {
      let total = 0;
      for (let channel = 0; channel < channelData.length; channel += 1) {
        total += channelData[channel][index] || 0;
      }
      mono[index] = total / channelData.length;
    }

    this.pushSamples(mono);
    return true;
  }
}

registerProcessor('${AUDIO_WORKLET_NAME}', LiveAudioPcmChunkProcessor);
`;

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
    throw new Error('Live audio service URL was not provided.');
  }

  const url = new URL(serviceUrl);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/anomaly/live-audio`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

function getTopAlert(alerts: LiveAudioAlert[] | null | undefined) {
  if (!Array.isArray(alerts) || alerts.length === 0) {
    return null;
  }

  return [...alerts].sort((a, b) => Number(b.confidence || 0) - Number(a.confidence || 0))[0] || null;
}

function createAudioWorkletModuleUrl() {
  return URL.createObjectURL(
    new Blob([AUDIO_WORKLET_SOURCE], {
      type: 'application/javascript',
    })
  );
}

function levelFromSamples(samples: Float32Array) {
  if (!samples.length) {
    return 0;
  }

  let sumSquares = 0;
  for (let index = 0; index < samples.length; index += 1) {
    const sample = samples[index] || 0;
    sumSquares += sample * sample;
  }

  const rms = Math.sqrt(sumSquares / samples.length);
  return Math.max(0, Math.min(100, rms * 350));
}

export default function SecurityAlertsLiveAudioTester({ onAlertStored }: SecurityAlertsLiveAudioTesterProps) {
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const muteNodeRef = useRef<GainNode | null>(null);
  const workletModuleUrlRef = useRef<string | null>(null);
  const runningRef = useRef(false);
  const startingRef = useRef(false);
  const stoppingRef = useRef(false);
  const runIdRef = useRef(0);

  const [starting, setStarting] = useState(false);
  const [running, setRunning] = useState(false);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'open' | 'error'>('idle');
  const [message, setMessage] = useState('Ready to start the live microphone prototype.');
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState<LiveAudioAnalysisResult | null>(null);
  const [micLevel, setMicLevel] = useState(0);
  const [browserSampleRate, setBrowserSampleRate] = useState<number | null>(null);
  const [backendSampleRate, setBackendSampleRate] = useState<number | null>(null);
  const [backendWindowSeconds, setBackendWindowSeconds] = useState<number | null>(null);
  const [backendHopSeconds, setBackendHopSeconds] = useState<number | null>(null);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | null>(null);
  const [packetCount, setPacketCount] = useState(0);

  const stopAudio = useCallback(
    (options?: { keepMessage?: boolean; keepError?: boolean }) => {
      runIdRef.current += 1;
      runningRef.current = false;
      startingRef.current = false;
      stoppingRef.current = true;

      const socket = socketRef.current;
      if (socket && socket.readyState !== WebSocket.CLOSED && socket.readyState !== WebSocket.CLOSING) {
        try {
          socket.close(1000, 'microphone test stopped');
        } catch {
          // Ignore websocket shutdown errors.
        }
      }
      socketRef.current = null;

      const workletNode = workletNodeRef.current;
      if (workletNode) {
        try {
          workletNode.port.onmessage = null;
        } catch {
          // Ignore cleanup errors.
        }
        try {
          workletNode.disconnect();
        } catch {
          // Ignore cleanup errors.
        }
        workletNodeRef.current = null;
      }

      const sourceNode = sourceNodeRef.current;
      if (sourceNode) {
        try {
          sourceNode.disconnect();
        } catch {
          // Ignore cleanup errors.
        }
        sourceNodeRef.current = null;
      }

      const muteNode = muteNodeRef.current;
      if (muteNode) {
        try {
          muteNode.disconnect();
        } catch {
          // Ignore cleanup errors.
        }
        muteNodeRef.current = null;
      }

      const context = audioContextRef.current;
      if (context) {
        void context.close().catch(() => undefined);
        audioContextRef.current = null;
      }

      const stream = streamRef.current;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      if (workletModuleUrlRef.current) {
        URL.revokeObjectURL(workletModuleUrlRef.current);
        workletModuleUrlRef.current = null;
      }

      setRunning(false);
      setStarting(false);
      setConnectionState('idle');
      setMicLevel(0);
      setBrowserSampleRate(null);
      setBackendSampleRate(null);
      setBackendWindowSeconds(null);
      setBackendHopSeconds(null);
      setLastLatencyMs(null);
      setPacketCount(0);

      if (!options?.keepError) {
        setError('');
      }
      if (!options?.keepMessage) {
        setMessage('Microphone stopped.');
      }
      stoppingRef.current = false;
    },
    []
  );

  const handleSocketMessage = useCallback(
    async (event: MessageEvent) => {
      if (!runningRef.current) {
        return;
      }

      let payload: LiveAudioAnalysisResult;
      try {
        const text =
          typeof event.data === 'string'
            ? event.data
            : event.data instanceof Blob
              ? await event.data.text()
              : event.data instanceof ArrayBuffer
                ? new TextDecoder().decode(event.data)
                : JSON.stringify(event.data || {});
        payload = JSON.parse(text || '{}') as LiveAudioAnalysisResult;
      } catch {
        setError('Live microphone returned an unreadable response.');
        setMessage('Waiting for the next audio window...');
        return;
      }

      if (runIdRef.current === 0) {
        return;
      }

      if (!runningRef.current && payload.type !== 'started') {
        return;
      }

      if (payload.type === 'started') {
        setConnectionState('open');
        setMessage(payload.message || 'Live microphone session started.');
        setBrowserSampleRate(payload.input_sample_rate ?? null);
        setBackendSampleRate(payload.target_sample_rate ?? null);
        setBackendWindowSeconds(payload.chunk_window_seconds ?? null);
        setBackendHopSeconds(payload.hop_seconds ?? null);
        return;
      }

      if (payload.type === 'error') {
        setError(payload.error || 'Live microphone frame failed.');
        setMessage(payload.error || 'A live microphone frame failed, but the stream is still running.');
        return;
      }

      if (payload.type === 'stopped') {
        setMessage(payload.message || 'Live microphone session stopped.');
        return;
      }

      const packetIndex = Number(payload.chunk_index || payload.frame_index || 0);
      setLastResult(payload);
      setPacketCount(packetIndex);
      setLastLatencyMs(Number(payload.latency_ms || payload.system_metrics?.processing_time_ms || 0));

      if (Array.isArray(payload.errors) && payload.errors.length > 0) {
        setError(payload.errors.join(' | '));
      } else {
        setError('');
      }

      if (payload.ingest?.alerted && onAlertStored) {
        void Promise.resolve(onAlertStored()).catch(() => undefined);
      }

      if (payload.alerts && payload.alerts.length > 0) {
        const topAlert = getTopAlert(payload.alerts);
        if (topAlert) {
          setMessage(
            `${topAlert.summary || topAlert.type} (${toConfidencePercent(topAlert.confidence).toFixed(1)}%) detected.`
          );
        }
      } else {
        setMessage(
          typeof payload.frame_index === 'number'
            ? `Live microphone is running. No anomaly detected in audio frame ${payload.frame_index}.`
            : 'Live microphone is running. Waiting for the next analysis window.'
        );
      }
    },
    [onAlertStored]
  );

  const startAudio = useCallback(async () => {
    if (startingRef.current || runningRef.current) {
      return;
    }

    startingRef.current = true;
    setStarting(true);
    setConnectionState('connecting');
    setError('');
    setMessage('Requesting microphone access...');
    setLastResult(null);
    setMicLevel(0);
    setLastLatencyMs(null);
    setPacketCount(0);

    const sessionId = runIdRef.current + 1;
    runIdRef.current = sessionId;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('This browser does not support microphone access.');
      }

      const stream = await navigator.mediaDevices.getUserMedia(MIC_CONSTRAINTS);
      if (runIdRef.current !== sessionId) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      streamRef.current = stream;
      setMessage('Preparing the live audio service...');

      const bootstrapResponse = await fetch('/api/security-alerts/live-audio', {
        method: 'GET',
        cache: 'no-store',
      });
      const bootstrap = (await bootstrapResponse.json().catch(() => ({}))) as LiveAudioBootstrap;
      if (!bootstrapResponse.ok) {
        throw new Error(bootstrap.error || 'Unable to prepare the live audio service.');
      }

      const audioContext = new window.AudioContext({
        latencyHint: 'interactive',
        sampleRate: 16000,
      });
      audioContextRef.current = audioContext;
      await audioContext.resume().catch(() => undefined);

      const detectedSampleRate = audioContext.sampleRate || 16000;
      setBrowserSampleRate(detectedSampleRate);

      const websocketUrl = buildWebSocketUrl(bootstrap.serviceUrl, bootstrap.websocketUrl);
      const socketUrl = new URL(websocketUrl);
      socketUrl.searchParams.set('camera_name', 'Microphone Security');
      socketUrl.searchParams.set('class_name', 'microphone-live-test');
      socketUrl.searchParams.set('notify_ingest', 'true');
      socketUrl.searchParams.set('encoding', 'float32');
      socketUrl.searchParams.set('channels', '1');
      socketUrl.searchParams.set('sample_rate', String(detectedSampleRate));

      const socket = new WebSocket(socketUrl.toString());
      socket.binaryType = 'arraybuffer';
      socketRef.current = socket;

      socket.onopen = () => {
        if (runIdRef.current !== sessionId) {
          try {
            socket.close(1000, 'stale session');
          } catch {
            // Ignore websocket shutdown errors.
          }
          return;
        }

        void (async () => {
          try {
            if (!audioContext.audioWorklet) {
              throw new Error('AudioWorklet is not supported in this browser.');
            }

            const moduleUrl = createAudioWorkletModuleUrl();
            workletModuleUrlRef.current = moduleUrl;
            await audioContext.audioWorklet.addModule(moduleUrl);
            if (workletModuleUrlRef.current === moduleUrl) {
              URL.revokeObjectURL(moduleUrl);
              workletModuleUrlRef.current = null;
            }

            if (runIdRef.current !== sessionId) {
              throw new Error('Microphone session changed before the audio graph was ready.');
            }

            const sourceNode = audioContext.createMediaStreamSource(stream);
            const workletNode = new AudioWorkletNode(audioContext, AUDIO_WORKLET_NAME, {
              numberOfInputs: 1,
              numberOfOutputs: 1,
              channelCount: 1,
              processorOptions: {
                packetSize: AUDIO_PACKET_SIZE,
              },
            });
            const muteNode = audioContext.createGain();
            muteNode.gain.value = 0;

            workletNode.port.onmessage = (workletEvent: MessageEvent) => {
              if (!runningRef.current || runIdRef.current !== sessionId) {
                return;
              }

              const data = workletEvent.data;
              let samples: Float32Array | null = null;
              if (data instanceof Float32Array) {
                samples = data;
              } else if (data instanceof ArrayBuffer) {
                samples = new Float32Array(data);
              }

              if (!samples || samples.length === 0) {
                return;
              }

              setMicLevel(levelFromSamples(samples));

              const activeSocket = socketRef.current;
              if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
                return;
              }

              try {
                activeSocket.send(samples);
              } catch (sendError) {
                const errorMessage = sendError instanceof Error ? sendError.message : String(sendError);
                setError(errorMessage);
                setMessage('Live microphone stream stopped because audio could not be sent.');
                stopAudio({ keepMessage: true, keepError: true });
              }
            };

            sourceNode.connect(workletNode);
            workletNode.connect(muteNode).connect(audioContext.destination);

            sourceNodeRef.current = sourceNode;
            workletNodeRef.current = workletNode;
            muteNodeRef.current = muteNode;

            runningRef.current = true;
            setRunning(true);
            setStarting(false);
            setConnectionState('open');
            setMessage(
              `Prototype microphone stream connected at ${detectedSampleRate.toLocaleString()} Hz.`
            );
          } catch (graphError) {
            const graphErrorMessage = graphError instanceof Error ? graphError.message : String(graphError);
            setError(graphErrorMessage);
            setMessage('Microphone could not be started.');
            stopAudio({ keepMessage: true, keepError: true });
          }
        })();
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

        setError('The live microphone connection encountered an error.');
        setMessage('Live microphone stream failed.');
        stopAudio({ keepMessage: true, keepError: true });
        setConnectionState('error');
      };

      socket.onclose = () => {
        if (runIdRef.current !== sessionId) {
          return;
        }

        const unexpectedClose = !stoppingRef.current;
        if (unexpectedClose) {
          setError('Live microphone connection closed unexpectedly.');
          setMessage('Live microphone stream stopped.');
        }
        stopAudio({ keepMessage: true, keepError: true });
        if (unexpectedClose) {
          setConnectionState('error');
        }
      };
    } catch (startError) {
      const startMessage = startError instanceof Error ? startError.message : String(startError);
      stopAudio({ keepMessage: true, keepError: true });
      setError(startMessage);
      setMessage('Microphone could not be started.');
      setConnectionState('error');
    } finally {
      startingRef.current = false;
      setStarting(false);
    }
  }, [handleSocketMessage, stopAudio]);

  useEffect(() => {
    return () => {
      stopAudio({ keepMessage: true });
    };
  }, [stopAudio]);

  const alertCount = Array.isArray(lastResult?.alerts) ? lastResult!.alerts!.length : 0;
  const topResult = getTopAlert(lastResult?.alerts);
  const statusLabel = starting
    ? 'Connecting'
    : connectionState === 'open'
      ? running
        ? 'Streaming and analyzing'
        : 'Connected'
      : connectionState === 'connecting'
        ? 'Connecting'
        : connectionState === 'error'
          ? 'Error'
          : 'Idle';
  const latencyLabel = formatLatency(lastLatencyMs || lastResult?.system_metrics?.processing_time_ms);
  const packetLabel = String(packetCount || lastResult?.chunk_index || lastResult?.frame_index || 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
              <Mic className="h-4 w-4" />
              Live microphone prototype
            </div>
            <p className="mt-2 text-lg font-black text-white">Realtime audio stream</p>
            <p className="mt-1 text-xs text-slate-400">
              This mode streams raw samples into the anomaly service, but detection quality depends on the device
              microphone, distance, and surrounding noise.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void startAudio()}
              disabled={starting || running}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShieldAlert className="h-4 w-4" />
              {starting ? 'Starting...' : 'Start microphone test'}
            </button>
            <button
              type="button"
              onClick={() => stopAudio()}
              disabled={!running && !starting}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Square className="h-4 w-4" />
              Stop
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-wide text-slate-300">
            <span>Mic activity</span>
            <span>{micLevel.toFixed(0)}%</span>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-sky-400 transition-all"
              style={{ width: `${micLevel}%` }}
            />
          </div>
          <div className="mt-3 grid gap-2 text-xs text-slate-400 sm:grid-cols-2">
            <p>Browser sample rate: {browserSampleRate ? `${browserSampleRate.toLocaleString()} Hz` : 'Waiting'}</p>
            <p>Backend sample rate: {backendSampleRate ? `${backendSampleRate.toLocaleString()} Hz` : 'Waiting'}</p>
            <p>Window size: {formatSeconds(backendWindowSeconds)}</p>
            <p>Hop size: {formatSeconds(backendHopSeconds)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status</p>
          <p className="mt-1 text-sm font-bold text-slate-900">{statusLabel}</p>
          <p className="mt-2 text-sm text-slate-700">{message}</p>
          <p className="mt-1 text-xs text-slate-500">
            Microphone audio is streamed over a persistent websocket as a prototype realtime input. Use offline audio
            validation for the final controlled result.
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
                Source: <span className="font-semibold">{lastResult.source || 'microphone'}</span>
              </p>
              <p>
                Audio frame: <span className="font-semibold">{lastResult.frame_index ?? 0}</span>
              </p>
              <p>
                Time: <span className="font-semibold">{formatSeconds(lastResult.timestamp)}</span>
              </p>
              <p>
                Windows: <span className="font-semibold">{lastResult.audio_result?.num_frames ?? 0}</span>
              </p>
              <p>
                Latency: <span className="font-semibold">{latencyLabel}</span>
              </p>
              <p>
                Packet: <span className="font-semibold">{packetLabel}</span>
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
                  No anomaly has been detected yet.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
              For stable validation, use the uploaded audio test below. Start the microphone only to show realtime
              prototype streaming.
            </div>
          )}
        </div>

        {Array.isArray(lastResult?.errors) && lastResult?.errors?.length ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
            {lastResult.errors.join(' | ')}
          </div>
        ) : null}
      </div>
    </div>
  );
}
