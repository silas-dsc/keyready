// Called by the leads_notify database triggers (pg_net). For a new confirmed referral it sends the two
// transactional emails through Knock: the case to the broker and a confirmation to the borrower. For an
// AI-assistant referral still waiting on the borrower (kind 'confirm'), it sends only the confirm-link email.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { leadEmailData } from '../_shared/lead-email.js';
import { SITE_CATALOG } from '../_shared/sites.js';
import { triggerKnock } from '../_shared/knock.ts';

Deno.serve(async req => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  // verify_jwt is off (pg_net can't mint a user JWT), so authenticate with the shared secret.
  if (!Deno.env.get('NOTIFY_SECRET') || req.headers.get('x-notify-secret') !== Deno.env.get('NOTIFY_SECRET'))
    return new Response('Unauthorized', { status: 401 });

  const { kind = 'new', lead, broker } = await req.json();
  const data = leadEmailData(lead, broker);
  const site = SITE_CATALOG[lead.site] ?? SITE_CATALOG.core;

  if (kind === 'confirm') {
    const confirm = { ...data, confirm_url: `${site.url}/#/confirm?token=${lead.confirm_token}` };
    try {
      await triggerKnock('confirm-referral', { id: `lead-${lead.id}`, email: lead.email, name: lead.name }, confirm, `confirm-${lead.id}`);
      return Response.json({ ok: true, errors: [] });
    } catch (e) {
      console.error('notify-lead confirm', lead.id, String(e));
      return Response.json({ ok: false, errors: [String(e)] }, { status: 502 });
    }
  }

  const results = await Promise.allSettled([
    broker
      ? triggerKnock('new-lead', { id: `broker-${broker.id}`, email: broker.email, name: broker.name }, data, `lead-${lead.id}`)
      : Promise.reject(new Error('No default broker configured: add one to public.brokers')),
    triggerKnock('lead-confirmation', { id: `lead-${lead.id}`, email: lead.email, name: lead.name }, data, `lead-${lead.id}`),
  ]);
  const errors = results.filter(r => r.status === 'rejected').map(r => String((r as PromiseRejectedResult).reason));
  if (errors.length) console.error('notify-lead', lead.id, errors);
  return Response.json({ ok: errors.length === 0, errors }, { status: errors.length ? 502 : 200 });
});
