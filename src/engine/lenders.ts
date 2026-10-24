import type { LenderPolicy } from './types';

/**
 * Illustrative lender policies modelled on publicly described Australian lending
 * archetypes. They are NOT any real bank's policy — swap this file for licensed
 * or curated policy data before relying on it.
 */
export const BASE_POLICY: Omit<LenderPolicy, 'id' | 'name' | 'kind'> = {
  rate: 6.09,
  investRate: 6.39,
  floorRate: 8.5,
  buffer: 3,
  maxLvr: { owner: 95, investment: 90, construction: 90, land: 80, apartment: 90 },
  lmiAllowed: true,
  genuineSavingsAbove: 85,
  minTenure: { full_time: 3, part_time: 6, casual: 12, contractor: 12, self_employed: 24, not_working: null, retired: null },
  shading: { overtime: 0.8, allowances: 0.8, bonus: 0.8, commission: 0.8, rental: 0.8 },
  cardFactor: 0.038,
  maxDti: 7,
  residency: { citizen: 95, permanent_resident: 95, nz_citizen: 90, awaiting_pr: 80, temporary_visa: null, other: null },
  acceptsDefaults: false,
  bankruptcyMinYears: 99,
  minCreditScore: 550,
  depositScheme: false,
  maxAgeAtTermEnd: 75,
  source: 'illustrative',
};

function lender(id: string, kind: LenderPolicy['kind'], o: Partial<LenderPolicy>): LenderPolicy {
  return {
    ...BASE_POLICY,
    ...o,
    id,
    name: `Lender ${id}`,
    kind,
    maxLvr: { ...BASE_POLICY.maxLvr, ...o.maxLvr },
    minTenure: { ...BASE_POLICY.minTenure, ...o.minTenure },
    shading: { ...BASE_POLICY.shading, ...o.shading },
    residency: { ...BASE_POLICY.residency, ...o.residency },
  };
}

export const ILLUSTRATIVE_LENDERS: LenderPolicy[] = [
  lender('A', 'Major bank', {
    rate: 6.04, investRate: 6.34, maxDti: 6, depositScheme: true,
    minTenure: { full_time: 3, part_time: 6, casual: 12, contractor: 12, self_employed: 24, not_working: null, retired: null },
    residency: { citizen: 95, permanent_resident: 95, nz_citizen: 90, awaiting_pr: 80, temporary_visa: 80, other: null },
  }),
  lender('B', 'Major bank', {
    rate: 6.09, cardFactor: 0.03, minCreditScore: 600, depositScheme: true,
    shading: { overtime: 1, allowances: 1, bonus: 0.8, commission: 0.8, rental: 0.8 },
    minTenure: { full_time: 0, part_time: 6, casual: 6, contractor: 12, self_employed: 24, not_working: null, retired: null },
  }),
  lender('C', 'Major bank', {
    rate: 5.99, maxDti: 6, genuineSavingsAbove: 80, minCreditScore: 650,
    shading: { overtime: 0.5, allowances: 0.8, bonus: 0.5, commission: 0.5, rental: 0.75 },
    minTenure: { full_time: 6, part_time: 6, casual: 12, contractor: 24, self_employed: 24, not_working: null, retired: null },
  }),
  lender('D', 'Major bank', {
    rate: 6.14, maxLvr: { owner: 90, investment: 80, construction: 85, land: 80, apartment: 80 },
    residency: { citizen: 90, permanent_resident: 90, nz_citizen: 80, awaiting_pr: 70, temporary_visa: 70, other: null },
  }),
  lender('E', 'Regional bank', {
    rate: 5.94, investRate: 6.24, depositScheme: true, maxDti: 8,
    shading: { overtime: 1, allowances: 1, bonus: 1, commission: 0.8, rental: 0.8 },
    minTenure: { full_time: 0, part_time: 3, casual: 6, contractor: 6, self_employed: 12, not_working: null, retired: null },
  }),
  lender('F', 'Regional bank', {
    rate: 6.19, floorRate: 8.25, genuineSavingsAbove: 90,
    maxLvr: { owner: 95, investment: 90, construction: 95, land: 90, apartment: 90 },
  }),
  lender('G', 'Customer-owned', {
    rate: 5.89, investRate: 6.29, depositScheme: true, maxDti: 6, minCreditScore: 620,
    minTenure: { full_time: 6, part_time: 12, casual: 12, contractor: 24, self_employed: 24, not_working: null, retired: null },
  }),
  lender('H', 'Customer-owned', {
    rate: 6.04, depositScheme: true, floorRate: 8.0, lmiAllowed: true,
    maxLvr: { owner: 95, investment: 80, construction: 90, land: 80, apartment: 80 },
    minTenure: { full_time: 3, part_time: 6, casual: 12, contractor: 12, self_employed: 24, not_working: null, retired: 0 },
  }),
  lender('I', 'Online lender', {
    rate: 5.74, investRate: 6.04, lmiAllowed: false, minCreditScore: 700,
    maxLvr: { owner: 80, investment: 80, construction: 0, land: 0, apartment: 80 },
    minTenure: { full_time: 3, part_time: 12, casual: null, contractor: 12, self_employed: 24, not_working: null, retired: null },
    residency: { citizen: 80, permanent_resident: 80, nz_citizen: 80, awaiting_pr: null, temporary_visa: null, other: null },
  }),
  lender('J', 'Online lender', {
    rate: 5.84, investRate: 6.14, lmiAllowed: true, minCreditScore: 650, depositScheme: true,
    maxLvr: { owner: 90, investment: 85, construction: 0, land: 0, apartment: 85 },
  }),
  lender('K', 'Specialist', {
    rate: 7.24, investRate: 7.54, floorRate: 9.0, acceptsDefaults: true, bankruptcyMinYears: 1, minCreditScore: 300,
    maxLvr: { owner: 85, investment: 80, construction: 80, land: 70, apartment: 80 },
    minTenure: { full_time: 0, part_time: 0, casual: 3, contractor: 3, self_employed: 12, not_working: null, retired: null },
    residency: { citizen: 85, permanent_resident: 85, nz_citizen: 85, awaiting_pr: 80, temporary_visa: 80, other: 70 },
  }),
  lender('L', 'Specialist', {
    rate: 6.79, investRate: 7.09, floorRate: 8.75, acceptsDefaults: true, bankruptcyMinYears: 2, minCreditScore: 400, maxDti: 8,
    maxLvr: { owner: 90, investment: 85, construction: 80, land: 75, apartment: 85 },
    minTenure: { full_time: 0, part_time: 3, casual: 6, contractor: 6, self_employed: 12, not_working: null, retired: null },
  }),
];
