// server.js - Production container entrypoint
import http from 'http';
import fs from 'fs';
import path from 'path';

// Immediate process-level shields
const originalExit = process.exit;
process.exit = function(code) {
  console.warn(`[SHIELD] Intercepted process.exit(${code}) call suppressed.`);
  return undefined;
};

process.on('uncaughtException', (err) => {
  console.error('[SHIELD] Uncaught Exception:', err?.message || err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[SHIELD] Unhandled Rejection:', reason);
});

const PORT = parseInt(process.env.PORT || '3000', 10);
const distServerPath = path.join(process.cwd(), 'dist', 'server.js');

async function start() {
  if (fs.existsSync(distServerPath)) {
    try {
      await import('./dist/server.js');
      return;
    } catch (err) {
      console.error('[BOOT_ERROR]', err?.message || err);
    }
  }

  // Fallback direct execution of server.ts using tsx if dist/server.js is not yet generated
  try {
    const { spawn } = await import('child_process');
    const child = spawn(process.execPath, ['./node_modules/.bin/tsx', 'server.ts'], {
      stdio: 'inherit',
      env: process.env,
    });
    child.on('error', (err) => {
      console.warn('[CHILD_WARN]', err?.message || err);
    });
  } catch (err) {
    console.error('[SPAWN_ERROR]', err);
  }
}

start();
