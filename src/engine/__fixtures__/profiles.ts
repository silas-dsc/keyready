import { newApplicant, sampleProfile } from '../profile';
import type { Applicant, Profile } from '../types';

const s = sampleProfile();
const app = (o: Partial<Applicant>): Applicant => ({ ...newApplicant(), age: 35, tenureMonths: 36, baseIncome: 110_000, ...o });

/** Borrowers chosen to exercise every check and fix action at least once. */
export const PROFILES: Record<string, Profile> = {
  sample: s,
  joint: { ...s, mode: 'joint', household: 'family', dependants: 2, applicants: [app({ overtime: 12_000 }), app({ employment: 'part_time', baseIncome: 55_000, tenureMonths: 4 })], price: 900_000, loan: 800_000, savings: 140_000, state: 'NSW' },
  lowdoc: { ...s, applicants: [app({ employment: 'self_employed', tenureMonths: 14 })], lowDoc: true, price: 700_000, loan: 600_000, savings: 130_000, state: 'QLD' },
  expat: { ...s, applicants: [app({ baseIncome: 180_000 })], livesOverseas: true, incomeCurrency: 'SGD', firstHome: false, price: 1_000_000, loan: 750_000, savings: 320_000 },
  nurse: { ...s, profession: 'nurse', applicants: [app({ overtime: 25_000, baseIncome: 95_000 })], price: 650_000, loan: 600_000, savings: 60_000, firstHome: false },
  doctor: { ...s, profession: 'doctor', applicants: [app({ baseIncome: 260_000 })], price: 1_600_000, loan: 1_520_000, savings: 140_000, firstHome: false, state: 'NSW' },
  investor: { ...s, purpose: 'investment', firstHome: false, ownsProperty: true, rentalIncome: 30_000, personalLoans: 15_000, cardLimits: 20_000, price: 600_000, loan: 480_000, savings: 160_000, state: 'WA' },
  bankrupt: { ...s, bankruptcyYears: 2, defaults: 'yes', creditScore: 450, applicants: [app({ employment: 'casual', tenureMonths: 5 })] },
  newjob: { ...s, applicants: [app({ tenureMonths: 2 })], personalLoans: 8_000, savings: 150_000 },
  construction: { ...s, purpose: 'construction', dwelling: 'house_land', condition: 'new', price: 800_000, loan: 700_000, savings: 120_000, state: 'SA', location: 'regional' },
  tenure: { ...s, applicants: [app({ tenureMonths: 4, baseIncome: 128_000 })] },
  tenure2: { ...s, applicants: [app({ employment: 'casual', tenureMonths: 9, baseIncome: 120_000 })] },
  empty: { ...s, applicants: [newApplicant()], price: 0, loan: 0, savings: 0, cardLimits: 0, hecs: 0 },
};
