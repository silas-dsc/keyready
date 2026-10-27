import type { Profession, Profile } from '../engine/types';

export interface Source {
  label: string;
  url: string;
}

/** A static, prerendered SEO page (calculator explainer or guide) for one site. */
export interface Guide {
  slug: string;
  title: string;
  /** Meta description, ≤ 160 chars. */
  description: string;
  /** ISO date the facts were last checked — shown on the page and in JSON-LD. */
  updated: string;
  intro: string;
  sections: { heading: string; body: string[]; table?: { head: string[]; rows: string[][] } }[];
  faq?: [string, string][];
  sources: Source[];
}

export interface SiteConfig {
  /** Folder and build id. 'core' is the general site. */
  id: string;
  /** Recorded on every lead so the broker's feedback can be attributed per sub-market. */
  segment: string;
  name: string;
  /** Final custom domain, once registered and pointed at the deploy. Used for canonical URLs. */
  domain?: string;
  /** Recommended domain (checked available Oct 2026, not yet registered). Move to `domain` once live. */
  plannedDomain?: string;
  theme: { ink: string; inkSoft: string; go: string; mint: string; mintSoft: string; paper: string };
  seo: { title: string; description: string };
  hero: {
    pill: string;
    /** Title split around the highlighted word(s). */
    title: [string, string, string];
    sub: string;
    ticks: string[];
  };
  /** The dark band under the hero. */
  pitch: { title: [string, string]; points: [string, string, string][] };
  faq: [string, string][];
  guides: Guide[];
  wizard: {
    /** Ask which profession the borrower is in (unlocks profession-specific lender rules). */
    profession?: { prompt: string; options: Profession[] };
    /** Ask where the borrower lives and what currency they're paid in. */
    expat?: boolean;
    /** Ask self-employed borrowers whether they have two years of tax returns (alt-doc path). */
    lowDoc?: boolean;
    /** Starting answers, e.g. self-employed on the self-employed site. */
    defaults?: (p: Profile) => Profile;
  };
  sample: () => Profile;
}
