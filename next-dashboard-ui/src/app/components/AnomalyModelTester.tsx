'use client';

import { useMemo, useState } from 'react';

type ModelEvent = 'fight' | 'fall' | 'fire';

type ModelResult = {
  model_name: string;
  event_type: string;
  label: string;
  confidence: number;
  detected: boolean;
  frame_index: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
};

type AnalyzerResponse = {
  status?: 'ok' | 'warning' | 'error';
  source?: string;
  frame_index?: number;
  timestamp?: number;
  alerts?: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    confidence: number;
    summary?: string;
    triggered_by?: string[];
    metadata?: Record<string, unknown>;
  }>;
  model_results?: ModelResult[];
  system_metrics?: {
    fps?: number;
    processing_time_ms?: number;
    processed_frames?: number;
    sampled_frames?: number;
    active_models?: string[];
  };
  errors?: string[];
};

type ServiceStatus = {
  running?: boolean;
  pid?: number | null;
  startedAt?: string | null;
  serviceUrl?: string;
  health?: {
    status?: string;
    initialized?: boolean;
    models?: Array<{
      name?: string;
      event_type?: string;
      enabled?: boolean;
      loaded?: boolean;
      framework?: string;
      threshold?: number;
      extra?: Record<string, unknown>;
    }>;
  };
  logs?: string[];
  error?: string;
};

type CombinedState = {
  file: File | null;
  loading: boolean;
  response: AnalyzerResponse | null;
  error: string;
};

const EVENTS: Array<{ key: ModelEvent; title: string; description: string; accent: string }> = [
  { key: 'fight', title: 'Fight', description: 'Fight event detection result from the same video.', accent: 'from-rose-500 to-red-600' },
  { key: 'fall', title: 'Fall', description: 'Fall event detection result from the same video.', accent: 'from-amber-500 to-orange-600' },
  { key: 'fire', title: 'Fire', description: 'Fire event detection result from the same video.', accent: 'from-orange-500 to-amber-600' },
];

function confidencePercent(confidence: number | undefined) {
  const value = Number(confidence || 0);
  const pct = value <= 1 ? value * 100 : value;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function confidenceRaw(confidence: number | undefined) {
  const value = Number(confidence || 0);
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(4);
}

function detectFromResults(results: ModelResult[] | undefined, eventType: ModelEvent) {
  const rows = Array.isArray(results) ? results : [];
  const expected = rows.filter((row) => String(row.event_type || '').toLowerCase() === eventType);
  const detected = expected.some((row) => row.detected);
  const best = [...expected].sort((a, b) => b.confidence - a.confidence)[0] || null;
  return { rows, expected, detected, best };
}

export default function AnomalyModelTester() {
  const [state, setState] = useState<CombinedState>({ file: null, loading: false, response: null, error: '' });
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const refreshServiceStatus = async () => {
    setStatusLoading(true);
    try {
      const response = await fetch('/api/security-alerts/service/status', { cache: 'no-store' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch service status');
      }
      setServiceStatus(data || {});
    } catch (error: any) {
      setServiceStatus({ error: error?.message || 'Failed to fetch service status' });
    } finally {
      setStatusLoading(false);
    }
  };

  const loadedModels = useMemo(() => {
    const models = serviceStatus?.health?.models || [];
    return models
      .filter((model) => model.enabled)
      .map((model) => `${model.name || 'model'}:${model.loaded ? 'loaded' : 'not-loaded'}`);
  }, [serviceStatus]);

  const setFile = (file: File | null) => {
    setState((prev) => ({
      ...prev,
      file,
      error: '',
      response: null,
    }));
  };

  const analyzeVideo = async () => {
    if (!state.file) {
      setState((prev) => ({ ...prev, error: 'Please upload one video first.' }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: '', response: null }));

    try {
      const form = new FormData();
      form.set('video', state.file);
      form.set('camera_name', 'Combined Model Tester');
      form.set('class_name', 'combined-model-test');
      form.set('store_alert', 'false');

      const response = await fetch('/api/security-alerts/analyze-video', {
        method: 'POST',
        body: form,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || data?.detail || 'Video analysis failed');
      }

      setState((prev) => ({ ...prev, loading: false, response: data, error: '' }));
    } catch (error: any) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error?.message || 'Video analysis failed',
        response: null,
      }));
    }
  };

  const resultRows = Array.isArray(state.response?.model_results) ? state.response!.model_results! : [];
  const alerts = Array.isArray(state.response?.alerts) ? state.response!.alerts! : [];

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Anomaly Model Tester</h1>
            <p className="text-sm text-slate-600">Upload one video and evaluate all models together from the same inference run.</p>
          </div>
          <button
            type="button"
            onClick={refreshServiceStatus}
            disabled={statusLoading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            {statusLoading ? 'Checking...' : 'Check Service Status'}
          </button>
        </div>

        {serviceStatus ? (
          <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {serviceStatus.error ? (
              <span className="text-rose-700">{serviceStatus.error}</span>
            ) : (
              <>
                <p>
                  Service: <span className="font-semibold">{serviceStatus.running ? 'running' : 'stopped'}</span>
                  {serviceStatus.health?.status ? ` | health: ${serviceStatus.health.status}` : ''}
                </p>
                {loadedModels.length ? <p className="mt-1 text-xs">{loadedModels.join(' | ')}</p> : null}
              </>
            )}
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Shared Video Upload</h2>
        <p className="mt-1 text-sm text-slate-600">Use one clip for fight, fall, and fire together. The backend returns all model results from the same clip.</p>

        <div className="mt-4 space-y-3">
          <input
            type="file"
            accept="video/*"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-indigo-600 file:px-3 file:py-1.5 file:text-white file:font-semibold hover:file:bg-indigo-700"
          />

          <button
            type="button"
            onClick={analyzeVideo}
            disabled={state.loading || !state.file}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {state.loading ? 'Analyzing...' : 'Analyze One Video for All Models'}
          </button>

          {state.file ? (
            <p className="text-xs text-slate-500">Selected: {state.file.name}</p>
          ) : (
            <p className="text-xs text-slate-500">No file selected.</p>
          )}

          {state.error ? <p className="rounded-md bg-rose-50 px-2 py-1 text-xs text-rose-700">{state.error}</p> : null}
        </div>
      </div>

      {state.response ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-700">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${state.response.status === 'ok' ? 'bg-emerald-100 text-emerald-800' : state.response.status === 'warning' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>
                {state.response.status || 'unknown'}
              </span>
              <span>Source: {state.response.source || 'video'}</span>
              <span>Frame: {state.response.frame_index ?? 0}</span>
              <span>Time: {Number(state.response.timestamp || 0).toFixed(2)}s</span>
            </div>
            {state.response.errors && state.response.errors.length > 0 ? (
              <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                {state.response.errors.join(' | ')}
              </div>
            ) : null}
          </div>

          {alerts.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h3 className="text-base font-bold text-slate-900">Unified Alerts</h3>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {alerts.map((alert, index) => (
                  <div key={`${alert.type}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold uppercase text-slate-800">{alert.type}</span>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-700">{alert.severity}</span>
                    </div>
                    <p className="mt-1 text-slate-700">{alert.summary || 'No summary available.'}</p>
                    <p className="mt-2 text-xs text-slate-500">Confidence: {confidencePercent(alert.confidence)}%</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            {EVENTS.map((item) => {
              const packed = detectFromResults(resultRows, item.key);
              return (
                <section key={item.key} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className={`rounded-lg bg-gradient-to-r ${item.accent} p-3 text-white`}>
                    <h2 className="text-lg font-bold">{item.title}</h2>
                    <p className="text-sm text-white/90">{item.description}</p>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${packed.detected ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                      {packed.detected ? 'Detected' : 'Not Detected'}
                    </span>
                    <span className="text-sm text-slate-700">Expected event: <span className="font-semibold uppercase">{item.key}</span></span>
                    {packed.best ? (
                      <span className="text-sm text-slate-700">Confidence: <span className="font-semibold">{confidencePercent(packed.best.confidence)}%</span></span>
                    ) : (
                      <span className="text-sm text-amber-700">No matching model result.</span>
                    )}
                  </div>

                  <div className="mt-3 overflow-x-auto rounded-md border border-slate-200 bg-white">
                    <table className="min-w-full text-xs">
                      <thead className="bg-slate-100 text-slate-700">
                        <tr>
                          <th className="px-2 py-1 text-left">Model</th>
                          <th className="px-2 py-1 text-left">Event</th>
                          <th className="px-2 py-1 text-left">Detected</th>
                          <th className="px-2 py-1 text-left">Confidence</th>
                          <th className="px-2 py-1 text-left">Raw</th>
                          <th className="px-2 py-1 text-left">Frame</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resultRows.length > 0 ? (
                          resultRows
                            .filter((row) => ['fight', 'fall', 'fire'].includes(String(row.event_type || '').toLowerCase()))
                            .sort((a, b) => b.confidence - a.confidence)
                            .map((row, index) => (
                              <tr key={`${row.model_name}-${index}`} className="border-t border-slate-200">
                                <td className="px-2 py-1">{row.model_name}</td>
                                <td className="px-2 py-1 uppercase">{row.event_type}</td>
                                <td className="px-2 py-1">{row.detected ? 'yes' : 'no'}</td>
                                <td className="px-2 py-1">{confidencePercent(row.confidence)}%</td>
                                <td className="px-2 py-1 text-slate-500">raw {confidenceRaw(row.confidence)}</td>
                                <td className="px-2 py-1">{row.frame_index}</td>
                              </tr>
                            ))
                        ) : (
                          <tr>
                            <td className="px-2 py-2 text-slate-500" colSpan={6}>No model results returned.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
            <h3 className="font-bold text-slate-900">What to look for</h3>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>If the correct event is <span className="font-semibold">Detected</span> on its own video, that model is working.</li>
              <li>If the same model says <span className="font-semibold">Detected</span> on unrelated videos, that model or threshold needs correction.</li>
              <li>If model output is correct but fused alerts are wrong, the fusion layer is the problem, not the model.</li>
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
