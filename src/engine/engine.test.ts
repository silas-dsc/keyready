import { describe, expect, it } from 'vitest';
import { fixActions } from './actions';
import { depositScheme, hecsRepayment, incomeTax, lvr, principalFor, repayment, upfrontCosts } from './finance';
import { ILLUSTRATIVE_LENDERS } from './lenders';
import { assess as assessWith } from './match';
import { emptyProfile, newApplicant, sampleProfile } from './profile';
import type { Profile } from './types';

// Engine behaviour is tested against the fixed illustrative lenders so live rate changes can't break it.
const assess = (p: Profile) => assessWith(p, ILLUSTRATIVE_LENDERS);

const strong = (): Profile => ({
  ...emptyProfile(),
  applicants: [{ ...newApplicant(), age: 34, tenureMonths: 48, baseIncome: 140_000 }],
  savings: 160_000,
  state: 'WA',
  price: 650_000,
  loan: 520_000,
  creditScore: 820,
});

describe('finance', () => {
  it('computes 2026–27 tax including Medicare', () => {
    expect(incomeTax(18_200)).toBeCloseTo(364, 0);
    expect(incomeTax(100_000)).toBeCloseTo(4_020 + 55_000 * 0.3 + 2_000, 0);
  });

  it('round-trips repayment and principal', () => {
    const m = repayment(500_000, 9, 30);
    expect(principalFor(m, 9, 30)).toBeCloseTo(500_000, 0);
  });

  it('has no HECS repayment under the threshold', () => {
    expect(hecsRepayment(60_000, 20_000)).toBe(0);
    expect(hecsRepayment(100_000, 20_000)).toBeCloseTo(4_950, 0);
  });

  it('gives first home buyers a duty exemption under the threshold', () => {
    expect(upfrontCosts({ ...strong(), price: 450_000 }).stampDuty).toBe(0);
    expect(upfrontCosts({ ...strong(), firstHome: false }).stampDuty).toBeGreaterThan(0);
  });

  it('checks 5% Deposit Scheme eligibility', () => {
    expect(depositScheme(strong()).eligible).toBe(true);
    expect(depositScheme({ ...strong(), price: 900_000 }).eligible).toBe(false);
    expect(depositScheme({ ...strong(), purpose: 'investment' }).eligible).toBe(false);
  });
});

describe('matching', () => {
  it('a strong applicant is ready with most lenders', () => {
    const a = assess(strong());
    expect(lvr(strong())).toBeCloseTo(80, 0);
    expect(a.ready).toBeGreaterThanOrEqual(8);
    expect(a.borrowingPower.best).toBeGreaterThan(600_000);
  });

  it('temporary visa holders are limited to a few lenders', () => {
    const p = strong();
    p.applicants[0].residency = 'temporary_visa';
    const a = assess(p);
    expect(a.results.filter(r => r.checks.find(c => c.id === 'residency')?.status === 'fail').length).toBeGreaterThan(6);
  });

  it('a recent default leaves only specialists', () => {
    const a = assess({ ...strong(), defaults: 'yes' });
    expect(a.results.filter(r => r.status === 'ready').every(r => r.lender.kind === 'Specialist')).toBe(true);
  });

  it('new casual work is close, not ready, at mainstream banks', () => {
    const p = strong();
    p.applicants[0].employment = 'casual';
    p.applicants[0].tenureMonths = 4;
    const a = assess(p);
    expect(a.close).toBeGreaterThan(0);
    expect(a.ready).toBeLessThan(assess(strong()).ready);
  });

  it('over-borrowing fails serviceability', () => {
    const a = assess({ ...strong(), price: 1_400_000, loan: 1_240_000 });
    expect(a.ready).toBe(0);
    expect(a.results[0].checks.find(c => c.id === 'service')?.status).toBe('fail');
  });

  it('first home buyers can use the scheme at 95% LVR without LMI', () => {
    const a = assess({ ...strong(), price: 600_000, loan: 570_000, savings: 50_000 });
    const scheme = a.results.filter(r => r.usesScheme);
    expect(scheme.length).toBeGreaterThan(0);
    expect(scheme.every(r => !r.checks.some(c => c.id === 'lmi'))).toBe(true);
  });
});

describe('fix actions', () => {
  it('suggests cutting card limits and ranks by lenders unlocked', () => {
    const p = sampleProfile();
    p.cardLimits = 30_000;
    const fixes = fixActions(p);
    expect(fixes.length).toBeGreaterThan(0);
    for (let i = 1; i < fixes.length; i++) expect(fixes[i - 1].unlocks).toBeGreaterThanOrEqual(fixes[i].unlocks);
  });
});
