import { defineConfig } from 'vite';

// Desi Fighter web build.
// - Phaser is bundled as a normal dependency.
// - `@desi-fighter/shared` resolves to its compiled `dist` output, so no
//   TypeScript-in-node_modules handling is required.
export default defineConfig({
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    target: 'es2022',
  },
});
