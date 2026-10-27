// Called by the leads_notify database trigger (pg_net). Sends the two transactional emails
// through Knock: the case to the broker, and a confirmation to the borrower.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { SITE_CATALOG } from '../_shared/sites.js';
import { triggerKnock } from '../_shared/knock.ts';

const money = (n: number) => (typeof n === 'number' ? `$${Math.round(n).toLocaleString('en-AU')}` : '—');

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  // verify_jwt is off (pg_net can't mint a user JWT), so authenticate with the shared secret.
  if (!Deno.env.get('NOTIFY_SECRET') || req.headers.get('x-notify-secret') !== Deno.env.get('NOTIFY_SECRET'))
    return new Response('Unauthorized', { status: 401 });

  const { lead, broker } = await req.json();
  const site = SITE_CATALOG[lead.site] ?? SITE_CATALOG.core;
  const s = lead.summary ?? {};
  const p = lead.profile ?? {};
  const a0 = p.applicants?.[0] ?? {};
  const data = {
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
      source: [lead.attribution?.utm_source, lead.attribution?.utm_campaign, lead.attribution?.referrer].filter(Boolean).join(' · ') || 'direct',
    },
    summary: {
      ready: s.ready,
      close: s.close,
      lenders: s.lenders,
      lvr: s.lvr,
      borrowing_power: money(s.borrowingPower),
      top_lenders: (s.topLenders ?? []).join(', ') || '—',
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

  const results = await Promise.allSettled([
    broker
      ? triggerKnock('new-lead', { id: `broker-${broker.id}`, email: broker.email, name: broker.name }, data, `lead-${lead.id}`)
      : Promise.reject(new Error('No default broker configured — add one to public.brokers')),
    triggerKnock('lead-confirmation', { id: `lead-${lead.id}`, email: lead.email, name: lead.name }, data, `lead-${lead.id}`),
  ]);
  const errors = results.filter(r => r.status === 'rejected').map(r => String((r as PromiseRejectedResult).reason));
  if (errors.length) console.error('notify-lead', lead.id, errors);
  return Response.json({ ok: errors.length === 0, errors }, { status: errors.length ? 502 : 200 });
});
