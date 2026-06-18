import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      '/sample-data': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // UI review fix #8 — split the heavy vendors out of the single 1.1MB
        // chunk so they download in parallel and cache independently.
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('recharts') || id.includes('/d3-') || id.includes('victory-vendor')) return 'charts';
          // Keep the whole React ecosystem — including react-router and its
          // transitive deps (@remix-run/router, history) — in ONE self-contained
          // chunk. If the router's deps land in `vendor` while react-vendor
          // imports them, Rollup reports a `vendor -> react-vendor -> vendor`
          // circular chunk. Capturing them here removes that back-edge.
          if (id.includes('react-router') || id.includes('@remix-run') || id.includes('/history/') || id.includes('/react-dom/') || id.includes('/react/') || id.includes('scheduler')) return 'react-vendor';
          return 'vendor';
        },
      },
    },
  },
});
