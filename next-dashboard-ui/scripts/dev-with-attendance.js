#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendCwd = path.join(rootDir, 'attendance_cctv', 'backend');

const configuredPython = process.env.ATTENDANCE_BACKEND_PYTHON?.trim();
const pythonCandidates = [
  configuredPython,
  path.join(rootDir, 'attendance_cctv', '.venv', 'Scripts', 'python.exe'),
  path.join(rootDir, 'attendance_cctv', 'backend', '.venv', 'Scripts', 'python.exe'),
  path.join(rootDir, 'attendance_cctv', '.venv', 'bin', 'python'),
  path.join(rootDir, 'attendance_cctv', 'backend', '.venv', 'bin', 'python'),
  'python3',
  'python',
].filter(Boolean);

const backendHost = process.env.ATTENDANCE_BACKEND_HOST || '0.0.0.0';
const backendPort = process.env.ATTENDANCE_BACKEND_PORT || '8000';
const backendBaseUrls = [
  `http://127.0.0.1:${backendPort}`,
  `http://localhost:${backendPort}`,
];
const nextBaseUrls = [
  'http://127.0.0.1:3000',
  'http://localhost:3000',
];

let nextProc;
let backendProc;
let shuttingDown = false;

function findPythonExecutable() {
  for (const candidate of pythonCandidates) {
    if (candidate.includes(path.sep)) {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      continue;
    }
    return candidate;
  }
  return null;
}

function log(prefix, text) {
  process.stdout.write(`${prefix} ${text}`);
}

function wireOutput(proc, prefix) {
  if (proc.stdout) {
    proc.stdout.on('data', (chunk) => log(prefix, chunk.toString()));
  }
  if (proc.stderr) {
    proc.stderr.on('data', (chunk) => log(prefix, chunk.toString()));
  }
}

async function probeBackend(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(`${url}/debug`, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      return false;
    }

    const data = await response.json().catch(() => null);
    return Boolean(
      data &&
      typeof data === 'object' &&
      ('mongodb_connected' in data || 'embeddings_loaded' in data || 'student_names' in data)
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function isBackendAlreadyRunning() {
  for (const url of backendBaseUrls) {
    if (await probeBackend(url)) {
      return true;
    }
  }
  return false;
}

async function probeNext(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      return false;
    }

    const html = await response.text();
    return html.includes('__NEXT_DATA__') || html.includes('/_next/');
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function isNextAlreadyRunning() {
  for (const url of nextBaseUrls) {
    if (await probeNext(url)) {
      return true;
    }
  }
  return false;
}

async function startNext() {
  if (await isNextAlreadyRunning()) {
    console.log('[dev] Next.js already running at http://localhost:3000');
    return;
  }

  nextProc = spawn('npx', ['next', 'dev'], {
    cwd: rootDir,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    env: process.env,
  });

  wireOutput(nextProc, '[next]');

  nextProc.on('exit', (code, signal) => {
    if (shuttingDown) return;
    if (signal) {
      console.log(`[dev] next exited with signal ${signal}`);
      shutdown(0);
      return;
    }
    console.log(`[dev] next exited with code ${code ?? 0}`);
    shutdown(code ?? 0);
  });
}

async function startAttendanceBackend() {
  if (!fs.existsSync(backendCwd)) {
    console.warn(`[dev] attendance backend folder not found at ${backendCwd}`);
    return;
  }

  if (await isBackendAlreadyRunning()) {
    console.log(`[dev] Attendance backend already running at http://127.0.0.1:${backendPort}`);
    return;
  }

  const pythonExec = findPythonExecutable();
  if (!pythonExec) {
    console.warn('[dev] No Python executable found for attendance backend.');
    return;
  }

  const args = ['-m', 'uvicorn', 'main:app', '--host', backendHost, '--port', backendPort];

  backendProc = spawn(pythonExec, args, {
    cwd: backendCwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: {
      ...process.env,
      PYTHONUTF8: '1',
      PYTHONIOENCODING: 'utf-8',
    },
  });

  wireOutput(backendProc, '[attendance]');

  backendProc.on('error', (err) => {
    console.error(`[dev] Failed to start attendance backend: ${err.message}`);
  });

  backendProc.on('exit', (code, signal) => {
    if (shuttingDown) return;
    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.warn(`[dev] attendance backend exited (${reason}).`);
  });

  console.log(
    `[dev] Started attendance backend with ${pythonExec} at http://${backendHost === '0.0.0.0' ? '127.0.0.1' : backendHost}:${backendPort}`
  );
}

function stopProcess(proc, name) {
  if (!proc || proc.killed) return;
  try {
    proc.kill('SIGTERM');
  } catch {
    // Ignore errors while shutting down child processes.
  }

  setTimeout(() => {
    if (!proc.killed) {
      try {
        proc.kill('SIGKILL');
      } catch {
        // Ignore errors while shutting down child processes.
      }
    }
  }, 1500).unref();

  console.log(`[dev] Stopping ${name}...`);
}

function shutdown(exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  stopProcess(backendProc, 'attendance backend');
  stopProcess(nextProc, 'next dev server');
  setTimeout(() => process.exit(exitCode), 200).unref();
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
process.on('uncaughtException', (err) => {
  console.error('[dev] Uncaught exception:', err);
  shutdown(1);
});

void startAttendanceBackend();
void startNext();
