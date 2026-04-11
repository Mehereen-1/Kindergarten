#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const backendCwd = path.join(rootDir, 'attendance_cctv', 'backend');

const configuredPython = process.env.ATTENDANCE_BACKEND_PYTHON?.trim();
const pythonCandidates = [
  configuredPython,
  path.join(rootDir, 'attendance_cctv', '.venv', 'bin', 'python'),
  'python3',
  'python',
].filter(Boolean);

const backendHost = process.env.ATTENDANCE_BACKEND_HOST || '0.0.0.0';
const backendPort = process.env.ATTENDANCE_BACKEND_PORT || '8000';

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

function startNext() {
  nextProc = spawn('npx', ['next', 'dev'], {
    cwd: rootDir,
    stdio: ['inherit', 'pipe', 'pipe'],
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

function startAttendanceBackend() {
  if (!fs.existsSync(backendCwd)) {
    console.warn(`[dev] attendance backend folder not found at ${backendCwd}`);
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
    env: process.env,
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

startAttendanceBackend();
startNext();
