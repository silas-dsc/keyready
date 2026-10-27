import market from '../data/market.json';
import nonbank from '../data/nonbank-lenders.json';
import overrides from '../data/policy-overrides.json';
import scheme from '../data/scheme-lenders.json';
import { BASE_POLICY, ILLUSTRATIVE_LENDERS } from './lenders';
import type { Employment, LenderKind, LenderPolicy, PolicySource, RateTier, Residency } from './types';

interface MarketLender {
  brand: string;
  kind: string;
  products: number;
  owner: { tiers: RateTier[]; maxLvr: number | null };
  investment: { tiers: RateTier[]; maxLvr: number | null };
  residency: { citizen: boolean; permanent_resident: boolean; nz_citizen: boolean; temporary_visa: boolean } | null;
  minAge: number;
  source: string;
}

export const MARKET_FETCHED_AT: string = market.fetchedAt;
export const SCHEME_SOURCE: string = scheme.source;

/**
 * Credit-policy rules that Open Banking data doesn't publish (time in job, income shading,
 * DTI caps…). These are typical settings for each type of lender, not the lender's own policy.
 */
const KIND_DEFAULTS: Record<string, Partial<LenderPolicy> & { minTenure: Record<Employment, number | null> }> = {
  'Major bank': {
    maxDti: 6.5, cardFactor: 0.038, minCreditScore: 550,
    minTenure: { full_time: 3, part_time: 6, casual: 12, contractor: 12, self_employed: 24, not_working: null, retired: null },
  },
  'Other bank': {
    maxDti: 7, cardFactor: 0.038, minCreditScore: 550,
    minTenure: { full_time: 3, part_time: 6, casual: 12, contractor: 12, self_employed: 24, not_working: null, retired: null },
  },
  'Customer-owned': {
    maxDti: 7, cardFactor: 0.03, minCreditScore: 500,
    minTenure: { full_time: 3, part_time: 6, casual: 6, contractor: 12, self_employed: 24, not_working: null, retired: 0 },
  },
  'Online lender': {
    maxDti: 6, cardFactor: 0.038, minCreditScore: 650,
    minTenure: { full_time: 3, part_time: 6, casual: 12, contractor: 12, self_employed: 24, not_working: null, retired: null },
  },
  Specialist: {
    maxDti: 8, cardFactor: 0.038, minCreditScore: 400, acceptsDefaults: true, bankruptcyMinYears: 2, buffer: 2.5,
    minTenure: { full_time: 0, part_time: 3, casual: 6, contractor: 6, self_employed: 12, not_working: null, retired: null },
  },
};

const norm = (s: string) =>
  s.toLowerCase().replace(/commbank/, 'commonwealth bank').replace(/national australia bank/, 'national australia bank')
    .replace(/\b(limited|ltd|australia|financial|\(.*\))\b/g, '').replace(/[^a-z&]/g, '');
const SCHEME_NAMES = new Set(scheme.lenders.map(norm));
const onSchemePanel = (brand: string) => SCHEME_NAMES.has(norm(brand)) || [...SCHEME_NAMES].some(n => n.length > 4 && norm(brand).startsWith(n));

/** Stable pseudo-random order so masked numbers don't reveal alphabetical brand order. */
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const rateAt = (tiers: RateTier[], lvr: number) => tiers.find(t => lvr <= t.maxLvr)?.rate ?? tiers[tiers.length - 1]?.rate;

export interface PolicyOverride {
  set: Partial<Omit<LenderPolicy, 'minTenure' | 'residency' | 'maxLvr' | 'shading'>> & {
    minTenure?: Partial<LenderPolicy['minTenure']>;
    residency?: Partial<LenderPolicy['residency']>;
    maxLvr?: Partial<LenderPolicy['maxLvr']>;
    shading?: Partial<LenderPolicy['shading']>;
  };
  sources: PolicySource[];
}

/** Layer hand-verified facts from a lender's own website over the modelled defaults. */
export function applyOverride(L: LenderPolicy, o: PolicyOverride | undefined): LenderPolicy {
  if (!o?.sources?.length) return L;
  const { minTenure, residency, maxLvr, shading, ...rest } = o.set;
  return {
    ...L,
    ...rest,
    minTenure: { ...L.minTenure, ...minTenure },
    residency: { ...L.residency, ...residency },
    maxLvr: { ...L.maxLvr, ...maxLvr },
    shading: { ...L.shading, ...shading },
    policySources: o.sources,
  };
}

const OVERRIDES = overrides.lenders as Record<string, PolicyOverride>;

export function toPolicy(m: MarketLender, n: number): LenderPolicy {
  const kind = (KIND_DEFAULTS[m.kind] ? m.kind : 'Other bank') as LenderKind;
  const d = KIND_DEFAULTS[kind];
  const owner = m.owner.maxLvr ?? 95;
  const invest = m.investment.maxLvr ?? Math.min(owner, 90);
  const ownerRate = rateAt(m.owner.tiers, 80) ?? rateAt(m.investment.tiers, 80)! - 0.3;
  const investRate = rateAt(m.investment.tiers, 80) ?? ownerRate + 0.3;
  const res = m.residency;
  const residency: Record<Residency, number | null> = res
    ? {
        citizen: owner,
        permanent_resident: res.permanent_resident ? owner : null,
        nz_citizen: res.nz_citizen ? Math.min(owner, 90) : null,
        awaiting_pr: null,
        temporary_visa: res.temporary_visa ? Math.min(owner, 80) : null,
        other: null,
      }
    : { ...BASE_POLICY.residency, citizen: owner, permanent_resident: owner };
  return applyOverride({
    ...BASE_POLICY,
    ...d,
    id: String(n).padStart(2, '0'),
    name: `Lender ${String(n).padStart(2, '0')}`,
    kind,
    brand: m.brand,
    source: 'open-banking',
    rate: ownerRate,
    investRate,
    rateTiers: m.owner.tiers,
    investRateTiers: m.investment.tiers.length ? m.investment.tiers : undefined,
    floorRate: 5.75,
    maxLvr: {
      owner,
      investment: invest,
      construction: kind === 'Online lender' ? 0 : Math.min(owner, 90),
      land: kind === 'Online lender' ? 0 : Math.min(owner, 80),
      apartment: Math.min(owner, 90),
    },
    lmiAllowed: owner > 80,
    residency,
    depositScheme: onSchemePanel(m.brand),
    shading: { ...BASE_POLICY.shading },
    minTenure: d.minTenure,
  }, OVERRIDES[m.brand]);
}

/** Product rate for a borrower's LVR and purpose, using live tiers when available. */
export function productRate(L: LenderPolicy, purpose: 'owner' | 'investment' | 'construction', lvrPct: number): number {
  const tiers = purpose === 'investment' ? L.investRateTiers : L.rateTiers;
  if (tiers?.length) return rateAt(tiers, lvrPct);
  return purpose === 'investment' ? L.investRate : L.rate;
}

/** Non-bank lenders without Open Banking data, from their own published rate sheets. */
const published = nonbank.lenders as (MarketLender & { sources: PolicySource[] })[];
const PUBLISHED_SOURCES = new Map(published.map(m => [m.brand, m.sources]));

const live = [...(market.lenders as MarketLender[]), ...(market.lenders.length ? published : [])]
  .sort((a, b) => hash(a.brand) - hash(b.brand))
  .map((m, i) => {
    const L = toPolicy(m, i + 1);
    const sources = PUBLISHED_SOURCES.get(m.brand);
    return sources ? { ...L, source: 'published' as const, policySources: [...sources, ...(L.policySources ?? [])] } : L;
  });

/** Non-bank specialists rarely publish Open Banking data, so two modelled ones fill that gap. */
const specialists = ILLUSTRATIVE_LENDERS.filter(l => l.kind === 'Specialist').map((l, i) => ({
  ...l,
  id: `S${i + 1}`,
  name: `Specialist S${i + 1}`,
}));

export const MARKET_LENDERS: LenderPolicy[] = live.length ? [...live, ...specialists] : ILLUSTRATIVE_LENDERS;
