import { describe, expect, it } from 'vitest';
import { assess } from './match';
import { MARKET_LENDERS, productRate, toPolicy } from './market';
import { emptyProfile, newApplicant } from './profile';

const sample = {
  brand: 'Example Mutual', kind: 'Customer-owned', products: 3, minAge: 18, source: 'https://example',
  owner: { tiers: [{ maxLvr: 60, rate: 5.9 }, { maxLvr: 80, rate: 6.1 }, { maxLvr: 95, rate: 6.8 }], maxLvr: 95 },
  investment: { tiers: [], maxLvr: null },
  residency: { citizen: true, permanent_resident: true, nz_citizen: false, temporary_visa: false },
};

describe('Open Banking lenders', () => {
  it('loaded a live snapshot', () => {
    expect(MARKET_LENDERS.filter(l => l.source === 'open-banking').length).toBeGreaterThan(30);
  });

  it('picks the rate for the borrower’s LVR band', () => {
    const L = toPolicy(sample, 1);
    expect(productRate(L, 'owner', 55)).toBe(5.9);
    expect(productRate(L, 'owner', 75)).toBe(6.1);
    expect(productRate(L, 'owner', 90)).toBe(6.8);
    expect(L.investRate).toBeCloseTo(6.4);
  });

  it('maps published residency rules', () => {
    const L = toPolicy(sample, 1);
    expect(L.residency.permanent_resident).toBe(95);
    expect(L.residency.nz_citizen).toBeNull();
    expect(L.residency.temporary_visa).toBeNull();
    expect(L.name).toBe('Lender 01');
    expect(L.brand).toBe('Example Mutual');
  });

  it('runs a full assessment against the live market', () => {
    const a = assess({
      ...emptyProfile(),
      applicants: [{ ...newApplicant(), age: 34, tenureMonths: 48, baseIncome: 140_000 }],
      savings: 160_000, state: 'WA', price: 650_000, loan: 520_000, creditScore: 820,
    });
    expect(a.results.length).toBe(MARKET_LENDERS.length);
    expect(a.ready).toBeGreaterThan(a.results.length / 2);
    expect(a.results.every(r => r.rate > 4 && r.rate < 12)).toBe(true);
  });
});
