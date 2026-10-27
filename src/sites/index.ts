import { core } from './core';
import { expats } from './expats';
import { nurses } from './nurses';
import { professionals } from './professionals';
import { selfEmployed } from './self-employed';
import type { SiteConfig } from './types';

/** Every site in the family. All share one rules engine (src/engine + src/data). */
export const SITES: Record<string, SiteConfig> = { core, professionals, nurses, 'self-employed': selfEmployed, expats };

/** The site this bundle was built for (VITE_SITE, default 'core'). */
export const SITE: SiteConfig = SITES[(import.meta.env.VITE_SITE as string | undefined) ?? 'core'] ?? core;

export const GITHUB_PAGES_ORIGIN = 'https://silas-dsc.github.io/keyready';

/** Public URL of a site: its own domain when it has one, otherwise its GitHub Pages sub-path. */
export function siteUrl(s: SiteConfig): string {
  if (s.domain) return `https://${s.domain}`;
  return s.id === 'core' ? GITHUB_PAGES_ORIGIN : `${GITHUB_PAGES_ORIGIN}/${s.id}`;
}
