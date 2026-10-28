import { describe, expect, it } from 'vitest';
import { normaliseLead } from '../lib/leads';
import { fmtMoney } from './finance';
import { assess } from './match';
import { emptyProfile, sampleProfile } from './profile';
import { derivedLoan, sanitizeProfile } from './sanitize';
import { decodeProfile, encodeProfile } from './share';

const encode = (o: unknown) => btoa(JSON.stringify(o)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('profiles from outside the app', () => {
  it('leaves a valid profile unchanged', () => {
    const p = sampleProfile();
    expect(sanitizeProfile(p)).toEqual(p);
    expect(decodeProfile(encodeProfile(p))).toEqual(p);
  });

  it('derives a missing or null loan instead of crashing the report', () => {
    for (const loan of [undefined, null, 'lots', Number.NaN]) {
      const p = decodeProfile(encode({ ...sampleProfile(), loan }))!;
      expect(p.loan).toBe(derivedLoan(p));
      expect(p.loan).toBeGreaterThan(400_000);
      expect(() => fmtMoney(p.loan)).not.toThrow();
    }
  });

  it('replaces wrong-typed and out-of-range fields with defaults', () => {
    const p = sanitizeProfile({
      applicants: [{ age: '31', baseIncome: null, employment: 'astronaut', tenureMonths: -5 }, 'junk'],
      state: 'XX', price: Infinity, savings: -1, creditScore: 5000, bankruptcyYears: 'never', profession: 'wizard', firstHome: 'yes', mode: 'both',
    })!;
    const d = emptyProfile();
    expect(p.applicants).toHaveLength(1);
    expect(p.applicants[0]).toEqual(d.applicants[0]);
    expect(p).toMatchObject({ state: d.state, price: 0, savings: 0, creditScore: 1200, bankruptcyYears: null, profession: null, firstHome: true, mode: 'solo' });
    expect(() => assess(p)).not.toThrow();
  });

  it('rejects input with no applicant', () => {
    for (const raw of [null, 42, 'x', [], {}, { applicants: [] }, { applicants: 'x' }, { applicants: [null, 3] }]) expect(sanitizeProfile(raw)).toBeNull();
    expect(decodeProfile('not base64!!')).toBeNull();
    expect(decodeProfile(btoa('not json'))).toBeNull();
  });

  it('normalises a malformed lead row so the broker list still renders', () => {
    const l = normaliseLead({ id: 'a', name: 'Sam', email: 's@x.au', profile: 'nope', summary: { topLenders: 'Bank', lvr: '80' }, attribution: null, status: 'hacked' });
    expect(l.profile.applicants[0]).toBeDefined();
    expect(l.summary).toMatchObject({ topLenders: [], lvr: 0 });
    expect(l).toMatchObject({ name: 'Sam', attribution: {}, status: undefined, site: 'core', channel: 'web' });
    expect(normaliseLead(null).profile).toEqual(emptyProfile());
  });
});
