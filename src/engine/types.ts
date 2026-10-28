export type Employment =
  | 'full_time'
  | 'part_time'
  | 'casual'
  | 'contractor'
  | 'self_employed'
  | 'not_working'
  | 'retired';

export type Residency =
  | 'citizen'
  | 'permanent_resident'
  | 'nz_citizen'
  | 'awaiting_pr'
  | 'temporary_visa'
  | 'other';

export type AuState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'ACT' | 'NT';

export interface Applicant {
  age: number;
  residency: Residency;
  employment: Employment;
  /** Months with the current employer, or months trading on an ABN when self-employed. */
  tenureMonths: number;
  /** Annual base income before tax, excluding super. */
  baseIncome: number;
  overtime: number;
  allowances: number;
  bonus: number;
  commission: number;
}

export type Household = 'single' | 'couple' | 'family' | 'sharing';

export type Currency = 'AUD' | 'USD' | 'GBP' | 'EUR' | 'NZD' | 'SGD' | 'HKD' | 'AED' | 'CAD' | 'JPY' | 'CNY' | 'other';

/** Professions some lenders treat specially (e.g. LMI waivers). Matched against src/data/segment-policies.json. */
export type Profession =
  | 'doctor' | 'specialist' | 'dentist' | 'vet' | 'pharmacist' | 'physio' | 'optometrist' | 'psychologist'
  | 'nurse' | 'midwife' | 'allied_health'
  | 'lawyer' | 'accountant' | 'actuary' | 'engineer'
  | 'other';
export type Purpose = 'owner' | 'investment' | 'construction';
export type Dwelling = 'house' | 'apartment' | 'land' | 'house_land' | 'other';

export interface Profile {
  mode: 'solo' | 'joint';
  applicants: Applicant[];
  household: Household;
  dependants: number;

  savings: number;
  gift: number;
  otherAssets: number;
  superBalance: number;
  personalLoans: number;
  cardLimits: number;
  hecs: number;
  ownsProperty: boolean;

  ftb: number;
  childSupport: number;
  rentalIncome: number;

  purpose: Purpose;
  dwelling: Dwelling;
  condition: 'new' | 'existing' | 'unsure';
  state: AuState;
  location: 'capital' | 'regional' | 'unsure';
  price: number;
  loan: number;

  firstHome: boolean;
  defaults: 'no' | 'yes' | 'unsure';
  /** Years since bankruptcy discharge; null when never bankrupt. */
  bankruptcyYears: number | null;
  /** Equifax-style score (0–1200); null when unknown. */
  creditScore: number | null;
  /** Main borrower's profession; null when not asked or not listed. */
  profession: Profession | null;
  /** Main borrower lives outside Australia (expat). */
  livesOverseas: boolean;
  /** Currency the main borrower is paid in. */
  incomeCurrency: Currency;
  /** Self-employed without two years of lodged tax returns: needs an alt-doc (low-doc) loan. */
  lowDoc: boolean;
}

export type LenderKind = 'Major bank' | 'Other bank' | 'Regional bank' | 'Customer-owned' | 'Online lender' | 'Specialist';

export interface RateTier {
  /** Upper LVR bound (%) this rate applies to. */
  maxLvr: number;
  rate: number;
  /** Comparison rate for this rate, % p.a., as the lender publishes it ($150,000 over 25 years). */
  comparison?: number;
}

export interface PolicySource {
  url: string;
  /** ISO date the page was checked. */
  retrieved: string;
  /** Short quote from the page supporting the figure. */
  quote?: string;
}

export interface LenderPolicy {
  id: string;
  name: string;
  kind: LenderKind;
  /** Owner-occupier and investor P&I product rates, % p.a. */
  rate: number;
  investRate: number;
  /** Minimum assessment rate, % p.a. Assessment rate is max(rate + buffer, floor). */
  floorRate: number;
  buffer: number;
  maxLvr: { owner: number; investment: number; construction: number; land: number; apartment: number };
  lmiAllowed: boolean;
  /** Above this LVR, 5% of the price must be genuine savings (not a gift). */
  genuineSavingsAbove: number;
  /** Minimum months in role by employment type; null means not accepted. */
  minTenure: Record<Employment, number | null>;
  shading: { overtime: number; allowances: number; bonus: number; commission: number; rental: number };
  /** Monthly repayment assumed per dollar of credit card limit. */
  cardFactor: number;
  maxDti: number;
  /** Max LVR accepted for each residency type; null means not accepted. */
  residency: Record<Residency, number | null>;
  acceptsDefaults: boolean;
  bankruptcyMinYears: number;
  minCreditScore: number;
  /** Participates in the 5% Deposit Scheme panel. */
  depositScheme: boolean;
  maxAgeAtTermEnd: number;
  /** Live rates by LVR band, when the lender publishes them (Open Banking). */
  rateTiers?: RateTier[];
  investRateTiers?: RateTier[];
  /** Real brand name — kept out of the UI unless names are switched on. */
  brand?: string;
  /** Where the rates, LVR limits and residency rules come from ('published' = the lender's own rate sheet). */
  source: 'open-banking' | 'published' | 'illustrative';
  /** Set when some credit-policy rules were verified from the lender's own website. */
  policySources?: PolicySource[];
}

export type CheckStatus = 'pass' | 'warn' | 'fail';

export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** For fails: 'close' means a modest, specific change gets you there. */
  gap?: 'close' | 'far';
  /** For a time-in-role fail: months until the borrower meets the minimum. */
  waitMonths?: number;
  weight: number;
}

export type MatchStatus = 'ready' | 'close' | 'not_yet';

export interface LenderResult {
  lender: LenderPolicy;
  status: MatchStatus;
  score: number;
  checks: Check[];
  maxBorrow: number;
  usesScheme: boolean;
  /** LMI waived through a profession waiver (src/data/segment-policies.json). */
  lmiWaived: boolean;
  /** Product rate at this borrower's LVR and purpose. */
  rate: number;
  /** Its published comparison rate. Without one the rate must not be shown (National Credit Code s 161). */
  comparison?: number;
  assessmentRate: number;
  monthlyRepayment: number;
}
