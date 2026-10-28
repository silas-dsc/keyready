// @vitest-environment jsdom
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MotionGlobalConfig } from 'framer-motion';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { emptyProfile, newApplicant } from '../engine/profile';
import type { Applicant, Profile } from '../engine/types';
import type { Saved } from '../lib/store';
import Check from './Check';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));

const KEY = 'keyready:v1:core';

beforeAll(() => {
  // Step transitions finish instantly so AnimatePresence swaps questions straight away.
  MotionGlobalConfig.skipAnimations = true;
});
afterEach(() => {
  vi.useRealTimers();
});

function seed(stepId: string | null, over: Partial<Profile> = {}, answered: string[] = [], applicants: Partial<Applicant>[] = [{}]) {
  const profile: Profile = { ...emptyProfile(), ...over, applicants: applicants.map(a => ({ ...newApplicant(), ...a })) };
  const s: Saved = { profile, stepId, completed: false, answered, updatedAt: 1 };
  localStorage.setItem(KEY, JSON.stringify(s));
}
const saved = (): Saved => JSON.parse(localStorage.getItem(KEY)!);

function renderCheck() {
  return render(
    <MemoryRouter initialEntries={['/check']}>
      <Routes>
        <Route path="/" element={<p>HOME PAGE</p>} />
        <Route path="/check" element={<Check />} />
        <Route path="/report" element={<p>REPORT PAGE</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

const heading = () => screen.getByRole('heading', { level: 1 });
const counter = () => heading().previousElementSibling!.textContent;
const sections = () => within(screen.getByRole('list', { name: 'Sections' })).getAllByRole('listitem');
const sidebar = () => screen.getByRole('complementary', { name: 'Your progress' });

describe('Check page', () => {
  it('starts a fresh visitor on the first question', () => {
    renderCheck();
    expect(heading()).toHaveTextContent('Are you buying on your own, or with someone?');
    expect(heading()).toHaveFocus();
    expect(counter()).toBe('You · 1 of 18');
    expect(screen.getByText('Saved on this device')).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progress' })).toHaveAttribute('aria-valuenow', '6');
    // Single-choice question: no Continue button until answered, and a key tip instead of the Enter hint.
    expect(screen.queryByRole('button', { name: /Continue/ })).not.toBeInTheDocument();
    expect(screen.getByText('Tip: press 1–9 to choose')).toBeInTheDocument();
    expect(screen.queryByText('or press Enter ↵')).not.toBeInTheDocument();
    expect(within(sidebar()).getByText('Your borrowing power appears here once we know your income.')).toBeInTheDocument();
    expect(within(sidebar()).queryByText('What you’ve told us')).not.toBeInTheDocument();
    expect(sections()[0]).toHaveAttribute('aria-current', 'step');
    expect(sections()[1]).not.toHaveAttribute('aria-current');
    expect(sections()[1]).toHaveClass('text-muted');
    // The question's "why" shows in both the mobile disclosure and the sidebar.
    expect(screen.getAllByText(/Banks combine incomes and living costs/)).toHaveLength(2);
  });

  it('auto-advances after a number-key choice and saves progress', async () => {
    renderCheck();
    await userEvent.keyboard('1');
    expect(await screen.findByRole('heading', { name: 'Is this your first home?' })).toBeInTheDocument();
    expect(counter()).toBe('You · 2 of 18');
    expect(saved()).toMatchObject({ stepId: 'firstHome', answered: ['mode'] });
    expect(within(sidebar()).getByRole('button', { name: /Buying\s*On my own/ })).toBeInTheDocument();
  });

  it('branches into co-borrower questions when buying together', async () => {
    renderCheck();
    await userEvent.click(screen.getByRole('radio', { name: /With someone/ }));
    expect(await screen.findByRole('heading', { name: 'Will this be your first home?' })).toBeInTheDocument();
    expect(counter()).toBe('You · 2 of 24');
    expect(saved().profile.applicants).toHaveLength(2);
  });

  it('shows Continue on an answered single-choice question and goes back a step', async () => {
    seed('firstHome', {}, ['mode', 'firstHome']);
    renderCheck();
    expect(screen.queryByText('Tip: press 1–9 to choose')).not.toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /Yes, first home/ })).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(await screen.findByRole('heading', { name: 'Are you buying on your own, or with someone?' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(await screen.findByRole('heading', { name: 'Is this your first home?' })).toBeInTheDocument();
  });

  it('Back on the first question leaves for the home page', async () => {
    renderCheck();
    await userEvent.click(screen.getByRole('button', { name: '← Back' }));
    expect(screen.getByText('HOME PAGE')).toBeInTheDocument();
  });

  it('falls back to the first question for an unknown saved step', () => {
    seed('no-such-step');
    renderCheck();
    expect(counter()).toBe('You · 1 of 18');
  });

  it('blocks Enter on an invalid answer, then advances once fixed', async () => {
    seed('age-0', {}, ['mode', 'firstHome']);
    renderCheck();
    expect(screen.getByText('or press Enter ↵')).toBeInTheDocument();
    const input = screen.getByLabelText('Age in years');
    await userEvent.type(input, '16{Enter}');
    expect(screen.getByRole('alert')).toHaveTextContent('Borrowers need to be 18 or over.');
    expect(heading()).toHaveTextContent('How old are you?');
    await userEvent.clear(input);
    await userEvent.type(input, '34{Enter}');
    expect(await screen.findByRole('heading', { name: "What's your residency status?" })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(saved().answered).toContain('age-0');
  });

  it('leaves Enter on a focused button to that button', async () => {
    seed('age-0', {}, ['mode', 'firstHome']);
    renderCheck();
    screen.getByRole('button', { name: '← Back' }).focus();
    await userEvent.keyboard('{Enter}');
    expect(await screen.findByRole('heading', { name: 'Is this your first home?' })).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('offers a skip link on optional questions, and shows the sub-heading', async () => {
    seed('debts', {}, []);
    renderCheck();
    expect(screen.getByText('Leave blank whatever doesn’t apply.')).toBeInTheDocument();
    expect(counter()).toBe('Money · 10 of 18');
    const items = sections();
    expect(items[0]).toHaveTextContent('✓ You');
    expect(items[0]).toHaveClass('text-go');
    expect(items[2]).toHaveClass('text-ink');
    expect(items[2]).toHaveAttribute('aria-current', 'step');
    expect(items[3]).toHaveClass('text-muted');
    await userEvent.click(screen.getByRole('button', { name: 'No debts' }));
    expect(await screen.findByRole('heading', { name: 'Who’s in your household?' })).toBeInTheDocument();
  });

  it('shows a live borrowing estimate and lets you edit earlier answers', async () => {
    seed('price', { price: 600_000, loan: 480_000 }, ['age-0', 'income-0', 'otherIncome'], [{ age: 30, baseIncome: 120_000, tenureMonths: 30 }]);
    renderCheck();
    const side = within(sidebar());
    expect(side.getByText('You could borrow up to')).toBeInTheDocument();
    expect(side.getByText('LVR 80.0%')).toBeInTheDocument();
    expect(side.getByText('What you’ve told us')).toBeInTheDocument();
    expect(side.getByRole('button', { name: /Income\s*\$120,000/ })).toBeInTheDocument();
    await userEvent.click(side.getByRole('button', { name: /Age\s*30/ }));
    expect(await screen.findByRole('heading', { name: 'How old are you?' })).toBeInTheDocument();
  });

  it('estimates without an LVR before a price is entered', () => {
    seed('savings', {}, [], [{ age: 30, baseIncome: 120_000 }]);
    renderCheck();
    expect(within(sidebar()).getByText('You could borrow up to')).toBeInTheDocument();
    expect(within(sidebar()).queryByText(/^LVR/)).not.toBeInTheDocument();
  });

  it('finishes on the last question: crunching screen, then the report', () => {
    vi.useFakeTimers();
    seed('score', {}, []);
    renderCheck();
    expect(counter()).toBe('Credit · 18 of 18');
    fireEvent.click(screen.getByRole('button', { name: 'See my results' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Matching you against \d+ lenders…/);
    expect(screen.getByText('Stress-testing at +3% (APRA buffer)')).toBeInTheDocument();
    expect(saved()).toMatchObject({ completed: true });
    expect(saved().answered).toContain('score');
    act(() => vi.advanceTimersByTime(2600));
    expect(screen.getByText('REPORT PAGE')).toBeInTheDocument();
  });

  it('cancels a pending auto-advance when the page unmounts', () => {
    vi.useFakeTimers();
    const { unmount } = renderCheck();
    fireEvent.click(screen.getByRole('radio', { name: /Just me/ }));
    unmount();
    act(() => vi.advanceTimersByTime(1000));
    expect(saved().stepId).toBeNull();
  });
});
