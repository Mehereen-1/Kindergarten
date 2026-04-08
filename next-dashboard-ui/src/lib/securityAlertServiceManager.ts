import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import path from 'path';

type ServiceState = {
  child: ChildProcessWithoutNullStreams | null;
  logs: string[];
  startedAt: number | null;
  startupPromise: Promise<{
    started?: boolean;
    stopped?: boolean;
    reason: string;
    status: ServiceStatus;
  }> | null;
};

type ServiceStatus = {
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  serviceUrl: string;
  health: unknown | null;
  logs: string[];
};

const globalKey = '__kindergartenSecurityAlertServiceState__';

function getState(): ServiceState {
  const globalStore = globalThis as typeof globalThis & Record<string, ServiceState | undefined>;
  if (!globalStore[globalKey]) {
    globalStore[globalKey] = {
      child: null,
      logs: [],
      startedAt: null,
      startupPromise: null,
    };
  }
  return globalStore[globalKey]!;
}

function appendLog(line: string) {
  const state = getState();
  state.logs.push(line.trim());
  if (state.logs.length > 200) {
    state.logs = state.logs.slice(-200);
  }
}

export function getServiceUrl() {
  return (process.env.ANOMALY_SERVICE_URL || 'http://127.0.0.1:8010').replace(/\/+$/, '');
}

async function fetchHealth() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch(`${getServiceUrl()}/anomaly/health`, {
      cache: 'no-store',
      signal: controller.signal,
    });
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function hasHealthyResponse(status: ServiceStatus) {
  return Boolean(status.health && typeof status.health === 'object');
}

async function waitForHealthyService(timeoutMs: number): Promise<ServiceStatus | null> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = await getSecurityAlertServiceStatus();
    if (hasHealthyResponse(status)) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return null;
}

function isChildAlive(child: ChildProcessWithoutNullStreams | null) {
  return Boolean(child && child.exitCode === null && !child.killed);
}

export async function getSecurityAlertServiceStatus(): Promise<ServiceStatus> {
  const state = getState();
  const health = await fetchHealth();
  const running = isChildAlive(state.child) || Boolean(health);
  if (!running && state.child && state.child.exitCode !== null) {
    state.child = null;
  }

  return {
    running,
    pid: state.child?.pid ?? null,
    startedAt: state.startedAt ? new Date(state.startedAt).toISOString() : null,
    serviceUrl: getServiceUrl(),
    health,
    logs: state.logs.slice(-30),
  };
}

export async function ensureSecurityAlertServiceReady(timeoutMs = 60000): Promise<ServiceStatus> {
  let status = await getSecurityAlertServiceStatus();
  if (hasHealthyResponse(status)) {
    return status;
  }

  const startResult = await startSecurityAlertService();
  status = startResult.status;
  if (hasHealthyResponse(status)) {
    return status;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    status = await getSecurityAlertServiceStatus();
    if (hasHealthyResponse(status)) {
      return status;
    }
  }

  const lastLog = status.logs[status.logs.length - 1];
  throw new Error(
    lastLog
      ? `Anomaly service did not become ready in time. Last log: ${lastLog}`
      : 'Anomaly service did not become ready in time.'
  );
}

export async function startSecurityAlertService() {
  const state = getState();
  if (state.startupPromise) {
    return state.startupPromise;
  }

  const startupTask = (async () => {
  const health = await fetchHealth();
  if (health) {
    return {
      started: false,
      reason: 'Service already responding',
      status: await getSecurityAlertServiceStatus(),
    };
  }

  if (isChildAlive(state.child)) {
    return {
      started: false,
      reason: 'Service process already running',
      status: await getSecurityAlertServiceStatus(),
    };
  }

  const host = process.env.ANOMALY_SERVICE_HOST || '127.0.0.1';
  const port = process.env.ANOMALY_SERVICE_PORT || '8010';
  const serviceDir = path.join(process.cwd(), 'secuirty-alerts');
  const mainPath = path.join(serviceDir, 'main.py');
  const candidates: Array<{ command: string; prefixArgs: string[] }> = [];
  if (process.env.ANOMALY_SERVICE_PYTHON) {
    candidates.push({ command: process.env.ANOMALY_SERVICE_PYTHON, prefixArgs: [] });
  }
  candidates.push(
    { command: 'python', prefixArgs: [] },
    { command: 'py', prefixArgs: ['-3'] },
    { command: 'py', prefixArgs: [] }
  );

  let lastFailure = 'Unable to start anomaly service';

  for (const candidate of candidates) {
    let startupError = '';
    let sawPortInUse = false;
    const args = [...candidate.prefixArgs, mainPath, '--serve', '--host', host, '--port', port];
    appendLog(`[manager] starting service with ${candidate.command} ${args.join(' ')}`);

    const child = spawn(candidate.command, args, {
      cwd: serviceDir,
      windowsHide: true,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
      stdio: 'pipe',
    });

    state.child = child;
    state.startedAt = Date.now();

    child.stdout.on('data', (chunk: Buffer | string) => {
      appendLog(`[stdout] ${String(chunk)}`);
    });

    child.stderr.on('data', (chunk: Buffer | string) => {
      const text = String(chunk);
      if (text.includes('WinError 10048') || text.includes('[Errno 10048]') || text.includes('address already in use')) {
        sawPortInUse = true;
      }
      appendLog(`[stderr] ${text}`);
    });

    child.on('error', (error) => {
      startupError = error.message;
      appendLog(`[manager] process error: ${error.message}`);
    });

    child.on('exit', (code, signal) => {
      appendLog(`[manager] service exited code=${String(code)} signal=${String(signal)}`);
      const current = getState();
      if (current.child?.pid === child.pid) {
        current.child = null;
      }
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));
    const status = await getSecurityAlertServiceStatus();
    if (status.running) {
      return {
        started: true,
        reason: status.health ? 'Service is running' : 'Service process started and is warming up',
        status,
      };
    }

    if (sawPortInUse) {
      const reusedStatus = await waitForHealthyService(10000);
      if (reusedStatus) {
        appendLog('[manager] existing anomaly service detected on configured port; reusing it');
        return {
          started: false,
          reason: 'Existing anomaly service is already running on the configured port',
          status: reusedStatus,
        };
      }
    }

    if (startupError) {
      lastFailure = startupError;
    } else if (sawPortInUse) {
      lastFailure = `Port ${port} is already in use, but no healthy anomaly service responded`;
    } else if (!isChildAlive(child)) {
      lastFailure = 'Python process exited before the anomaly service became available';
    }
  }

  return {
    started: false,
    reason: lastFailure,
    status: await getSecurityAlertServiceStatus(),
  };
  })();

  state.startupPromise = startupTask;
  try {
    return await startupTask;
  } finally {
    const latestState = getState();
    if (latestState.startupPromise === startupTask) {
      latestState.startupPromise = null;
    }
  }
}

export async function stopSecurityAlertService() {
  const state = getState();
  const child = state.child;
  if (!child || !isChildAlive(child)) {
    state.child = null;
    return {
      stopped: false,
      reason: 'No running service process found',
      status: await getSecurityAlertServiceStatus(),
    };
  }

  appendLog(`[manager] stopping service pid=${child.pid}`);
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    });
    await new Promise((resolve) => killer.on('exit', resolve));
  } else {
    child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (isChildAlive(child)) {
      child.kill('SIGKILL');
    }
  }

  state.child = null;

  return {
    stopped: true,
    reason: 'Stop command sent',
    status: await getSecurityAlertServiceStatus(),
  };
}
