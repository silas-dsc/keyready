import { altDocFor } from './segments';
import type { LenderPolicy, Profession, Profile } from './types';

export const PROFESSION_NAME: Record<Profession, string> = {
  doctor: 'doctors', specialist: 'medical specialists', dentist: 'dentists', vet: 'vets', pharmacist: 'pharmacists',
  physio: 'physiotherapists', optometrist: 'optometrists', psychologist: 'psychologists', nurse: 'nurses', midwife: 'midwives',
  allied_health: 'allied health professionals', lawyer: 'lawyers', accountant: 'accountants', actuary: 'actuaries',
  engineer: 'engineers', other: 'your profession',
};

/** Whether the main self-employed borrower would go down this lender's alt-doc path. */
export function usesAltDoc(p: Profile, L: LenderPolicy): boolean {
  const a = p.applicants[0];
  if (!a || a.employment !== 'self_employed') return false;
  const alt = altDocFor(L);
  if (!alt || a.tenureMonths < (alt.minAbnMonths ?? 0)) return false;
  return p.lowDoc || a.tenureMonths < (L.minTenure.self_employed ?? Infinity);
}
