import { describe, expect, it } from 'vitest';
import { stampDuty } from './duty';
import { emptyProfile, newApplicant } from './profile';
import type { AuState, Profile } from './types';

const mk = (state: AuState, price: number, o: Partial<Profile> = {}): Profile => ({
  ...emptyProfile(), applicants: [{ ...newApplicant(), age: 35 }], state, price, firstHome: false, purpose: 'investment', ...o,
});
const fhb = (state: AuState, price: number, o: Partial<Profile> = {}) => mk(state, price, { firstHome: true, purpose: 'owner', ...o });

describe('stamp duty edge cases', () => {
  it('NSW first home buyers at or above the upper threshold pay general rates', () => {
    const d = stampDuty(fhb('NSW', 1_200_000));
    expect(d.duty).toBe(stampDuty(mk('NSW', 1_200_000)).duty);
    expect(d.concession).toBeNull();
  });
  it('VIC first home buyers above $750k pay general rates', () => {
    const d = stampDuty(fhb('VIC', 800_000));
    expect(d.duty).toBe(d.generalDuty);
    expect(d.duty).toBe(stampDuty(mk('VIC', 800_000)).duty);
  });
  it('QLD charges nothing up to $5,000', () => {
    expect(stampDuty(mk('QLD', 4_000)).duty).toBe(0);
  });
  it('QLD first home buyers of a new home get the new-home concession', () => {
    expect(stampDuty(fhb('QLD', 700_000, { condition: 'new' }))).toMatchObject({ duty: 0, concession: 'First home (new home) concession' });
    expect(stampDuty(fhb('QLD', 300_000, { dwelling: 'land' }))).toMatchObject({ duty: 0, concession: 'First home vacant land concession' });
  });
  it('TAS charges the $50 minimum up to $3,000', () => {
    expect(stampDuty(mk('TAS', 2_000)).duty).toBe(50);
  });
  it('ACT bottom bracket: per $100 or part, owner-occupier vs investor', () => {
    expect(stampDuty(mk('ACT', 150_000)).duty).toBe(1_800);
    expect(stampDuty(mk('ACT', 200_000, { purpose: 'owner' }))).toMatchObject({ duty: 560, generalDuty: 2_400, concession: 'Owner-occupier rates' });
  });
  it('NT charges 5.95% from $5m', () => {
    expect(stampDuty(mk('NT', 6_000_000)).duty).toBe(357_000);
  });
});
