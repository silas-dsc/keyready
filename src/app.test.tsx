// @vitest-environment jsdom
import { act, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SITE, SITES } from './sites';
import { BROKER_DISCLOSURE } from './sites/broker';

vi.mock('./pages/Landing', () => ({ default: () => <p>Landing page</p> }));
vi.mock('./pages/Check', () => ({ default: () => <p>Check page</p> }));
vi.mock('./pages/Report', () => ({ default: () => <p>Report page</p> }));
vi.mock('./pages/Broker', () => ({ default: () => <p>Broker page</p> }));
vi.mock('./pages/Confirm', () => ({ default: () => <p>Confirm page</p> }));

const root = vi.hoisted(() => ({ rendered: [] as ReactNode[], containers: [] as Element[] }));
vi.mock('react-dom/client', () => ({
  createRoot: (el: Element) => {
    root.containers.push(el);
    return { render: (node: ReactNode) => root.rendered.push(node) };
  },
}));

afterEach(() => {
  window.location.hash = '';
});

describe('App routes', () => {
  it.each([
    ['', 'Landing page'],
    ['#/check', 'Check page'],
    ['#/report?sample', 'Report page'],
    ['#/broker', 'Broker page'],
    ['#/confirm?token=x', 'Confirm page'],
    ['#/no-such-page', 'Landing page'],
  ])('%s → %s', async (hash, text) => {
    window.location.hash = hash;
    const { default: App } = await import('./App');
    render(<App />);
    expect(screen.getByText(text)).toBeInTheDocument();
  });

  it('follows back/forward navigation', async () => {
    const { default: App } = await import('./App');
    render(<App />);
    expect(screen.getByText('Landing page')).toBeInTheDocument();
    await act(async () => {
      window.location.hash = '#/broker';
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByText('Broker page')).toBeInTheDocument();
  });
});

describe('main', () => {
  it('captures attribution, applies the site theme and mounts the app into #root', async () => {
    const el = document.createElement('div');
    el.id = 'root';
    document.body.appendChild(el);
    window.history.replaceState(null, '', '/?utm_source=newsletter');
    try {
      await import('./main');
      expect(root.containers).toEqual([el]);
      expect(root.rendered).toHaveLength(1);
      render(<>{root.rendered[0]}</>);
      expect(screen.getByText('Landing page')).toBeInTheDocument();
      const style = document.documentElement.style;
      expect(style.getPropertyValue('--color-ink')).toBe(SITE.theme.ink);
      expect(style.getPropertyValue('--color-ink-soft')).toBe(SITE.theme.inkSoft);
      expect(style.getPropertyValue('--color-mint-soft')).toBe(SITE.theme.mintSoft);
      expect(style.getPropertyValue('--color-paper')).toBe(SITE.theme.paper);
      expect(JSON.parse(localStorage.getItem(`keyready:attr:${SITE.id}`)!)).toMatchObject({ utm_source: 'newsletter' });
    } finally {
      el.remove();
      window.history.replaceState(null, '', '/');
    }
  });
});

describe('entry-server', () => {
  it('exports the site, ids and disclosure for the build script', async () => {
    const m = await import('./entry-server');
    expect(m.SITE).toBe(SITE);
    expect(m.SITE_IDS).toEqual(Object.keys(SITES));
    expect(m.BROKER_DISCLOSURE).toBe(BROKER_DISCLOSURE);
    expect(m.PRIVACY.slug).toBe('privacy');
  });

  it('prerenders the landing page', async () => {
    const m = await import('./entry-server');
    expect(m.renderLanding()).toContain('Landing page');
  });

  it('prerenders a guide and the privacy policy', async () => {
    const m = await import('./entry-server');
    const g = SITE.guides[0];
    const html = m.renderGuide(g.slug, 'https://keyready.au/');
    expect(html).toContain('<h1');
    expect(html).toContain(g.title.replace(/&/g, '&amp;').replace(/'/g, '&#x27;').replace(/"/g, '&quot;'));
    expect(html).toContain('href="https://keyready.au/#/check"');
    expect(m.renderGuide('privacy', '/')).toContain(m.PRIVACY.title.replace(/&/g, '&amp;').replace(/'/g, '&#x27;'));
  });

  it('refuses an unknown guide', async () => {
    const m = await import('./entry-server');
    expect(() => m.renderGuide('nope', '/')).toThrow(`No guide nope on site ${SITE.id}`);
  });
});
