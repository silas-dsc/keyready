import { CONDITION, CURRENCY, DEFAULTS, DWELLING, EMPLOYMENT, HOUSEHOLD, LOCATION, PROFESSION, PURPOSE, RESIDENCY, STATES } from './enums';
import { derivedLoan } from './finance';
import { emptyProfile, newApplicant } from './profile';
import type { Applicant, Profession, Profile } from './types';

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, max = 1e9) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : fallback);
const numOrNull = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : null);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T) => (allowed.includes(v as T) ? (v as T) : fallback);

function sanitizeApplicant(a: Obj): Applicant {
  const d = newApplicant();
  return {
    age: num(a.age, d.age, 120),
    residency: oneOf(a.residency, RESIDENCY, d.residency),
    employment: oneOf(a.employment, EMPLOYMENT, d.employment),
    tenureMonths: num(a.tenureMonths, d.tenureMonths, 1200),
    baseIncome: num(a.baseIncome, d.baseIncome),
    overtime: num(a.overtime, d.overtime),
    allowances: num(a.allowances, d.allowances),
    bonus: num(a.bonus, d.bonus),
    commission: num(a.commission, d.commission),
  };
}

/**
 * A profile from outside the app (a report link, browser storage, a lead row) as a valid Profile: wrong-typed or
 * missing fields take their defaults, a missing loan is derived from the price and savings. Null when there's no applicant.
 */
export function sanitizeProfile(raw: unknown): Profile | null {
  if (!isObj(raw) || !Array.isArray(raw.applicants)) return null;
  const applicants = raw.applicants.filter(isObj).slice(0, 2).map(sanitizeApplicant);
  if (applicants.length === 0) return null;
  const d = emptyProfile();
  const p: Profile = {
    mode: oneOf(raw.mode, ['solo', 'joint'] as const, d.mode),
    applicants,
    household: oneOf(raw.household, HOUSEHOLD, d.household),
    dependants: num(raw.dependants, d.dependants, 20),
    savings: num(raw.savings, d.savings),
    gift: num(raw.gift, d.gift),
    otherAssets: num(raw.otherAssets, d.otherAssets),
    superBalance: num(raw.superBalance, d.superBalance),
    personalLoans: num(raw.personalLoans, d.personalLoans),
    cardLimits: num(raw.cardLimits, d.cardLimits),
    hecs: num(raw.hecs, d.hecs),
    ownsProperty: bool(raw.ownsProperty, d.ownsProperty),
    ftb: num(raw.ftb, d.ftb),
    childSupport: num(raw.childSupport, d.childSupport),
    rentalIncome: num(raw.rentalIncome, d.rentalIncome),
    purpose: oneOf(raw.purpose, PURPOSE, d.purpose),
    dwelling: oneOf(raw.dwelling, DWELLING, d.dwelling),
    condition: oneOf(raw.condition, CONDITION, d.condition),
    state: oneOf(raw.state, STATES, d.state),
    location: oneOf(raw.location, LOCATION, d.location),
    price: num(raw.price, d.price),
    loan: 0,
    firstHome: bool(raw.firstHome, d.firstHome),
    defaults: oneOf(raw.defaults, DEFAULTS, d.defaults),
    bankruptcyYears: numOrNull(raw.bankruptcyYears, 100),
    creditScore: numOrNull(raw.creditScore, 1200),
    profession: PROFESSION.includes(raw.profession as Profession) ? (raw.profession as Profession) : null,
    livesOverseas: bool(raw.livesOverseas, d.livesOverseas),
    incomeCurrency: oneOf(raw.incomeCurrency, CURRENCY, d.incomeCurrency),
    lowDoc: bool(raw.lowDoc, d.lowDoc),
  };
  p.loan = num(raw.loan, derivedLoan(p));
  return p;
}
