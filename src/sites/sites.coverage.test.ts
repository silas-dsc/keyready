import { afterEach, describe, expect, it, vi } from 'vitest';
import { SITES, PAGES_ORIGIN, siteUrl } from './index';
import { core } from './core';
import { selfEmployed } from './self-employed';
import { newApplicant, emptyProfile } from '../engine/profile';
import { assess } from '../engine/match';
import { ILLUSTRATIVE_LENDERS } from '../engine/lenders';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('site registry', () => {
  it('keys every site by its own id', () => {
    for (const [key, s] of Object.entries(SITES)) expect(s.id).toBe(key);
  });

  it('every sample profile is a complete, assessable profile for its site', () => {
    for (const s of Object.values(SITES)) {
      const p = s.sample();
      expect(p.applicants.length).toBeGreaterThan(0);
      expect(p.price).toBeGreaterThan(0);
      expect(assess(p, ILLUSTRATIVE_LENDERS).results.length).toBe(ILLUSTRATIVE_LENDERS.length);
    }
    expect(SITES.nurses.sample().profession).toBe('nurse');
    expect(SITES.professionals.sample().profession).toBe('doctor');
    expect(SITES.expats.sample().incomeCurrency).toBe('USD');
    expect(SITES['self-employed'].sample().applicants[0].employment).toBe('self_employed');
  });

  it('self-employed wizard defaults only the first applicant to self-employed', () => {
    const p = { ...emptyProfile(), applicants: [newApplicant(), newApplicant()] };
    const out = selfEmployed.wizard.defaults!(p);
    expect(out.applicants[0].employment).toBe('self_employed');
    expect(out.applicants[1].employment).toBe(p.applicants[1].employment);
    expect(out.applicants[1]).toBe(p.applicants[1]);
  });
});

describe('siteUrl', () => {
  it('uses a custom domain when one is set', () => {
    expect(siteUrl({ ...core, domain: 'example.au' })).toBe('https://example.au');
  });
  it('serves core at the Pages root and other sites under their id', () => {
    expect(siteUrl(core)).toBe(PAGES_ORIGIN);
    expect(siteUrl(SITES.nurses)).toBe(`${PAGES_ORIGIN}/nurses`);
  });
});

describe('SITE (build-time selection)', () => {
  it('defaults to core when VITE_SITE is unset', async () => {
    vi.stubEnv('VITE_SITE', undefined);
    const { SITE } = await import('./index');
    expect(SITE.id).toBe('core');
  });
  it('picks the named site', async () => {
    vi.stubEnv('VITE_SITE', 'nurses');
    const { SITE } = await import('./index');
    expect(SITE.id).toBe('nurses');
  });
  it('falls back to core for an unknown site id', async () => {
    vi.stubEnv('VITE_SITE', 'nope');
    const { SITE } = await import('./index');
    expect(SITE.id).toBe('core');
  });
});

describe('privacyPolicy', () => {
  it('names the site and uses the default privacy contact', async () => {
    vi.stubEnv('VITE_CONTACT_EMAIL', '');
    const { privacyPolicy } = await import('./privacy');
    const g = privacyPolicy('KeyReady');
    expect(g.slug).toBe('privacy');
    expect(g.title).toContain('KeyReady');
    expect(g.intro).toContain('privacy@keyready.au');
    expect(g.sections.length).toBeGreaterThan(0);
    expect(g.sources.length).toBe(2);
  });
  it('uses VITE_CONTACT_EMAIL when set', async () => {
    vi.stubEnv('VITE_CONTACT_EMAIL', 'hello@example.au');
    const { privacyPolicy } = await import('./privacy');
    const g = privacyPolicy('X');
    expect(g.intro).toContain('hello@example.au');
    expect(g.sections.at(-2)!.body[0]).toContain('hello@example.au');
  });
});
