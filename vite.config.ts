import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// BASE_PATH lets the same build serve from a GitHub Pages sub-path (/<repo>/) or a root domain.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  // The bundled Open Banking snapshot adds ~85 kB; still well under 200 kB gzipped overall.
  build: { chunkSizeWarningLimit: 700 },
});
