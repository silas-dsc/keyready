#!/usr/bin/env node
/**
 * Bundles the MCP server (with the rules engine and its data), the site catalog and the lead email payload — SDK and zod
 * included — into self-contained ES modules for the Supabase Edge Functions. One source of truth:
 * the functions never carry their own copy of a lending rule.
 */
import { build } from 'vite';

await build({
  logLevel: 'warn',
  configFile: false,
  build: {
    lib: { entry: { 'lead-email': 'src/lib/lead-email.ts', sites: 'src/sites/catalog.ts', mcp: 'src/mcp/server.ts' }, formats: ['es'], fileName: (_f, name) => `${name}.js` },
    outDir: 'supabase/functions/_shared',
    emptyOutDir: false,
    minify: false,
    copyPublicDir: false,
  },
});
console.log('✓ supabase/functions/_shared/{lead-email,sites,mcp}.js');
