import policies from '../data/segment-policies.json';
import type { Currency, LenderPolicy, PolicySource, Profession, Profile } from './types';

/**
 * Sub-market rules layered on top of each lender's general policy: profession LMI waivers,
 * alt-doc (low-doc) lending for the self-employed, and lending to Australians living overseas.
 * The rules live in src/data/segment-policies.json, one sourced entry per lender.
 */

export interface LmiWaiver {
  brand: string;
  professions: Profession[];
  /** Highest LVR the waiver applies to. */
  maxLvr: number;
  /** Minimum gross income of the qualifying borrower, if the lender sets one. */
  minIncome?: number | null;
  purposes?: ('owner' | 'investment' | 'construction')[];
  conditions?: string;
  sources: PolicySource[];
}

export interface AltDoc {
  brand: string;
  /** Minimum months of ABN (and usually GST) registration; null when the lender doesn't publish one. */
  minAbnMonths: number | null;
  maxLvr: number;
  /** Typical margin above the lender's full-doc rate, % p.a. */
  rateLoading?: number | null;
  evidence?: string;
  sources: PolicySource[];
}

export interface ForeignIncomeTier {
  currencies: Currency[];
  /** Share of converted income counted for servicing. */
  shading: number;
  /** LVR cap when relying on this income; null when not stated. */
  maxLvr: number | null;
}

export interface ExpatPolicy {
  brand: string;
  /** Lends to borrowers who live overseas (expats). */
  acceptsNonResidents: boolean;
  foreignIncome?: ForeignIncomeTier[];
  conditions?: string;
  sources: PolicySource[];
}

/** Profession-specific income treatment, e.g. overtime counted in full for hospital nurses. */
export interface IncomeShading {
  brand: string;
  professions: Profession[];
  shading: Partial<LenderPolicy['shading']>;
  conditions?: string;
  sources: PolicySource[];
}

const P = policies as unknown as { lmiWaivers: LmiWaiver[]; altDoc: AltDoc[]; expat: ExpatPolicy[]; incomeShading?: IncomeShading[] };

const norm = (s = '') => s.toLowerCase().replace(/[^a-z]/g, '');
const allFor = <T extends { brand: string }>(rules: T[], L: LenderPolicy) => (L.brand ? rules.filter(r => norm(r.brand) === norm(L.brand)) : []);
const forLender = <T extends { brand: string }>(rules: T[], L: LenderPolicy): T | undefined => allFor(rules, L)[0];

const mainGross = (p: Profile) => {
  const a = p.applicants[0];
  return a ? a.baseIncome + a.overtime + a.allowances + a.bonus + a.commission : 0;
};

/** The best profession LMI waiver this borrower could get at this lender, if any. */
export function lmiWaiverFor(p: Profile, L: LenderPolicy): LmiWaiver | undefined {
  if (!p.profession) return undefined;
  return allFor(P.lmiWaivers, L)
    .filter(w => w.professions.includes(p.profession!) && (!w.purposes || w.purposes.includes(p.purpose)) && !(w.minIncome && mainGross(p) < w.minIncome))
    .sort((a, b) => b.maxLvr - a.maxLvr)[0];
}

/** How this lender treats the main borrower's foreign-currency income; null = not published. */
export function foreignIncomeTier(p: Profile, L: LenderPolicy): ForeignIncomeTier | null {
  if (p.incomeCurrency === 'AUD') return null;
  return forLender(P.expat, L)?.foreignIncome?.find(t => t.currencies.includes(p.incomeCurrency)) ?? null;
}

/** The main borrower's income shading at this lender, with any profession rule applied. */
export function shadingFor(p: Profile, L: LenderPolicy): LenderPolicy['shading'] {
  const rule = p.profession ? allFor(P.incomeShading ?? [], L).find(r => r.professions.includes(p.profession!)) : undefined;
  return rule ? { ...L.shading, ...rule.shading } : L.shading;
}

/** Lenders' alt-doc rule, for self-employed borrowers without two years of financials. */
export const altDocFor = (L: LenderPolicy) => forLender(P.altDoc, L);

/** Published expat / foreign-income rules; undefined means the lender publishes none. */
export const expatPolicyFor = (L: LenderPolicy) => forLender(P.expat, L);

export const SEGMENT_POLICIES = P;
