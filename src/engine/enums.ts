/**
 * Every allowed value of the profile's choice fields, defined once. The types in ./types derive from
 * these, and the questionnaire, the report-link sanitiser and the MCP server's schema all use them.
 */
export const EMPLOYMENT = ['full_time', 'part_time', 'casual', 'contractor', 'self_employed', 'not_working', 'retired'] as const;
export const RESIDENCY = ['citizen', 'permanent_resident', 'nz_citizen', 'awaiting_pr', 'temporary_visa', 'other'] as const;
export const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
export const HOUSEHOLD = ['single', 'couple', 'family', 'sharing'] as const;
export const CURRENCY = ['AUD', 'USD', 'GBP', 'EUR', 'NZD', 'SGD', 'HKD', 'AED', 'CAD', 'JPY', 'CNY', 'other'] as const;
/** Professions some lenders treat specially (e.g. LMI waivers). Matched against src/data/segment-policies.json. */
export const PROFESSION = [
  'doctor', 'specialist', 'dentist', 'vet', 'pharmacist', 'physio', 'optometrist', 'psychologist',
  'nurse', 'midwife', 'allied_health',
  'lawyer', 'accountant', 'actuary', 'engineer',
  'other',
] as const;
export const PURPOSE = ['owner', 'investment', 'construction'] as const;
export const DWELLING = ['house', 'apartment', 'land', 'house_land', 'other'] as const;
export const CONDITION = ['new', 'existing', 'unsure'] as const;
export const LOCATION = ['capital', 'regional', 'unsure'] as const;
export const DEFAULTS = ['no', 'yes', 'unsure'] as const;
