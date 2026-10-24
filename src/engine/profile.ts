import type { Applicant, Profile } from './types';

export const newApplicant = (): Applicant => ({
  age: 0,
  residency: 'citizen',
  employment: 'full_time',
  tenureMonths: 0,
  baseIncome: 0,
  overtime: 0,
  allowances: 0,
  bonus: 0,
  commission: 0,
});

export const emptyProfile = (): Profile => ({
  mode: 'solo',
  applicants: [newApplicant()],
  household: 'single',
  dependants: 0,
  savings: 0,
  gift: 0,
  otherAssets: 0,
  superBalance: 0,
  personalLoans: 0,
  cardLimits: 0,
  hecs: 0,
  ownsProperty: false,
  ftb: 0,
  childSupport: 0,
  rentalIncome: 0,
  purpose: 'owner',
  dwelling: 'house',
  condition: 'existing',
  state: 'NSW',
  location: 'capital',
  price: 0,
  loan: 0,
  firstHome: true,
  defaults: 'no',
  bankruptcyYears: null,
  creditScore: null,
});

/** The worked example on the landing page. */
export const sampleProfile = (): Profile => ({
  ...emptyProfile(),
  applicants: [{ ...newApplicant(), age: 31, tenureMonths: 30, baseIncome: 128_000, overtime: 6_000 }],
  savings: 112_000,
  cardLimits: 8_000,
  hecs: 18_000,
  state: 'VIC',
  price: 650_000,
  loan: 580_000,
  creditScore: 780,
});
