// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyProfile } from '../engine/profile';
import type { Assessment } from '../engine/match';
import * as match from '../engine/match';
import { LENDER_COUNT, lenderName } from '../lib/lenderDisplay';
import { SITE, SITES } from '../sites';
import Landing from './Landing';

const fake = vi.hoisted(() => ({ assess: null as null | ((a: Assessment) => Assessment) }));
vi.mock('../engine/match', async importOriginal => {
  const actual = await importOriginal<typeof import('../engine/match')>();
  return { ...actual, assess: (...args: Parameters<typeof actual.assess>) => {
    const real = actual.assess(...args);
    return fake.assess ? fake.assess(real) : real;
  } };
});

const KEY = `keyready:v1:${SITE.id}`;

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
}

const renderLanding = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

afterEach(() => {
  fake.assess = null;
});

describe('Landing', () => {
  it('renders the site hero, pitch, steps and the lender FAQ', () => {
    renderLanding();
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent(SITE.hero.title.join(''));
    expect(screen.getByText(SITE.hero.pill)).toBeInTheDocument();
    expect(screen.getByText(`${LENDER_COUNT} lenders checked.`)).toBeInTheDocument();
    for (const t of SITE.hero.ticks) expect(screen.getByText(t)).toBeInTheDocument();
    for (const [, t] of SITE.pitch.points) expect(screen.getByRole('heading', { name: t })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Three steps to clarity' })).toBeInTheDocument();
    const faqs = screen.getAllByRole('group').map(d => d.querySelector('summary')!.textContent);
    expect(faqs).toEqual([SITE.faq[0][0], SITE.faq[1][0], 'Which lenders do you check?', ...SITE.faq.slice(2).map(f => f[0])].map(q => `${q}+`));
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Part of the/)).not.toBeInTheDocument();
  });

  it('shows the example report from the site sample', () => {
    renderLanding();
    const a = match.assess(SITE.sample());
    expect(screen.getByText(`${a.ready} of ${LENDER_COUNT} lenders`)).toBeInTheDocument();
    const shown = a.results.slice(0, 2).concat(a.results.filter(r => r.status !== 'ready').slice(0, 2));
    for (const r of shown) expect(screen.getAllByText(lenderName(r.lender)).length).toBeGreaterThan(0);
  });

  it('labels each example lender by status and its first blocker', () => {
    fake.assess = real => {
      const [r0, r1, r2, r3] = real.results;
      const fail = { ...r0.checks[0], status: 'fail' as const, detail: 'Deposit too small' };
      return {
        ...real,
        results: [
          { ...r0, status: 'ready', checks: r0.checks.map(c => ({ ...c, status: 'pass' as const })) },
          { ...r1, status: 'ready', checks: [] },
          { ...r2, status: 'close', checks: [fail] },
          { ...r3, status: 'not_yet', checks: [] },
        ],
      };
    };
    renderLanding();
    const card = screen.getByText('Example readiness report').parentElement!;
    const items = within(card).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(within(items[0]).getByText('Meets rules')).toBeInTheDocument();
    expect(within(items[0]).getByText('No blockers found.')).toBeInTheDocument();
    expect(within(items[1]).getByText('Meets rules')).toBeInTheDocument();
    expect(within(items[2]).getByText('Close')).toBeInTheDocument();
    expect(within(items[2]).getByText('Deposit too small')).toBeInTheDocument();
    expect(within(items[3]).getByText('Not yet')).toBeInTheDocument();
    expect(within(items[3]).getByText('No blockers found.')).toBeInTheDocument();
  });

  it('links to the guides and the MCP set-up page', () => {
    renderLanding();
    for (const g of SITE.guides) expect(screen.getByRole('link', { name: new RegExp(g.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })).toHaveAttribute('href', `/guides/${g.slug}/`);
    expect(screen.getByRole('link', { name: 'Set it up in 1 minute →' })).toHaveAttribute('href', 'https://keyready.au/mcp/');
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', '/privacy/');
  });

  it('hides the guides section when the site has none', () => {
    const orig = SITE.guides;
    SITE.guides = [];
    try {
      renderLanding();
      expect(screen.queryByRole('heading', { name: 'Guides' })).not.toBeInTheDocument();
    } finally {
      SITE.guides = orig;
    }
  });

  it('names the family on a sub-site', () => {
    const orig = SITE.id;
    SITE.id = 'nurses';
    try {
      renderLanding();
      expect(screen.getByText(/Part of the/)).toHaveTextContent(`Part of the ${SITES.core.name} family of home-loan readiness checks.`);
    } finally {
      SITE.id = orig;
    }
  });

  it('navigates to the check, the example report and the broker dashboard', async () => {
    const user = userEvent.setup();
    for (const [name, to] of [['Start', '/check'], ['See an example report', '/report?sample'], ['For brokers', '/broker']]) {
      renderLanding();
      await user.click(screen.getByRole('link', { name }));
      expect(screen.getByTestId('where')).toHaveTextContent(to);
      cleanup();
    }
  });

  it('does not offer to resume when nothing was answered', () => {
    localStorage.setItem(KEY, JSON.stringify({ profile: emptyProfile(), answered: [] }));
    renderLanding();
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
  });

  it('offers to pick up an unfinished check', async () => {
    localStorage.setItem(KEY, JSON.stringify({ profile: emptyProfile(), answered: ['a', 'b', 'c'], stepId: 'c' }));
    renderLanding();
    expect(screen.getByText('Welcome back. You’re 3 answers in.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Pick up where I left off' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/check');
  });

  it('offers the finished report', async () => {
    localStorage.setItem(KEY, JSON.stringify({ profile: emptyProfile(), answered: ['a'], completed: true }));
    renderLanding();
    expect(screen.getByText('Your report is ready.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'View my report' }));
    expect(screen.getByTestId('where')).toHaveTextContent('/report');
  });

  it('starts over by clearing the saved check and reloading in place', async () => {
    localStorage.setItem(KEY, JSON.stringify({ profile: emptyProfile(), answered: ['a'] }));
    renderLanding();
    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(screen.queryByTestId('where')).not.toBeInTheDocument();
    // A fresh visit (what nav(0) reloads to in the browser) no longer offers to resume.
    cleanup();
    renderLanding();
    expect(screen.queryByText(/Welcome back/)).not.toBeInTheDocument();
  });
});
