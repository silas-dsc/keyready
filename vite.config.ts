/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// BASE_PATH lets the same build serve from a GitHub Pages sub-path (/<repo>/) or a root domain.
export default defineConfig({
  base: process.env.BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  // The bundled Open Banking snapshot adds ~85 kB; still well under 200 kB gzipped overall.
  build: { chunkSizeWarningLimit: 700 },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['**/*.test.*', 'src/**/__fixtures__/**'],
      // json-summary and json feed the PR coverage comment in CI; html is uploaded as an artifact.
      reporter: ['text-summary', 'json-summary', 'json', 'html'],
      reportOnFailure: true,
      // The rules engine and the MCP server are where a silent regression costs most: keep them covered.
      thresholds: {
        'src/engine/**': { lines: 95, branches: 85 },
        'src/mcp/**': { lines: 90, branches: 55 },
      },
    },
  },
});
