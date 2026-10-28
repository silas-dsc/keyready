import { afterEach, describe, expect, it, vi } from 'vitest';
import { ILLUSTRATIVE_LENDERS } from './lenders';
import { toPolicy } from './market';

const ml = (o: Record<string, unknown> = {}) => ({
  brand: 'Nobody Bank', kind: 'Other bank', products: 1,
  owner: { tiers: [{ maxLvr: 80, rate: 6 }], maxLvr: 90 },
  investment: { tiers: [{ maxLvr: 80, rate: 6.5 }], maxLvr: 90 },
  residency: null, minAge: 18, source: 'x', ...o,
});

describe('toPolicy', () => {
  it('treats an unknown lender kind as an "Other bank"', () => {
    expect(toPolicy(ml({ kind: 'Building society' }), 1).kind).toBe('Other bank');
  });
  it('derives the owner rate from the investor rate when no owner tiers are published', () => {
    const L = toPolicy(ml({ owner: { tiers: [], maxLvr: null } }), 1);
    expect(L.rate).toBeCloseTo(6.2, 9);
    expect(L.maxLvr.owner).toBe(95);
  });
});

describe('MARKET_LENDERS without Open Banking data', () => {
  afterEach(() => {
    vi.doUnmock('../data/market.json');
    vi.resetModules();
  });
  it('falls back to the illustrative lenders and skips published non-banks', async () => {
    vi.resetModules();
    vi.doMock('../data/market.json', () => ({ default: { fetchedAt: '2026-01-01T00:00:00Z', lenders: [] } }));
    const m = await import('./market');
    expect(m.MARKET_LENDERS).toEqual(ILLUSTRATIVE_LENDERS);
    expect(m.MARKET_FETCHED_AT).toBe('2026-01-01T00:00:00Z');
  });
});
