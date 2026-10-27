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

/** Where the GitHub Pages deploy is served: keyready.au (custom domain on the Pages site). */
export const PAGES_ORIGIN = 'https://keyready.au';

/** Public URL of a site: its own domain when it has one, otherwise its path on the Pages deploy. */
export function siteUrl(s: SiteConfig): string {
  if (s.domain) return `https://${s.domain}`;
  return s.id === 'core' ? PAGES_ORIGIN : `${PAGES_ORIGIN}/${s.id}`;
}
