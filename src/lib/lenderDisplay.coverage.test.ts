import { afterEach, describe, expect, it, vi } from 'vitest';

describe('lenderDisplay', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  const L = { name: 'Lender 01', brand: 'Real Bank' } as never;
  const unbranded = { name: 'Lender 02' } as never;

  it('masks real names by default', async () => {
    vi.stubEnv('VITE_SHOW_LENDER_NAMES', '');
    const m = await import('./lenderDisplay');
    expect(m.SHOW_NAMES).toBe(false);
    expect(m.lenderName(L)).toBe('Lender 01');
  });
  it('shows brands when switched on, falling back to the masked name', async () => {
    vi.stubEnv('VITE_SHOW_LENDER_NAMES', 'true');
    const m = await import('./lenderDisplay');
    expect(m.lenderName(L)).toBe('Real Bank');
    expect(m.lenderName(unbranded)).toBe('Lender 02');
  });
  it('counts lenders by data source', async () => {
    const m = await import('./lenderDisplay');
    const { MARKET_LENDERS } = await import('../engine/market');
    expect(m.LENDER_COUNT).toBe(MARKET_LENDERS.length);
    expect(m.LIVE_COUNT + m.PUBLISHED_COUNT + m.MODELLED_COUNT).toBe(m.LENDER_COUNT);
    expect(m.MODELLED_COUNT).toBe(MARKET_LENDERS.filter(l => l.source === 'illustrative').length);
    expect(m.DATA_DATE).toMatch(/\d{4}$/);
  });
});
