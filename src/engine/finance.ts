import { stampDuty } from './duty';
import type { Applicant, AuState, Household, Profile } from './types';

/**
 * Resident income tax for 2026–27 (Stage 3 rates with the 15% bottom rate from 1 July 2026),
 * plus the 2% Medicare levy. Offsets are ignored — banks use similar simplified tables.
 */
export function incomeTax(gross: number): number {
  const g = Math.max(0, gross);
  let tax = 0;
  if (g > 190_000) tax = 51_370 + (g - 190_000) * 0.45;
  else if (g > 135_000) tax = 31_020 + (g - 135_000) * 0.37;
  else if (g > 45_000) tax = 4_020 + (g - 45_000) * 0.3;
  else if (g > 18_200) tax = (g - 18_200) * 0.15;
  return tax + g * 0.02;
}

/**
 * Compulsory HECS/HELP repayment under the marginal system, 2026–27 (ATO Table 1:
 * ato.gov.au/tax-rates-and-codes/study-and-training-loan-minimum-repayment-income-and-rates,
 * retrieved 2026-10-27).
 */
export function hecsRepayment(income: number, balance: number): number {
  if (balance <= 0 || income <= 69_528) return 0;
  const r = income <= 129_717 ? (income - 69_528) * 0.15
    : income <= 186_050 ? 9_028 + (income - 129_717) * 0.17
    : income * 0.1;
  return Math.min(r, balance);
}

/**
 * Living-expense floor in the spirit of the Household Expenditure Measure (HEM).
 * Real HEM tables are licensed; this is a transparent approximation that rises with
 * household size and income, which is how lenders apply it.
 */
export function livingExpensesMonthly(household: Household, dependants: number, grossIncome: number, joint: boolean): number {
  const couple = joint || household === 'couple' || (household === 'family' && joint);
  let base = couple ? 3_000 : household === 'sharing' ? 1_850 : 2_050;
  base += Math.max(0, dependants) * 750;
  base += Math.max(0, grossIncome - 60_000) * 0.03 / 12;
  return Math.round(base);
}

/** Monthly P&I repayment. */
export function repayment(principal: number, ratePct: number, years: number): number {
  const r = ratePct / 100 / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r) / (1 - Math.pow(1 + r, -n));
}

/** Principal that a monthly payment services. */
export function principalFor(monthly: number, ratePct: number, years: number): number {
  if (monthly <= 0) return 0;
  const r = ratePct / 100 / 12;
  const n = years * 12;
  return (monthly * (1 - Math.pow(1 + r, -n))) / r;
}

export function applicantGross(a: Applicant): number {
  return a.baseIncome + a.overtime + a.allowances + a.bonus + a.commission;
}

export function totalGross(p: Profile): number {
  return p.applicants.reduce((s, a) => s + applicantGross(a), 0) + p.ftb + p.childSupport + p.rentalIncome;
}

export function deposit(p: Profile): number {
  return Math.max(0, p.price - p.loan);
}

export function lvr(p: Profile): number {
  return p.price > 0 ? (p.loan / p.price) * 100 : 0;
}

export function debtToIncome(p: Profile): number {
  const gross = totalGross(p);
  if (gross <= 0) return Infinity;
  return (p.loan + p.personalLoans + p.cardLimits + p.hecs) / gross;
}

export interface UpfrontCosts {
  stampDuty: number;
  foreignSurcharge: number;
  other: number;
  total: number;
  fhbConcession: boolean;
  concession: string | null;
  /** First Home Owner Grant — paid at settlement, so it counts toward funds to complete. */
  fhog: number;
}

export function upfrontCosts(p: Profile): UpfrontCosts {
  const d = stampDuty(p);
  const other = p.price > 0 ? 3_000 : 0; // conveyancing, searches, registration
  return {
    stampDuty: d.duty,
    foreignSurcharge: d.foreignSurcharge,
    other,
    total: Math.round(d.duty + d.foreignSurcharge + other),
    fhbConcession: d.concession !== null && d.duty < d.generalDuty,
    concession: d.concession,
    fhog: d.fhog,
  };
}

/**
 * 5% Deposit Scheme property price caps (capital & regional centres / rest of state).
 * firsthomebuyers.gov.au/australian-government-5-percent-deposit-scheme/property-price-caps,
 * retrieved 2026-10-27. Regional centres (e.g. Gold Coast, Geelong, Newcastle) take the
 * capital-city cap.
 */
export const SCHEME_CAPS: Record<AuState, [number, number]> = {
  NSW: [1_500_000, 800_000],
  VIC: [950_000, 650_000],
  QLD: [1_000_000, 700_000],
  WA: [850_000, 600_000],
  SA: [900_000, 500_000],
  TAS: [700_000, 550_000],
  ACT: [1_000_000, 1_000_000],
  NT: [750_000, 600_000], // Darwin / rest of Territory
};

export interface SchemeCheck {
  eligible: boolean;
  /** 'family' is the single-parent Family Home Guarantee (2% deposit). */
  variant: 'first_home' | 'family' | null;
  cap: number;
  minDepositPct: number;
  reasons: string[];
}

export function depositScheme(p: Profile): SchemeCheck {
  const reasons: string[] = [];
  const singleParent = p.mode === 'solo' && p.dependants > 0;
  const variant = singleParent ? 'family' : p.firstHome ? 'first_home' : null;
  const cap = SCHEME_CAPS[p.state][p.location === 'capital' ? 0 : 1];
  if (!variant) reasons.push('Available to first home buyers (or single parents with a dependant).');
  if (p.purpose === 'investment') reasons.push('The home has to be one you will live in.');
  if (p.applicants.some(a => !['citizen', 'permanent_resident'].includes(a.residency)))
    reasons.push('Every borrower needs to be an Australian citizen or permanent resident.');
  if (p.applicants.some(a => a.age < 18)) reasons.push('Borrowers must be 18 or over.');
  if (p.price > cap) reasons.push(`The price is above the ${fmtMoney(cap)} cap for this area.`);
  return { eligible: reasons.length === 0, variant, cap, minDepositPct: variant === 'family' ? 2 : 5, reasons };
}

/** Indicative Lenders Mortgage Insurance premium. */
export function lmiEstimate(loan: number, lvrPct: number): number {
  if (lvrPct <= 80) return 0;
  const rate = lvrPct <= 85 ? 0.009 : lvrPct <= 90 ? 0.019 : 0.034;
  return Math.round(loan * rate);
}

export function fmtMoney(n: number): string {
  if (!isFinite(n)) return '—';
  return n.toLocaleString('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 });
}

export function fmtShortMoney(n: number): string {
  if (!isFinite(n)) return '—';
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(2).replace(/0$/, '')}m`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}
