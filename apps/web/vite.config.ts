import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  envDir: path.resolve(__dirname, '../..'),
  // Zero-downtime deploys: nginx serves dist/ directly on the droplet and the
  // build runs in place. Emptying the outDir at build start (Vite's default)
  // briefly leaves dist incomplete → the served bundle flickers / chunks 404
  // for the few seconds the build runs. Keeping the old (content-hashed) chunks
  // means the previous bundle stays fully serveable until index.html is
  // overwritten last, pointing at the freshly-written chunks. Old chunks are
  // pruned by the deploy workflow so dist doesn't grow unbounded.
  build: { emptyOutDir: false },
  plugins: [tailwindcss(), react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: Number(process.env.WEB_PORT ?? 5173),
  },
  preview: {
    host: '0.0.0.0',
    port: Number(process.env.WEB_PORT ?? 5173),
  },
});
