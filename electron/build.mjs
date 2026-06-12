import * as esbuild from 'esbuild';

const shared = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  external: ['electron', 'sharp'],
};

await Promise.all([
  esbuild.build({
    ...shared,
    entryPoints: ['electron/main.ts'],
    outfile: 'dist-electron/main.js',
  }),
  esbuild.build({
    ...shared,
    entryPoints: ['electron/preload.ts'],
    outfile: 'dist-electron/preload.js',
  }),
]);

console.log('Electron build complete.');
