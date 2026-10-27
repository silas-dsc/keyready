import { SITES, siteUrl } from './index';

/** Names and URLs of every site, for the Edge Functions (emails, MCP links). Bundled by scripts/bundle-rules.mjs. */
export const SITE_CATALOG: Record<string, { name: string; segment: string; url: string }> = Object.fromEntries(
  Object.values(SITES).map(s => [s.id, { name: s.name, segment: s.segment, url: siteUrl(s) }]),
);
