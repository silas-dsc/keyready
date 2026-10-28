import { fmtMoney } from '../engine/finance';
import { SITE_CATALOG } from '../sites/catalog';

export interface LeadAttribution {
  utm_source?: string;
  utm_campaign?: string;
  referrer?: string;
}

/** Where a lead came from, as one line for the broker. */
export const leadSource = (a?: LeadAttribution | null) =>
  [a?.utm_source, a?.utm_campaign, a?.referrer].filter(Boolean).join(' · ') || 'Direct';

type Json = Record<string, any>; // untrusted JSON, read defensively
const money = (n: unknown) => (typeof n === 'number' ? fmtMoney(n) : '—');

/**
 * The data the Knock email templates get for a lead (bundled into the notify-lead function).
 * Anyone can insert a lead, so its JSON may not have the shape the site writes: every field is optional here.
 */
export function leadEmailData(lead: Json, broker?: Json | null) {
  const site = SITE_CATALOG[lead.site] ?? SITE_CATALOG.core;
  const s: Json = lead.summary ?? {};
  const p: Json = lead.profile ?? {};
  const a0: Json = (Array.isArray(p.applicants) && p.applicants[0]) || {};
  return {
    site_name: site.name,
    site_url: site.url,
    dashboard_url: `${SITE_CATALOG.core.url}/#/broker`,
    channel: lead.channel === 'mcp' ? 'an AI assistant (MCP)' : 'the website',
    lead: {
      id: lead.id,
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      preferred_time: lead.preferred_time,
      segment: lead.segment,
      source: leadSource(lead.attribution),
    },
    summary: {
      ready: s.ready,
      close: s.close,
      lenders: s.lenders,
      lvr: s.lvr,
      borrowing_power: money(s.borrowingPower),
      top_lenders: (Array.isArray(s.topLenders) ? s.topLenders : []).join(', ') || '—',
      stamp_duty: money(s.stampDuty),
      fhog: s.fhog ? money(s.fhog) : null,
      scheme_eligible: !!s.schemeEligible,
    },
    profile: {
      applicants: p.mode === 'joint' ? 'Joint' : 'Solo',
      first_home: p.firstHome ? 'Yes' : 'No',
      purpose: p.purpose,
      state: p.state,
      price: money(p.price),
      loan: money(p.loan),
      savings: money(p.savings),
      employment: String(a0.employment ?? '').replace('_', ' '),
      income: money(a0.baseIncome),
      profession: p.profession ?? null,
    },
    broker_name: broker?.name ?? 'our broker partner',
    broker_business: broker?.business_name ?? '',
  };
}
