// @vitest-environment jsdom
// Report states that real market data can't be relied on to produce: the engine is stubbed per test.
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import confetti from 'canvas-confetti';
import { MotionGlobalConfig } from 'framer-motion';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixActions, type FixAction } from '../engine/actions';
import { stampDuty, type DutyResult } from '../engine/duty';
import { depositScheme, fundsToComplete } from '../engine/finance';
import { MARKET_LENDERS } from '../engine/market';
import { assess, type Assessment } from '../engine/match';
import { sampleProfile } from '../engine/profile';
import type { Check, LenderPolicy, LenderResult, Profile } from '../engine/types';
import { submitLead } from '../lib/leads';
import Report from './Report';

vi.mock('canvas-confetti', () => ({ default: vi.fn() }));
vi.mock('../engine/match', async orig => {
  const m = await orig<typeof import('../engine/match')>();
  return { ...m, assess: vi.fn(m.assess) };
});
vi.mock('../engine/actions', async orig => {
  const m = await orig<typeof import('../engine/actions')>();
  return { ...m, fixActions: vi.fn(m.fixActions) };
});
vi.mock('../engine/duty', async orig => {
  const m = await orig<typeof import('../engine/duty')>();
  return { ...m, stampDuty: vi.fn(m.stampDuty) };
});
vi.mock('../engine/finance', async orig => {
  const m = await orig<typeof import('../engine/finance')>();
  return { ...m, depositScheme: vi.fn(m.depositScheme), fundsToComplete: vi.fn(m.fundsToComplete) };
});
vi.mock('../lib/leads', async orig => {
  const m = await orig<typeof import('../lib/leads')>();
  return { ...m, submitLead: vi.fn(m.submitLead) };
});

const KEY = 'keyready:v1:core';
const BASE: Profile = { ...sampleProfile(), price: 650_000, loan: 580_000 };

function renderReport(url = '/report') {
  return render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/report" element={<Report />} />
        <Route path="/check" element={<p>Check page</p>} />
      </Routes>
    </MemoryRouter>,
  );
}
function renderSaved(profile: Profile = BASE) {
  localStorage.setItem(KEY, JSON.stringify({ profile, stepId: null, completed: true, answered: [], updatedAt: 1 }));
  return renderReport();
}

let seq = 0;
const lender = (o: Partial<LenderPolicy> = {}): LenderPolicy => ({ ...MARKET_LENDERS[0], id: `L${++seq}`, name: `Lender ${seq}`, kind: 'Other bank', source: 'open-banking', policySources: undefined, ...o });
const check = (id: string, status: Check['status'], detail = `${id} detail`): Check => ({ id, label: `${id} rule`, status, detail, weight: 1 });
const result = (o: Partial<LenderResult> = {}, L: Partial<LenderPolicy> = {}): LenderResult => ({
  lender: lender(L), status: 'ready', score: 100, checks: [check('deposit', 'pass')], maxBorrow: 700_000, usesScheme: false, lmiWaived: false,
  rate: 6, comparison: 6.1, assessmentRate: 9, monthlyRepayment: 3_500, ...o,
});
const assessment = (results: LenderResult[], o: Partial<Assessment> = {}): Assessment => ({
  results,
  ready: results.filter(r => r.status === 'ready').length,
  close: results.filter(r => r.status === 'close').length,
  notYet: results.filter(r => r.status === 'not_yet').length,
  borrowingPower: { typical: 600_000, best: 650_000 },
  lvr: 89.2,
  ...o,
});
const fix = (o: Partial<FixAction>): FixAction => ({ id: `f${++seq}`, title: 'A fix', detail: 'Do a thing', unlocks: 0, powerGain: 0, profile: { ...BASE, cardLimits: 0 }, ...o });
const duty = (o: Partial<DutyResult>): DutyResult => ({ duty: 10_000, generalDuty: 10_000, concession: null, foreignSurcharge: 0, fhog: 0, source: 'https://example.gov.au/duty', ...o } as DutyResult);

const h1 = () => screen.getByRole('heading', { level: 1 });
const keyNumbers = () => screen.getByRole('region', { name: 'Key numbers' });
const lenderSection = () => screen.getByRole('heading', { name: 'Where you stand with each lender' }).closest('section')!;
const dutyPanel = () => screen.getByText(/stamp duty & grants/).closest('section')!;

beforeAll(() => {
  MotionGlobalConfig.skipAnimations = true;
});
beforeEach(async () => {
  vi.mocked(confetti).mockClear();
  // Each test starts from the real engine and stubs only what it needs.
  vi.mocked(assess).mockImplementation((await vi.importActual<typeof import('../engine/match')>('../engine/match')).assess);
  vi.mocked(fixActions).mockReturnValue([]);
  vi.mocked(stampDuty).mockImplementation((await vi.importActual<typeof import('../engine/duty')>('../engine/duty')).stampDuty);
  const fin = await vi.importActual<typeof import('../engine/finance')>('../engine/finance');
  vi.mocked(depositScheme).mockImplementation(fin.depositScheme);
  vi.mocked(fundsToComplete).mockImplementation(fin.fundsToComplete);
});

describe('Hero headline', () => {
  it('with nobody ready or close: a clear path, no celebration', () => {
    vi.mocked(assess).mockReturnValue(assessment([result({ status: 'not_yet', score: 40, checks: [check('income', 'fail')] }), result({ status: 'not_yet', score: 30 })]));
    renderSaved();
    expect(h1()).toHaveTextContent('Not yet, but there’s a clear path from here.');
    expect(screen.getByText(/Use the what-if tools to find a price and deposit/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '0 ready, 0 close, 2 not yet' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Your fastest wins' })).not.toBeInTheDocument();
    expect(confetti).not.toHaveBeenCalled();
  });

  it('with some lenders close', () => {
    vi.mocked(assess).mockReturnValue(assessment([result({ status: 'close' }), result({ status: 'close' }), result({ status: 'not_yet' })]));
    renderSaved();
    expect(h1()).toHaveTextContent('You’re close: 2 lenders are within reach.');
    expect(screen.getByText('Small, specific changes would get you over the line. Your fastest wins are below.')).toBeInTheDocument();
  });

  it('with one ready and one close, naming the closest fit', () => {
    const rs = [result({ score: 97 }), result({ status: 'close' })];
    vi.mocked(assess).mockReturnValue(assessment(rs));
    renderSaved();
    expect(h1()).toHaveTextContent('You fit the published rules of 1 of 2 lenders today.');
    expect(screen.getByText(`1 more is close. The closest fit is ${rs[0].lender.name}, meeting 97% of its published rules.`)).toBeInTheDocument();
    expect(confetti).toHaveBeenCalledOnce();
  });

  it('with two close it says "are"; with none close it says nothing about them', () => {
    vi.mocked(assess).mockReturnValue(assessment([result(), result({ status: 'close' }), result({ status: 'close' })]));
    const { unmount } = renderSaved();
    expect(screen.getByText(/^2 more are close\. The closest fit is/)).toBeInTheDocument();
    unmount();
    vi.mocked(assess).mockReturnValue(assessment([result()]));
    renderSaved();
    expect(screen.getByText(/^The closest fit is/)).toBeInTheDocument();
  });

  it('counts LMI waivers only among lenders that are ready or close', () => {
    vi.mocked(assess).mockReturnValue(assessment([result({ lmiWaived: true }), result({ status: 'not_yet', lmiWaived: true })]));
    const { unmount } = renderSaved();
    expect(screen.getByText(/✓ 1 lender publish an LMI waiver for your profession at this LVR, saving about \$/)).toBeInTheDocument();
    unmount();
    vi.mocked(assess).mockReturnValue(assessment([result({ lmiWaived: true }), result({ status: 'close', lmiWaived: true })]));
    renderSaved();
    expect(screen.getByText(/✓ 2 lenders publish an LMI waiver/)).toBeInTheDocument();
  });
});

describe('Key numbers', () => {
  it('estimates repayments when the lender publishes no comparison rate, and adds LMI', () => {
    vi.mocked(assess).mockReturnValue(assessment([result({ status: 'close', comparison: undefined })], { borrowingPower: { typical: 500_000, best: 520_000 } }));
    renderSaved();
    const k = keyNumbers();
    expect(within(k).getByText('per month (estimate), 30 yrs')).toBeInTheDocument();
    expect(within(k).getByText(/^Plus ~\$[\d,]+ mortgage insurance$/)).toBeInTheDocument();
    expect(within(k).getByText('You want $580k')).toBeInTheDocument();
    expect(screen.queryByText(/comparison rate/i, { selector: 'p.text-xs' })).not.toBeInTheDocument();
  });

  it('shows the rate with its comparison rate, and the profession waiver saving', () => {
    vi.mocked(assess).mockReturnValue(assessment([result({ lmiWaived: true, rate: 5.89, comparison: 5.94 })]));
    renderSaved();
    const k = keyNumbers();
    expect(within(k).getByText('per month at 5.89% p.a. (comparison rate 5.94% p.a.), 30 yrs')).toBeInTheDocument();
    expect(within(k).getByText(/^No LMI with a profession waiver \(saves ~\$[\d,]+\)$/)).toBeInTheDocument();
  });

  it('shows no LMI through the 5% Deposit Scheme', () => {
    vi.mocked(assess).mockReturnValue(assessment([result({ status: 'close' }), result({ usesScheme: true })]));
    renderSaved();
    expect(within(keyNumbers()).getByText('No LMI via the 5% Deposit Scheme')).toBeInTheDocument();
  });

  it('shows no mortgage insurance at a low LVR', () => {
    vi.mocked(assess).mockReturnValue(assessment([result()]));
    renderSaved({ ...BASE, loan: 400_000 });
    expect(within(keyNumbers()).getByText('No mortgage insurance')).toBeInTheDocument();
  });

  it('shows the cash shortfall and an included grant', async () => {
    const fin = await vi.importActual<typeof import('../engine/finance')>('../engine/finance');
    vi.mocked(fundsToComplete).mockImplementation(p => {
      const f = fin.fundsToComplete(p);
      return { ...f, costs: { ...f.costs, fhog: 10_000 }, need: 100_000, have: 60_000 };
    });
    renderSaved();
    expect(within(keyNumbers()).getByText('$40k short · incl. $10k grant')).toBeInTheDocument();
  });

  it('copes with nothing needed to complete', async () => {
    const fin = await vi.importActual<typeof import('../engine/finance')>('../engine/finance');
    vi.mocked(fundsToComplete).mockImplementation(p => {
      const f = fin.fundsToComplete(p);
      return { ...f, costs: { ...f.costs, fhog: 0 }, need: 0, have: 0 };
    });
    renderSaved();
    expect(within(keyNumbers()).getByText('✓ Covered, $0 spare')).toBeInTheDocument();
  });
});

describe('Fastest wins', () => {
  it('shows lenders unlocked and borrowing power gained when they matter', () => {
    vi.mocked(fixActions).mockReturnValue([
      fix({ title: 'Close a card', unlocks: 1, powerGain: 4_999 }),
      fix({ title: 'Save more', unlocks: 3, powerGain: 25_000 }),
      fix({ title: 'Wait a month', unlocks: 0, powerGain: 0 }),
    ]);
    renderSaved();
    const items = within(screen.getByRole('heading', { name: 'Your fastest wins' }).closest('section')!).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('+1 lender ready');
    expect(items[0]).not.toHaveTextContent('borrowing power');
    expect(items[1]).toHaveTextContent('+3 lenders ready');
    expect(items[1]).toHaveTextContent('+$25k borrowing power');
    expect(items[2]).not.toHaveTextContent('ready');
  });
});

describe('Lender rows', () => {
  it('says so when a filter has no lenders', async () => {
    vi.mocked(assess).mockReturnValue(assessment([result(), result({ status: 'close' })]));
    renderSaved();
    await userEvent.click(screen.getByRole('tab', { name: 'Not yet 0' }));
    expect(await within(lenderSection()).findByText('No lenders in this group.')).toBeInTheDocument();
  });

  it('leads with the first blocker and lists fails, warnings, then passes', async () => {
    const r = result(
      { status: 'not_yet', score: 55, comparison: undefined, assessmentRate: 8.5, maxBorrow: 450_000, checks: [check('ok', 'pass'), check('caution', 'warn'), check('income', 'fail', 'Income is short'), check('deposit', 'fail')] },
      { kind: 'Specialist', policySources: [{ url: 'https://example.com', retrieved: '2026-10-01' }] },
    );
    vi.mocked(assess).mockReturnValue(assessment([r]));
    renderSaved();
    const row = within(lenderSection()).getByRole('button', { expanded: false });
    expect(row).toHaveTextContent('Income is short (+1 more)');
    expect(row).toHaveTextContent('Specialist');
    expect(row).not.toHaveTextContent('comparison rate');
    await userEvent.click(row);
    const items = within(lenderSection()).getAllByRole('listitem').filter(li => li.firstElementChild?.hasAttribute('aria-label'));
    expect(items.map(li => li.querySelector('[aria-label]')!.getAttribute('aria-label'))).toEqual(['fail', 'fail', 'warn', 'pass']);
    expect(items.map(li => li.querySelector('[aria-label]')!.textContent)).toEqual(['✕', '✕', '!', '✓']);
    expect(items[2]).toHaveTextContent('caution rule. caution detail');
    const footer = within(lenderSection()).getByText(/Rate not shown/);
    expect(footer).toHaveTextContent('Rate not shown: the lender doesn’t publish a comparison rate for it · assessed at 8.50% · serviceable up to $450,000 · some rules confirmed from the lender’s website (2026-10-01)');
  });

  it('notes the 5% Deposit Scheme when nothing blocks it, and the lender’s own published rates', async () => {
    vi.mocked(assess).mockReturnValue(assessment([result({ usesScheme: true, rate: 6.2, comparison: 6.25 }, { source: 'published', kind: 'Customer-owned' })]));
    renderSaved();
    const row = within(lenderSection()).getByRole('button', { expanded: false });
    expect(row).toHaveTextContent('No blockers, and you can use the 5% Deposit Scheme here.');
    expect(row).toHaveTextContent('Customer-owned · 6.20% p.a. (comparison rate 6.25% p.a.)');
    await userEvent.click(row);
    expect(within(lenderSection()).getByText(/at your LVR \(lender’s published rates\)/)).toHaveTextContent('Rate 6.20% p.a. (comparison rate 6.25% p.a.) at your LVR (lender’s published rates)');
  });

  it('suggests starting with a lender with no blockers, citing Open Banking data', async () => {
    vi.mocked(assess).mockReturnValue(assessment([result()]));
    renderSaved();
    const row = within(lenderSection()).getByRole('button', { expanded: false });
    expect(row).toHaveTextContent('No blockers found. A broker can start here.');
    expect(row).not.toHaveTextContent('more)');
    await userEvent.click(row);
    expect(within(lenderSection()).getByText(/Open Banking data as of/)).not.toHaveTextContent('confirmed from the lender’s website');
  });
});

describe('Stamp duty panel', () => {
  it('celebrates $0 duty with the concession saving and a grant', () => {
    vi.mocked(stampDuty).mockReturnValue(duty({ duty: 0, generalDuty: 25_000, concession: 'First home buyer exemption', fhog: 10_000 }));
    renderSaved({ ...BASE, state: 'VIC' });
    const d = dutyPanel();
    expect(within(d).getByText('VIC stamp duty & grants')).toBeInTheDocument();
    expect(within(d).getByText('$0 🎉')).toBeInTheDocument();
    expect(within(d).getByText('✓ First home buyer exemption saves you $25,000')).toBeInTheDocument();
    expect(within(d).getByText('✓ First Home Owner Grant: $10,000')).toBeInTheDocument();
    expect(within(d).getByRole('link', { name: 'Official source' })).toHaveAttribute('href', 'https://example.gov.au/duty');
  });

  it('hides a concession that saves nothing, and shows a foreign surcharge', () => {
    vi.mocked(stampDuty).mockReturnValue(duty({ duty: 40_000, generalDuty: 40_000, concession: 'Some concession', foreignSurcharge: 52_000 }));
    renderSaved();
    const d = dutyPanel();
    expect(within(d).getByText('$40,000')).toBeInTheDocument();
    expect(within(d).queryByText(/Some concession/)).not.toBeInTheDocument();
    expect(within(d).queryByText(/No first home buyer concession/)).not.toBeInTheDocument();
    expect(within(d).getByText('Foreign purchaser surcharge: $52,000')).toBeInTheDocument();
  });

  it('tells a first home buyer when no concession applies, and says nothing to anyone else', () => {
    vi.mocked(stampDuty).mockReturnValue(duty({}));
    const { unmount } = renderSaved({ ...BASE, firstHome: true, state: 'NSW' });
    expect(within(dutyPanel()).getByText('No first home buyer concession applies to this purchase in NSW.')).toBeInTheDocument();
    unmount();
    renderSaved({ ...BASE, firstHome: false });
    expect(within(dutyPanel()).queryByText(/No first home buyer concession/)).not.toBeInTheDocument();
    expect(within(dutyPanel()).queryAllByRole('listitem')).toHaveLength(0);
  });
});

describe('Government scheme panel', () => {
  it('names the Family Home Guarantee when eligible', () => {
    vi.mocked(depositScheme).mockReturnValue({ eligible: true, variant: 'family', minDepositPct: 2, cap: 800_000, reasons: [] } as unknown as ReturnType<typeof depositScheme>);
    renderSaved();
    const s = screen.getByRole('heading', { name: 'Family Home Guarantee' }).closest('section')!;
    expect(s).toHaveTextContent('Looks like you qualify: buy with as little as 2% deposit and no mortgage insurance, up to a $800,000 price in your area.');
  });

  it('lists why the 5% Deposit Scheme doesn’t apply', () => {
    vi.mocked(depositScheme).mockReturnValue({ eligible: false, variant: null, minDepositPct: 5, cap: 800_000, reasons: ['Reason one.', 'Reason two.'] } as unknown as ReturnType<typeof depositScheme>);
    renderSaved();
    const s = screen.getByRole('heading', { name: '5% Deposit Scheme' }).closest('section')!;
    expect(within(s).getAllByRole('listitem').map(li => li.textContent)).toEqual(['Reason one.', 'Reason two.']);
  });
});

describe('Connect form errors', () => {
  it('shows why the lead couldn’t be sent, and "Sending…" while it goes', async () => {
    let fail!: (e: Error) => void;
    vi.mocked(submitLead).mockImplementation(() => new Promise<void>((_, reject) => { fail = reject; }));
    renderReport('/report?sample');
    await userEvent.click(screen.getByRole('button', { name: 'Connect with a broker' }));
    const dialog = screen.getByRole('dialog');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Name/ }), 'Jane');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Email/ }), 'jane@example.com');
    await userEvent.type(within(dialog).getByRole('textbox', { name: /^Mobile/ }), '0412345678');
    await userEvent.click(within(dialog).getByRole('checkbox'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send my report' }));
    expect(within(dialog).getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(submitLead).toHaveBeenCalledWith(expect.objectContaining({ name: 'Jane', email: 'jane@example.com', consent: true, profile: expect.any(Object), summary: expect.any(Object) }));
    fail(new Error('Network down'));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Couldn’t send: Network down');
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Send my report' })).toBeEnabled());
  });
});
