import { upfrontCosts } from './finance';
import { emptyProfile, newApplicant } from './profile';
import type { Applicant, AuState, Currency, Dwelling, Employment, Household, Profession, Profile, Purpose, Residency } from './types';

// Every allowed value, keyed so TypeScript flags a type change that isn't mirrored here.
const keys = <T extends string>(o: Record<T, 1>) => Object.keys(o) as T[];
const EMPLOYMENT = keys<Employment>({ full_time: 1, part_time: 1, casual: 1, contractor: 1, self_employed: 1, not_working: 1, retired: 1 });
const RESIDENCY = keys<Residency>({ citizen: 1, permanent_resident: 1, nz_citizen: 1, awaiting_pr: 1, temporary_visa: 1, other: 1 });
const STATES = keys<AuState>({ NSW: 1, VIC: 1, QLD: 1, WA: 1, SA: 1, TAS: 1, ACT: 1, NT: 1 });
const HOUSEHOLD = keys<Household>({ single: 1, couple: 1, family: 1, sharing: 1 });
const CURRENCY = keys<Currency>({ AUD: 1, USD: 1, GBP: 1, EUR: 1, NZD: 1, SGD: 1, HKD: 1, AED: 1, CAD: 1, JPY: 1, CNY: 1, other: 1 });
const PURPOSE = keys<Purpose>({ owner: 1, investment: 1, construction: 1 });
const DWELLING = keys<Dwelling>({ house: 1, apartment: 1, land: 1, house_land: 1, other: 1 });
const PROFESSION = keys<Profession>({
  doctor: 1, specialist: 1, dentist: 1, vet: 1, pharmacist: 1, physio: 1, optometrist: 1, psychologist: 1,
  nurse: 1, midwife: 1, allied_health: 1, lawyer: 1, accountant: 1, actuary: 1, engineer: 1, other: 1,
});

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);
const num = (v: unknown, fallback: number, max = 1e9) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : fallback);
const numOrNull = (v: unknown, max: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, 0), max) : null);
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T) => (allowed.includes(v as T) ? (v as T) : fallback);

/** The loan a buyer needs when they haven't said: the price less what their savings cover after costs. */
export function derivedLoan(p: Profile): number {
  const c = upfrontCosts(p);
  return Math.max(0, p.price - Math.max(0, p.savings + p.gift + c.fhog - c.total));
}

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
    condition: oneOf(raw.condition, ['new', 'existing', 'unsure'] as const, d.condition),
    state: oneOf(raw.state, STATES, d.state),
    location: oneOf(raw.location, ['capital', 'regional', 'unsure'] as const, d.location),
    price: num(raw.price, d.price),
    loan: 0,
    firstHome: bool(raw.firstHome, d.firstHome),
    defaults: oneOf(raw.defaults, ['no', 'yes', 'unsure'] as const, d.defaults),
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
