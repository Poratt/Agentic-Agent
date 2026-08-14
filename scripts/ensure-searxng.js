#!/usr/bin/env node
/**
 * Ensures a local SearXNG container is running before the backend dev server starts.
 * Invoked automatically as the "prestart:dev" npm hook in backend/package.json.
 *
 * Cross-platform Node.js replacement for the original bash script — avoids
 * WSL/Git Bash PATH issues on Windows.
 */
const { execFileSync } = require('child_process');
const http = require('http');
const path = require('path');
const fs = require('fs');

const CONTAINER_NAME = 'searxng';
const PORT = 8080;

// Resolve repo root relative to this script so it works whether npm runs from
// backend/ or the repo root (do not rely on process.cwd()).
const SCRIPT_DIR = __dirname;
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..');
const SETTINGS_PATH = path.join(REPO_ROOT, 'docker', 'searxng', 'settings.yml');

function log(msg) {
  console.log(`ensure-searxng: ${msg}`);
}

function fail(msg) {
  console.error(`ensure-searxng: ${msg}`);
  process.exit(1);
}

function commandExists(cmd) {
  try {
    const check = process.platform === 'win32' ? 'where' : 'which';
    execFileSync(check, [cmd], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function dockerAvailable() {
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function dockerPsRunning() {
  try {
    const out = execFileSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf8' });
    return out.split('\n').map((l) => l.trim()).includes(CONTAINER_NAME);
  } catch {
    return false;
  }
}

function dockerPsAll() {
  try {
    const out = execFileSync('docker', ['ps', '-a', '--format', '{{.Names}}'], { encoding: 'utf8' });
    return out.split('\n').map((l) => l.trim()).includes(CONTAINER_NAME);
  } catch {
    return false;
  }
}

function httpReady() {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${PORT}`, (res) => {
      res.resume();
      resolve(res.statusCode < 500);
    });
    req.on('error', () => resolve(false));
    req.setTimeout(1000, () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

(async () => {
  if (!fs.existsSync(SETTINGS_PATH)) {
    fail(`settings file not found: ${SETTINGS_PATH}`);
  }

  if (!commandExists('docker')) {
    fail('docker not found in PATH');
  }

  if (!dockerAvailable()) {
    fail("docker daemon not running — open Docker Desktop and wait until the tray icon shows 'running'");
  }

  // A running container does not guarantee the host port is mapped/usable.
  // Always verify HTTP reachability first; only trust it when both conditions hold.
  if (dockerPsRunning()) {
    if (await httpReady()) {
      log(`already running on port ${PORT}`);
      process.exit(0);
    }
    log('container is running but port 8080 is not reachable from the host — recreating with port mapping');
    execFileSync('docker', ['rm', '-f', CONTAINER_NAME], { stdio: 'inherit' });
  } else if (await httpReady()) {
    // Port 8080 may already have SearXNG responding (another container or manual run).
    log(`already responding on port ${PORT} (external or another container)`);
    process.exit(0);
  }

  try {
    if (dockerPsAll()) {
      log('starting existing container');
      execFileSync('docker', ['start', CONTAINER_NAME], { stdio: 'inherit' });
    } else {
      log('creating container');
      execFileSync(
        'docker',
        [
          'run',
          '-d',
          '--name',
          CONTAINER_NAME,
          '-p',
          `${PORT}:8080`,
          '-v',
          `${SETTINGS_PATH}:/etc/searxng/settings.yml`,
          'searxng/searxng',
        ],
        { stdio: 'inherit' },
      );
    }
  } catch (err) {
    // docker start/run failed. Check if port 8080 already has SearXNG responding.
    if (await httpReady()) {
      log(`port ${PORT} already has SearXNG responding (started externally)`);
      process.exit(0);
    }
    fail(`docker command failed and port ${PORT} is not responding. Check if another process is using the port.`);
  }

  // Wait for HTTP readiness (container "running" != SearXNG answering yet).
  // First-time `docker run` pulls the image from Docker Hub (~200MB) which can
  // take 30-60s on slow connections, so allow up to 60s. Print progress dots so
  // the user knows the script is not stuck.
  const MAX_WAIT = 60;
  for (let i = 1; i <= MAX_WAIT; i++) {
    if (await httpReady()) {
      console.log('');
      log(`up on port ${PORT}`);
      process.exit(0);
    }
    if (i % 10 === 0) process.stdout.write('.');
    await sleep(1000);
  }

  console.log('');
  fail(`did not become ready in ${MAX_WAIT}s`);
})();
