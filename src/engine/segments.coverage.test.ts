import { describe, expect, it, vi } from 'vitest';
import { BASE_POLICY } from './lenders';
import { emptyProfile } from './profile';
import { shadingFor } from './segments';

// Segment data without the optional incomeShading list.
vi.mock('../data/segment-policies.json', () => ({ default: { lmiWaivers: [], altDoc: [], expat: [] } }));

describe('segments without income-shading rules', () => {
  it('uses the lender’s general shading', () => {
    const L = { ...BASE_POLICY, id: 'T', name: 'T', kind: 'Other bank' as const, brand: 'Westpac' };
    expect(shadingFor({ ...emptyProfile(), profession: 'nurse' }, L)).toBe(L.shading);
  });
});
