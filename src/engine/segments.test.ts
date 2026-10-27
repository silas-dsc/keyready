import { describe, expect, it } from 'vitest';
import { toPolicy } from './market';
import { evaluate } from './match';
import { emptyProfile, newApplicant } from './profile';
import type { Profile } from './types';

// Controlled lenders carrying real brand names, so the sourced rules in segment-policies.json apply.
const lender = (brand: string, kind = 'Major bank') =>
  toPolicy({
    brand, kind, products: 1, minAge: 18, source: 'test',
    owner: { tiers: [{ maxLvr: 80, rate: 6.2 }, { maxLvr: 95, rate: 6.8 }], maxLvr: 95 },
    investment: { tiers: [], maxLvr: null },
    residency: null,
  }, 1);

const buyer = (o: Partial<Profile> = {}, income = 250_000): Profile => ({
  ...emptyProfile(),
  applicants: [{ ...newApplicant(), age: 32, tenureMonths: 36, baseIncome: income }],
  firstHome: false,
  savings: 120_000,
  state: 'NSW',
  price: 900_000,
  loan: 855_000, // 95% LVR
  creditScore: 800,
  ...o,
});
const check = (p: Profile, brand: string, id: string) => evaluate(p, lender(brand)).checks.find(c => c.id === id);

describe('profession LMI waivers', () => {
  it('a doctor at 95% LVR has LMI waived at Westpac and ANZ', () => {
    for (const b of ['Westpac', 'ANZ']) {
      const c = check(buyer({ profession: 'doctor' }), b, 'lmi');
      expect(c?.status).toBe('pass');
      expect(c?.detail).toMatch(/waive LMI for doctors up to 95%/);
    }
  });

  it('without the profession, LMI applies', () => {
    expect(check(buyer(), 'Westpac', 'lmi')?.status).toBe('warn');
  });

  it('nurses need $90k+ at Westpac, and only up to 90% LVR', () => {
    const at90 = { profession: 'nurse' as const, loan: 810_000 };
    expect(check(buyer(at90, 95_000), 'Westpac', 'lmi')?.status).toBe('pass');
    expect(check(buyer(at90, 85_000), 'Westpac', 'lmi')?.status).toBe('warn');
    expect(check(buyer({ profession: 'nurse' }, 95_000), 'Westpac', 'lmi')?.status).toBe('warn'); // 95% LVR
  });

  it('ANZ does not waive LMI for nurses', () => {
    expect(check(buyer({ profession: 'nurse', loan: 810_000 }, 120_000), 'ANZ', 'lmi')?.status).toBe('warn');
  });

  it('lenders without a published waiver charge LMI', () => {
    expect(check(buyer({ profession: 'doctor' }), 'Some Credit Union', 'lmi')?.status).toBe('warn');
  });
});

describe('self-employed alt-doc', () => {
  const se = (o: Partial<Profile> = {}) => {
    const p = buyer({ lowDoc: true, loan: 720_000, ...o }, 180_000);
    p.applicants[0].employment = 'self_employed';
    p.applicants[0].tenureMonths = 12;
    return p;
  };

  it('Liberty offers alt-doc up to 85% LVR', () => {
    const r = evaluate(se(), lender('Liberty Financial', 'Specialist'));
    expect(r.checks.find(c => c.id === 'employment')?.detail).toMatch(/alt-doc/);
    expect(r.checks.find(c => c.id === 'lvr')?.status).toBe('pass'); // 80%
    expect(evaluate(se({ loan: 810_000 }), lender('Liberty Financial', 'Specialist')).checks.find(c => c.id === 'lvr')?.status).toBe('fail'); // 90% > 85%
  });

  it('full-doc-only lenders decline a low-doc application', () => {
    expect(check(se(), 'Westpac', 'employment')).toMatchObject({ status: 'fail', gap: 'far' });
  });
});

describe('expats and foreign income', () => {
  it('NAB and Westpac don’t lend to borrowers living overseas', () => {
    for (const b of ['NATIONAL AUSTRALIA BANK', 'Westpac']) {
      expect(check(buyer({ livesOverseas: true, loan: 720_000 }), b, 'expat')?.status).toBe('fail');
    }
  });

  it('lenders that publish nothing about expats are not assumed to lend', () => {
    expect(check(buyer({ livesOverseas: true }), 'Some Credit Union', 'expat')?.detail).toMatch(/Doesn’t publish/);
  });

  it('AMP counts 80% of USD income and caps LVR at 70%', () => {
    const p = buyer({ incomeCurrency: 'USD', loan: 720_000 });
    expect(check(p, 'AMP - My AMP', 'foreign-income')?.detail).toMatch(/80% of USD income, up to 70% LVR/);
    expect(check(p, 'AMP - My AMP', 'lvr')?.status).toBe('fail'); // 80% > 70%
  });

  it('foreign income reduces borrowing power', () => {
    const aud = evaluate(buyer({ loan: 720_000 }), lender('Macquarie Bank Limited')).maxBorrow;
    const usd = evaluate(buyer({ loan: 720_000, incomeCurrency: 'USD' }), lender('Macquarie Bank Limited')).maxBorrow;
    expect(usd).toBeLessThan(aud * 0.9);
  });
});

describe('profession income shading (Westpac broker niche booklet, retrieved 2026-10-27)', () => {
  const nurse = (profession: Profile['profession']) => {
    const p = buyer({ profession, loan: 720_000 }, 80_000);
    p.applicants[0].overtime = 30_000;
    return p;
  };
  it("counts a nurse's overtime in full at Westpac only", () => {
    const wbc = (prof: Profile['profession']) => evaluate(nurse(prof), lender('Westpac')).maxBorrow;
    expect(wbc('nurse')).toBeGreaterThan(wbc('other'));
    const anz = (prof: Profile['profession']) => evaluate(nurse(prof), lender('ANZ')).maxBorrow;
    expect(anz('nurse')).toBe(anz('other'));
  });
});
