import { build } from 'esbuild';

const shared = {
  bundle: true,
  platform: 'node',
  format: 'cjs',
  outdir: 'dist-electron',
  external: ['electron'],
  sourcemap: false,
  minify: false,
};

await Promise.all([
  build({
    ...shared,
    entryPoints: ['electron/main.ts'],
  }),
  build({
    ...shared,
    entryPoints: ['electron/preload.ts'],
  }),
]);

console.log('Electron build complete');
