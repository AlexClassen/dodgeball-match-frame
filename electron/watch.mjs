import * as esbuild from 'esbuild';
import { spawn } from 'node:child_process';
import fs from 'node:fs';

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  external: ['electron', 'sharp'],
};

let electronProcess = null;
let restarting = false;

function startElectron() {
  if (electronProcess) {
    electronProcess.removeAllListeners();
    electronProcess.kill();
    electronProcess = null;
  }

  electronProcess = spawn('npx', ['electron', '.'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, FORCE_COLOR: '1' },
  });

  electronProcess.on('exit', (code, signal) => {
    if (restarting || signal === 'SIGTERM' || signal === 'SIGKILL') {
      restarting = false;
      return;
    }

    process.exit(code ?? 0);
  });
}

function restartElectron() {
  restarting = true;
  startElectron();
}

const mainCtx = await esbuild.context({
  ...shared,
  entryPoints: ['electron/main.ts'],
  outfile: 'dist-electron/main.js',
});

const preloadCtx = await esbuild.context({
  ...shared,
  entryPoints: ['electron/preload.ts'],
  outfile: 'dist-electron/preload.js',
});

await Promise.all([mainCtx.watch(), preloadCtx.watch()]);

console.log('Electron build complete. Starting app...');
startElectron();

let restartTimer = null;
fs.watch('dist-electron', (_eventType, filename) => {
  if (!filename?.endsWith('.js')) {
    return;
  }

  clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    console.log('Electron sources changed, restarting main process...');
    restartElectron();
  }, 200);
});
