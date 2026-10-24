import { MARKET_FETCHED_AT, MARKET_LENDERS } from '../engine/market';
import type { LenderPolicy } from '../engine/types';

/** Real bank names stay masked unless explicitly switched on (see README: naming lenders carries ASIC advertising risk). */
export const SHOW_NAMES = import.meta.env.VITE_SHOW_LENDER_NAMES === 'true';

export const lenderName = (L: LenderPolicy) => (SHOW_NAMES && L.brand ? L.brand : L.name);

export const LENDER_COUNT = MARKET_LENDERS.length;
export const LIVE_COUNT = MARKET_LENDERS.filter(l => l.source === 'open-banking').length;
export const DATA_DATE = new Date(MARKET_FETCHED_AT).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
