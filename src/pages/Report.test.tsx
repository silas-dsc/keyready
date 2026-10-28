// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import confetti from 'canvas-confetti';
import { MotionGlobalConfig } from 'framer-motion';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixActions } from '../engine/actions';
import { assess } from '../engine/match';
import { newApplicant, sampleProfile } from '../engine/profile';
import { encodeProfile } from '../engine/share';
import type { Profile } from '../engine/types';
import Report from './Report';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const KEY = 'keyready:v1:core';

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname + loc.search}</p>;
}

function renderAt(url: string) {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/report" element={<Report />} />
        <Route path="/check" element={<p>Check page</p>} />
        <Route path="/broker" element={<p>Broker page</p>} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );
}

function saveProfile(profile: Profile, completed = true) {
  localStorage.setItem(KEY, JSON.stringify({ profile, stepId: null, completed, answered: [], updatedAt: 1 }));
}

const stored = () => JSON.parse(localStorage.getItem(KEY)!) as { profile: Profile; completed: boolean };
const slider = (label: string) => {
  const span = screen.getAllByText(label).find(el => el.closest('label')?.querySelector('input[type="range"]'))!;
  return span.closest('label')!.querySelector('input[type="range"]') as HTMLInputElement;
};
const whatIfBanner = () => screen.queryByText(/You’re viewing a what-if/);

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
beforeEach(() => {
  vi.mocked(confetti).mockClear();
});

describe('Report routing', () => {
  it('sends you to the check when nothing is saved', async () => {
    renderAt('/report');
    expect(await screen.findByText('Check page')).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/check');
  });

  it('sends you to the check when the saved answers are not finished', async () => {
    saveProfile(sampleProfile(), false);
    renderAt('/report');
    expect(await screen.findByText('Check page')).toBeInTheDocument();
  });

  it('loads a report link handed over from an AI assistant and tidies the URL', async () => {
    const p: Profile = { ...sampleProfile(), price: 700_000, loan: 600_000 };
    renderAt(`/report?profile=${encodeProfile(p)}`);
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent(/^\/report$/));
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText('Check page')).not.toBeInTheDocument();
    expect(stored().completed).toBe(true);
    expect(stored().profile.price).toBe(700_000);
    expect(screen.getByText(/Loan of \$600,000 on a \$700,000 property/)).toBeInTheDocument();
  });

  it('ignores an unreadable report link and falls back to the check', async () => {
    renderAt('/report?profile=%%%not-base64');
    expect(await screen.findByText('Check page')).toBeInTheDocument();
    expect(localStorage.getItem(KEY) && stored().completed).toBeFalsy();
  });
});

describe('Sample report', () => {
  it('shows the example banner, hides "Edit answers" and never fires confetti', () => {
    renderAt('/report?sample');
    expect(screen.getByText(/This is an example report for a sample buyer/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Get your own in 5 minutes/ })).toHaveAttribute('href', '/check');
    expect(screen.queryByRole('link', { name: 'Edit answers' })).not.toBeInTheDocument();
    expect(confetti).not.toHaveBeenCalled();
  });

  it('has no "Keep these numbers" on a what-if, only Reset', async () => {
    renderAt('/report?sample');
    fireEvent.change(slider('Credit card limits'), { target: { value: '20000' } });
    expect(whatIfBanner()).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Keep these numbers' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await waitFor(() => expect(whatIfBanner()).not.toBeInTheDocument());
  });

  it('warns in the broker form that the sample buyer’s details will be shared', async () => {
    renderAt('/report?sample');
    await userEvent.click(screen.getAllByRole('button', { name: /Connect (with|me with) a broker/ })[0]);
    expect(screen.getByRole('dialog')).toHaveTextContent(/You’re on the example report/);
  });
});

describe('Your report', () => {
  it('renders the hero, key numbers and lenders from your saved answers, and celebrates once', () => {
    const p = sampleProfile();
    saveProfile(p);
    renderAt('/report');
    const a = assess(p);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(`You fit the published rules of ${a.ready} of ${a.results.length} lenders today.`);
    expect(screen.getByRole('img', { name: `${a.ready} ready, ${a.close} close, ${a.notYet} not yet` })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit answers' })).toHaveAttribute('href', '/check');
    const key = screen.getByRole('region', { name: 'Key numbers' });
    for (const t of ['Borrowing power', 'Loan-to-value', 'Cash to complete', 'Repayments']) expect(within(key).getByText(t)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Where you stand with each lender' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: `All ${a.results.length}` })).toHaveAttribute('aria-selected', 'true');
    expect(confetti).toHaveBeenCalledTimes(1);
  });

  it('skips confetti when the user prefers reduced motion', () => {
    const original = window.matchMedia;
    window.matchMedia = vi.fn().mockImplementation((q: string) => ({ matches: true, media: q, addEventListener: vi.fn(), removeEventListener: vi.fn() })) as typeof window.matchMedia;
    try {
      saveProfile(sampleProfile());
      renderAt('/report');
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(confetti).not.toHaveBeenCalled();
    } finally {
      window.matchMedia = original;
    }
  });

  it('prints the page with "Save as PDF"', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    renderAt('/report?sample');
    await userEvent.click(screen.getByRole('button', { name: 'Save as PDF' }));
    expect(print).toHaveBeenCalledOnce();
    print.mockRestore();
  });

  it('runs a what-if, keeps it, and doesn’t celebrate twice', async () => {
    saveProfile(sampleProfile());
    renderAt('/report');
    expect(confetti).toHaveBeenCalledTimes(1);
    const cards = slider('Credit card limits');
    fireEvent.change(cards, { target: { value: '20000' } });
    expect(whatIfBanner()).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toMatch(/today/);
    await userEvent.click(screen.getByRole('button', { name: 'Keep these numbers' }));
    await waitFor(() => expect(whatIfBanner()).not.toBeInTheDocument());
    expect(stored().profile.cardLimits).toBe(20_000);
    expect(confetti).toHaveBeenCalledTimes(1);
  });

  it('treats a what-if dragged back to your real numbers as no what-if', async () => {
    saveProfile(sampleProfile());
    renderAt('/report');
    const cards = slider('Credit card limits');
    fireEvent.change(cards, { target: { value: '9000' } });
    expect(whatIfBanner()).toBeInTheDocument();
    fireEvent.change(cards, { target: { value: '8000' } });
    await waitFor(() => expect(whatIfBanner()).not.toBeInTheDocument());
  });

  it('moves price, deposit and income sliders', () => {
    saveProfile(sampleProfile());
    renderAt('/report?sample');
    fireEvent.change(slider('Purchase price'), { target: { value: '700000' } });
    expect(screen.getByText(/Loan of \$630,000 on a \$700,000 property/)).toBeInTheDocument();
    fireEvent.change(slider('Deposit you put in'), { target: { value: '100000' } });
    expect(screen.getByText(/Loan of \$600,000 on a \$700,000 property/)).toBeInTheDocument();
    fireEvent.change(slider('Base income'), { target: { value: '200000' } });
    expect(slider('Base income').value).toBe('200000');
    expect(whatIfBanner()).toBeInTheDocument();
  });

  it('labels and moves only the main borrower’s income on a joint application', () => {
    const p: Profile = { ...sampleProfile(), mode: 'joint', applicants: [{ ...sampleProfile().applicants[0] }, { ...newApplicant(), baseIncome: 70_000, tenureMonths: 24 }] };
    saveProfile(p);
    renderAt('/report');
    fireEvent.change(slider('Your base income'), { target: { value: '150000' } });
    expect(slider('Your base income').value).toBe('150000');
    expect(whatIfBanner()).toBeInTheDocument();
  });

  it('tries a fast win and scrolls to the top', async () => {
    const p = sampleProfile();
    saveProfile(p);
    renderAt('/report');
    const fixes = fixActions(p, assess(p));
    expect(fixes.length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: 'Your fastest wins' })).toBeInTheDocument();
    expect(screen.getByText(fixes[0].title)).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole('button', { name: 'Try it' })[0]);
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
    expect(whatIfBanner()).toBeInTheDocument();
  });
});

describe('Lender list', () => {
  it('filters by status, shows 12 at a time and expands a row', async () => {
    const p = sampleProfile();
    const a = assess(p);
    renderAt('/report?sample');
    const list = () => screen.getByRole('heading', { name: 'Where you stand with each lender' }).closest('section')!;
    const rows = () => within(list()).getAllByRole('button', { expanded: false }).concat(within(list()).queryAllByRole('button', { expanded: true }));
    expect(rows()).toHaveLength(Math.min(12, a.results.length));
    if (a.results.some(r => r.comparison)) expect(within(list()).getByText(/comparison rate/i, { selector: 'p.text-xs' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: `Show all ${a.results.length} lenders` }));
    expect(rows()).toHaveLength(a.results.length);
    expect(screen.queryByRole('button', { name: /Show all/ })).not.toBeInTheDocument();

    const closeTab = screen.getByRole('tab', { name: `Close ${a.close}` });
    await userEvent.click(closeTab);
    expect(closeTab).toHaveAttribute('aria-selected', 'true');
    await waitFor(() => expect(rows()).toHaveLength(Math.min(12, a.close)));
    for (const r of rows()) expect(r).toHaveTextContent('Close');

    const first = rows()[0];
    await userEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'true');
    expect(within(list()).getByText(/assessed at/)).toBeInTheDocument();
    await userEvent.click(first);
    expect(first).toHaveAttribute('aria-expanded', 'false');
  });
});

describe('Connect with a broker (demo mode)', () => {
  afterEach(() => vi.useRealTimers());

  async function open() {
    renderAt('/report?sample');
    await userEvent.click(screen.getByRole('button', { name: 'Connect with a broker' }));
    return screen.getByRole('dialog');
  }

  it('validates, then saves the lead in this browser', async () => {
    const dialog = await open();
    expect(within(dialog).getByRole('textbox', { name: /^Name/ })).toHaveFocus();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send my report' }));
    for (const msg of ['Add your name.', 'Add a valid email.', 'Add a phone number so the broker can call.', 'Please confirm you’re happy to share your report.'])
      expect(within(dialog).getByText(msg)).toBeInTheDocument();
    expect(localStorage.getItem('keyready:leads')).toBeNull();

    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Name/ }), 'Jane Citizen');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Email/ }), 'jane@example.com');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Mobile/ }), '0412 345 678');
    const evening = within(dialog).getByRole('button', { name: 'Evening' });
    await userEvent.click(evening);
    expect(evening).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(within(dialog).getByRole('checkbox'));
    expect(within(dialog).queryByText('Add your name.')).not.toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send my report' }));

    expect(await within(dialog).findByRole('heading', { name: 'You’re all set, Jane.' })).toBeInTheDocument();
    expect(dialog).toHaveTextContent('A broker will be in touch in the evening with your report already in hand.');
    expect(within(dialog).getByRole('link', { name: 'broker dashboard' })).toHaveAttribute('href', '/broker');
    const leads = JSON.parse(localStorage.getItem('keyready:leads')!);
    expect(leads).toHaveLength(1);
    expect(leads[0]).toMatchObject({ name: 'Jane Citizen', email: 'jane@example.com', preferred_time: 'Evening', consent: true });

    // The page behind keeps working while the confirmation is up.
    fireEvent.change(slider('Credit card limits'), { target: { value: '20000' } });
    expect(within(dialog).getByRole('heading', { name: 'You’re all set, Jane.' })).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole('button', { name: 'Back to my report' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('says "soon" for an anytime call', async () => {
    const dialog = await open();
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Name/ }), 'Sam');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Email/ }), 'sam@example.com');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Mobile/ }), '0400000000');
    await userEvent.click(within(dialog).getByRole('checkbox'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send my report' }));
    expect(await within(dialog).findByText(/A broker will be in touch soon/)).toBeInTheDocument();
  });

  it('closes with Escape but not other keys', async () => {
    await open();
    await userEvent.keyboard('a');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('closes when the backdrop is clicked, not the panel, and with Cancel', async () => {
    const dialog = await open();
    await userEvent.click(within(dialog).getByText('Best time to call'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(dialog.parentElement!);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());

    await userEvent.click(screen.getByRole('button', { name: 'Connect me with a broker' }));
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancel' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('doesn’t submit while a field is still invalid', async () => {
    const dialog = await open();
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Name/ }), 'Jo');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Email/ }), 'not-an-email');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Mobile/ }), '123');
    await userEvent.click(within(dialog).getByRole('checkbox'));
    await act(async () => fireEvent.submit(dialog.querySelector('form')!));
    expect(within(dialog).getByText('Add a valid email.')).toBeInTheDocument();
    expect(within(dialog).getByText('Add a phone number so the broker can call.')).toBeInTheDocument();
    expect(within(dialog).queryByText('Add your name.')).not.toBeInTheDocument();
    expect(localStorage.getItem('keyready:leads')).toBeNull();
  });
});
