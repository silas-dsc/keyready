import { describe, expect, it } from 'vitest';
import { fixActions } from './actions';
import { depositScheme, fmtMoney, fmtShortMoney, incomeTax, livingExpensesMonthly, repayment } from './finance';
import { BASE_POLICY, ILLUSTRATIVE_LENDERS } from './lenders';
import { assess } from './match';
import { emptyProfile, newApplicant } from './profile';
import { sanitizeProfile } from './sanitize';
import { summarise } from './summary';
import type { Profile } from './types';

const strong = (): Profile => ({
  ...emptyProfile(),
  applicants: [{ ...newApplicant(), age: 34, tenureMonths: 48, baseIncome: 140_000 }],
  savings: 160_000, state: 'WA', price: 650_000, loan: 520_000, creditScore: 820,
});

describe('finance', () => {
  it('taxes only above the tax-free threshold in the bottom bracket', () => {
    expect(incomeTax(10_000)).toBeCloseTo(200, 6); // Medicare only
    expect(incomeTax(30_000)).toBeCloseTo(11_800 * 0.15 + 600, 6);
  });
  it('living expenses: sharing households and single-applicant families', () => {
    expect(livingExpensesMonthly('sharing', 0, 0, false)).toBe(1_850);
    expect(livingExpensesMonthly('family', 1, 0, false)).toBe(2_050 + 750);
  });
  it('repays principal evenly at a zero rate', () => {
    expect(repayment(120_000, 0, 10)).toBe(1_000);
  });
  it('offers single parents the Family Home Guarantee at 2%', () => {
    const s = depositScheme({ ...strong(), firstHome: false, dependants: 1 });
    expect(s).toMatchObject({ variant: 'family', minDepositPct: 2, eligible: true });
  });
  it('formats non-finite money as a dash', () => {
    expect(fmtMoney(Infinity)).toBe('—');
    expect(fmtShortMoney(NaN)).toBe('—');
  });
  it('formats short money in millions, thousands and dollars', () => {
    expect(fmtShortMoney(1_250_000)).toBe('$1.25m');
    expect(fmtShortMoney(1_500_000)).toBe('$1.5m');
    expect(fmtShortMoney(2_000_000)).toBe('$2.0m');
    expect(fmtShortMoney(45_600)).toBe('$46k');
    expect(fmtShortMoney(999.6)).toBe('$1000');
  });
});

describe('fixActions', () => {
  it('ignores a close employment gap that has no wait time', () => {
    const p = strong();
    const base = assess(p, ILLUSTRATIVE_LENDERS);
    base.results[0] = { ...base.results[0], checks: [...base.results[0].checks, { id: 'employment', label: 'Time in role', status: 'fail', gap: 'close', weight: 3, detail: '' }] };
    expect(fixActions(p, base, ILLUSTRATIVE_LENDERS).some(f => f.id === 'tenure')).toBe(false);
  });
});

describe('summarise', () => {
  it('names ready lenders by brand, or by masked name when there is none', () => {
    const p = strong();
    const lenders = [{ ...BASE_POLICY, id: 'A', name: 'Lender A', kind: 'Other bank' as const }, { ...BASE_POLICY, id: 'B', name: 'Lender B', kind: 'Other bank' as const, brand: 'Bravo' }];
    const s = summarise(p, assess(p, lenders));
    expect(s.ready).toBe(2);
    expect(s.topLenders.sort()).toEqual(['Bravo', 'Lender A']);
  });
});

describe('sanitizeProfile', () => {
  it('keeps a listed profession', () => {
    expect(sanitizeProfile({ applicants: [{}], profession: 'nurse' })!.profession).toBe('nurse');
  });
});
