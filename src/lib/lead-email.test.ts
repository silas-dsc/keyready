import { describe, expect, it } from 'vitest';
import { assess } from '../engine/match';
import { sampleProfile } from '../engine/profile';
import { summarise } from '../engine/summary';
import { leadEmailData, leadSource } from './lead-email';

describe('lead email payload', () => {
  it('formats a well-formed lead for the templates', () => {
    const profile = sampleProfile();
    const d = leadEmailData(
      { id: 'L1', name: 'Sam', email: 's@x.au', site: 'nurses', channel: 'mcp', profile, summary: summarise(profile, assess(profile)), attribution: { utm_source: 'mcp' } },
      { name: 'Trevor', business_name: 'Goodlend' },
    );
    expect(d).toMatchObject({ site_name: expect.stringMatching(/nurse/i), channel: 'an AI assistant (MCP)', broker_name: 'Trevor', broker_business: 'Goodlend' });
    expect(d.lead.source).toBe('mcp');
    expect(d.profile).toMatchObject({ applicants: 'Solo', price: '$650,000', loan: '$580,000', employment: 'full time', income: '$128,000' });
    expect(d.summary.borrowing_power).toMatch(/^\$\d/);
  });

  it('survives malformed JSON, since anyone can insert a lead', () => {
    const d = leadEmailData({ site: 'nope', summary: { topLenders: 'Bank', borrowingPower: '1' }, profile: { applicants: 'x' } });
    expect(d.site_name).toBe(leadEmailData({ site: 'core' }).site_name);
    expect(d.summary).toMatchObject({ top_lenders: '—', borrowing_power: '—' });
    expect(d.profile).toMatchObject({ employment: '', income: '—' });
    expect(d.broker_name).toBe('our broker partner');
  });

  it('describes the lead source', () => {
    expect(leadSource({ utm_source: 'google', utm_campaign: 'nurses', referrer: 'x.com' })).toBe('google · nurses · x.com');
    expect(leadSource(null)).toBe('Direct');
  });
});

describe('lead summary', () => {
  it('matches the assessment and keeps real brand names for the broker', () => {
    const p = sampleProfile();
    const a = assess(p);
    const s = summarise(p, a);
    expect(s).toMatchObject({ ready: a.ready, close: a.close, lenders: a.results.length, borrowingPower: Math.round(a.borrowingPower.typical) });
    expect(s.topLenders).toEqual(a.results.filter(r => r.status === 'ready').slice(0, 3).map(r => r.lender.brand ?? r.lender.name));
  });
});
