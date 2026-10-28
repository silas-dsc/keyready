import type { Profession } from './types';

export const PROFESSION_NAME: Record<Profession, string> = {
  doctor: 'doctors', specialist: 'medical specialists', dentist: 'dentists', vet: 'vets', pharmacist: 'pharmacists',
  physio: 'physiotherapists', optometrist: 'optometrists', psychologist: 'psychologists', nurse: 'nurses', midwife: 'midwives',
  allied_health: 'allied health professionals', lawyer: 'lawyers', accountant: 'accountants', actuary: 'actuaries',
  engineer: 'engineers', other: 'your profession',
};

