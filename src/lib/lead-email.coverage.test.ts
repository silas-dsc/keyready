import { describe, expect, it } from 'vitest';
import { leadEmailData } from './lead-email';

describe('lead email payload, other branches', () => {
  it('formats a joint lead with a First Home Owner Grant', () => {
    const d = leadEmailData({ summary: { fhog: 10_000 }, profile: { mode: 'joint', firstHome: true } });
    expect(d.summary.fhog).toBe('$10,000');
    expect(d.profile).toMatchObject({ applicants: 'Joint', first_home: 'Yes' });
  });
});
