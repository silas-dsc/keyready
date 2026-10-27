#!/usr/bin/env node
/**
 * Bundles the rules engine (with its data), the site catalog and the MCP server — SDK and zod
 * included — into self-contained ES modules for the Supabase Edge Functions. One source of truth:
 * the functions never carry their own copy of a lending rule.
 */
import { build } from 'vite';

await build({
  logLevel: 'warn',
  configFile: false,
  build: {
    lib: { entry: { rules: 'src/engine/index.ts', sites: 'src/sites/catalog.ts', mcp: 'src/mcp/server.ts' }, formats: ['es'], fileName: (_f, name) => `${name}.js` },
    outDir: 'supabase/functions/_shared',
    emptyOutDir: false,
    minify: false,
    copyPublicDir: false,
  },
});
console.log('✓ supabase/functions/_shared/{rules,sites,mcp}.js');
