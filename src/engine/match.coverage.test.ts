import { describe, expect, it, vi } from 'vitest';
import { BASE_POLICY } from './lenders';
import { assess, borrower, evaluate } from './match';
import { emptyProfile, newApplicant } from './profile';
import { lmiWaiverFor, shadingFor } from './segments';
import type { Applicant, LenderPolicy, Profile } from './types';

// Fixed segment rules so these tests don't depend on the real (hand-maintained) segment data.
vi.mock('../data/segment-policies.json', () => ({
  default: {
    lmiWaivers: [
      { brand: 'WaiverBank', professions: ['doctor'], maxLvr: 90, sources: [] },
      { brand: 'WaiverBank', professions: ['doctor'], maxLvr: 95, minIncome: 300_000, purposes: ['owner'], conditions: 'Qualifications verified.', sources: [] },
    ],
    altDoc: [
      { brand: 'AltBank', minAbnMonths: 12, maxLvr: 80, rateLoading: 1, evidence: 'BAS statements', sources: [] },
      { brand: 'AltNull', minAbnMonths: null, maxLvr: 80, sources: [] },
    ],
    expat: [
      { brand: 'ExpatBank', acceptsNonResidents: true, foreignIncome: [{ currencies: ['USD'], shading: 0.7, maxLvr: 80 }, { currencies: ['GBP'], shading: 0.75, maxLvr: null }], sources: [] },
    ],
    incomeShading: [{ brand: 'ShadeBank', professions: ['nurse'], shading: { overtime: 1 }, sources: [] }],
  },
}));

const L = (o: Partial<LenderPolicy> = {}): LenderPolicy => ({ ...BASE_POLICY, id: 'T', name: 'Test', kind: 'Other bank', ...o });
const app = (o: Partial<Applicant> = {}): Applicant => ({ ...newApplicant(), age: 34, tenureMonths: 48, baseIncome: 140_000, ...o });
const good = (o: Partial<Profile> = {}): Profile => ({
  ...emptyProfile(), applicants: [app()], firstHome: false, state: 'WA', price: 600_000, loan: 480_000, savings: 200_000, creditScore: 800, ...o,
});
const check = (p: Profile, lender: LenderPolicy, id: string) => evaluate(p, lender).checks.find(c => c.id === id);

describe('borrower', () => {
  it('drops a non-working, no-income co-borrower from the employment checks', () => {
    const p = good({ mode: 'joint', applicants: [app(), { ...newApplicant(), age: 30, employment: 'not_working' }] });
    expect(borrower(p).workers).toHaveLength(1);
  });
  it('keeps a sole non-working borrower', () => {
    const p = good({ applicants: [{ ...newApplicant(), age: 30, employment: 'not_working' }] });
    expect(borrower(p).workers).toHaveLength(1);
    expect(check(p, L(), 'employment')).toMatchObject({ status: 'fail', gap: 'far' });
  });
  it('charges no HECS repayment when there is no main borrower', () => {
    const b = borrower(good({ applicants: [], personalLoans: 10_000, hecs: 30_000 }));
    expect(b.fixedCommitments).toBe(250);
  });
});

describe('alt-doc (low-doc) lending', () => {
  const se = (tenureMonths: number) => [app({ employment: 'self_employed', tenureMonths })];

  it('uses the alt-doc loan when ABN tenure is below the full-doc minimum', () => {
    const r = evaluate(good({ applicants: se(18) }), L({ brand: 'AltBank' }));
    expect(r.checks.find(c => c.id === 'employment')).toMatchObject({ label: 'Documents', status: 'pass', detail: expect.stringContaining('BAS statements') });
    expect(r.comparison).toBeUndefined();
  });
  it('treats a lender with no self-employed minimum as never meeting full-doc', () => {
    const lender = L({ brand: 'AltBank', minTenure: { ...BASE_POLICY.minTenure, self_employed: null } });
    expect(check(good({ applicants: se(100) }), lender, 'employment')).toMatchObject({ label: 'Documents', status: 'pass' });
  });
  it('fails low-doc applicants short of the ABN minimum', () => {
    expect(check(good({ applicants: se(6), lowDoc: true }), L({ brand: 'AltBank' }), 'employment')!.detail)
      .toBe('Its alt-doc (low-doc) loan needs 12+ months of ABN registration.');
  });
  it('accepts low-doc applicants at any ABN age when the lender publishes no minimum', () => {
    expect(check(good({ applicants: se(0), lowDoc: true }), L({ brand: 'AltNull' }), 'employment')).toMatchObject({ label: 'Documents', status: 'pass' });
  });
  it('falls back to generic evidence wording', () => {
    expect(check(good({ applicants: se(6), lowDoc: true }), L({ brand: 'AltNull' }), 'employment')!.detail)
      .toContain('BAS, business bank statements or an accountant’s letter');
  });
  it('fails low-doc applicants at a full-doc-only lender', () => {
    expect(check(good({ applicants: se(30), lowDoc: true }), L(), 'employment')!.detail).toMatch(/full documents/);
  });
  it('words a self-employed tenure gap as ABN trading time', () => {
    expect(check(good({ applicants: se(10) }), L(), 'employment')).toMatchObject({
      label: 'Time in role', gap: 'far', waitMonths: 14, detail: expect.stringContaining('trading on your ABN'),
    });
  });
});

describe('foreign income', () => {
  it('reports the counted share and any LVR cap', () => {
    expect(check(good({ incomeCurrency: 'USD' }), L({ brand: 'ExpatBank' }), 'foreign-income')!.detail).toBe('Counts about 70% of USD income, up to 80% LVR.');
    expect(check(good({ incomeCurrency: 'GBP' }), L({ brand: 'ExpatBank' }), 'foreign-income')!.detail).toBe('Counts about 75% of GBP income.');
  });
});

describe('credit history', () => {
  it('bankruptcy: close when within a year of the minimum, far when the lender never lends', () => {
    expect(check(good({ bankruptcyYears: 1 }), L({ bankruptcyMinYears: 2 }), 'credit')).toMatchObject({ status: 'fail', gap: 'close', detail: 'Needs 2+ years since bankruptcy discharge.' });
    expect(check(good({ bankruptcyYears: 1 }), L({ bankruptcyMinYears: 5 }), 'credit')).toMatchObject({ gap: 'far' });
    expect(check(good({ bankruptcyYears: 1 }), L(), 'credit')).toMatchObject({ gap: 'far', detail: "Doesn't lend after a bankruptcy." });
  });
  it('credit score: close within 60 points, far beyond', () => {
    expect(check(good({ creditScore: 500 }), L(), 'credit')).toMatchObject({ label: 'Credit score', gap: 'close' });
    expect(check(good({ creditScore: 300 }), L(), 'credit')).toMatchObject({ gap: 'far', detail: expect.stringContaining('A score of 300') });
  });
  it('warns when unsure about defaults', () => {
    expect(check(good({ defaults: 'unsure' }), L(), 'credit')).toMatchObject({ status: 'warn', detail: expect.stringMatching(/^Worth checking/) });
  });
});

describe('loan type and LVR', () => {
  it('fails vacant land at a lender that does not lend on it', () => {
    expect(check(good({ dwelling: 'land' }), L({ maxLvr: { ...BASE_POLICY.maxLvr, land: 0 } }), 'lvr')!.detail).toBe("Doesn't offer vacant land loans.");
  });
  it('applies the apartment LVR limit', () => {
    expect(check(good({ dwelling: 'apartment' }), L({ maxLvr: { ...BASE_POLICY.maxLvr, apartment: 70 } }), 'lvr')).toMatchObject({ status: 'fail', detail: expect.stringContaining('above the 70% maximum') });
  });
});

describe('profession LMI waivers', () => {
  const doc = (baseIncome: number) => good({ profession: 'doctor', applicants: [app({ baseIncome })], loan: 528_000 });
  it('uses a waiver without conditions when the higher one needs more income', () => {
    const r = evaluate(doc(140_000), L({ brand: 'WaiverBank' }));
    expect(r.lmiWaived).toBe(true);
    expect(r.checks.find(c => c.id === 'lmi')!.detail).toMatch(/up to 90% LVR, saving about \$[\d,]+\.$/);
  });
  it('picks the highest-LVR waiver the borrower qualifies for, with its conditions', () => {
    const r = evaluate(doc(400_000), L({ brand: 'WaiverBank' }));
    expect(r.checks.find(c => c.id === 'lmi')!.detail).toMatch(/up to 95% LVR.* Qualifications verified\.$/);
  });
  it('counts no income for a missing main borrower', () => {
    expect(lmiWaiverFor({ ...doc(400_000), applicants: [] }, L({ brand: 'WaiverBank' }))!.maxLvr).toBe(90);
  });
  it('applies profession income shading to the main borrower', () => {
    expect(shadingFor(good({ profession: 'nurse' }), L({ brand: 'ShadeBank' })).overtime).toBe(1);
  });
});

describe('savings and funds', () => {
  it('genuine savings: close when nearly 5%, far when well short', () => {
    expect(check(good({ loan: 540_000, savings: 20_000 }), L(), 'genuine')).toMatchObject({ status: 'fail', gap: 'close' });
    expect(check(good({ loan: 540_000, savings: 5_000 }), L(), 'genuine')).toMatchObject({ status: 'fail', gap: 'far' });
  });
  it('counts the First Home Owner Grant toward funds to complete', () => {
    const p = good({ firstHome: true, condition: 'new', state: 'QLD', loan: 540_000, savings: 10_000 });
    expect(check(p, L(), 'funds')).toMatchObject({ status: 'fail', detail: expect.stringContaining('including the $30,000 grant') });
  });
});

describe('DTI and term', () => {
  it('warns on high but allowed DTI', () => {
    const p = good({ applicants: [app({ baseIncome: 100_000 })], price: 900_000, loan: 650_000, savings: 400_000 });
    expect(check(p, L({ maxDti: 7 }), 'dti')).toMatchObject({ status: 'warn', detail: expect.stringMatching(/^6\.5× income counts as high DTI/) });
  });
  it('warns when age shortens the loan term', () => {
    expect(check(good({ applicants: [app({ age: 60 })] }), L(), 'age')!.detail).toMatch(/limited to 15 years/);
  });
});

describe('assess', () => {
  it('falls back to every lender for borrowing power when none would take the borrower on', () => {
    const p = good({ applicants: [app({ residency: 'other' })] });
    const a = assess(p, [L(), L({ id: 'U', maxDti: 9 })]);
    expect(a.results.every(r => r.checks.some(c => c.id === 'residency' && c.status === 'fail'))).toBe(true);
    const powers = a.results.map(r => r.maxBorrow).sort((x, y) => x - y);
    expect(a.borrowingPower).toEqual({ typical: powers[1], best: powers[1] });
    expect(a.borrowingPower.typical).toBeGreaterThan(0);
  });
  it('reports zero borrowing power with no lenders', () => {
    expect(assess(good(), [])).toMatchObject({ results: [], ready: 0, borrowingPower: { typical: 0, best: 0 } });
  });
});
