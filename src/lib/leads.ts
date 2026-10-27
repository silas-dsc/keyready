import type { SupabaseClient } from '@supabase/supabase-js';
import type { LeadSummary } from '../engine/summary';
import type { Profile } from '../engine/types';
import { SITE } from '../sites';

export type { LeadSummary };

export interface Lead {
  id: string;
  created_at: string;
  name: string;
  email: string;
  phone: string;
  preferred_time: string;
  consent: boolean;
  profile: Profile;
  summary: LeadSummary;
  /** Which site in the family and which sub-market the lead came from. */
  site: string;
  segment: string;
  /** 'web' form or an AI assistant via the MCP server. */
  channel: 'web' | 'mcp';
  attribution: Attribution;
  /** Broker feedback: the pipeline stage the broker last recorded. */
  status?: LeadStatus;
}

export type LeadStatus = 'new' | 'contacted' | 'application' | 'approved' | 'settled' | 'lost';

export interface Attribution {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  referrer?: string;
  landing?: string;
}

const ATTR_KEY = `keyready:attr:${SITE.id}`;

/** First-touch attribution: remembered from the visit that brought the person here. */
export function captureAttribution() {
  try {
    if (localStorage.getItem(ATTR_KEY)) return;
    const q = new URLSearchParams(window.location.search);
    const a: Attribution = {
      utm_source: q.get('utm_source') ?? undefined,
      utm_medium: q.get('utm_medium') ?? undefined,
      utm_campaign: q.get('utm_campaign') ?? undefined,
      referrer: document.referrer ? new URL(document.referrer).hostname : undefined,
      landing: window.location.pathname,
    };
    localStorage.setItem(ATTR_KEY, JSON.stringify(a));
  } catch {
    /* storage blocked — attribution is best-effort */
  }
}

function attribution(): Attribution {
  try {
    return JSON.parse(localStorage.getItem(ATTR_KEY) ?? '{}') as Attribution;
  } catch {
    return {};
  }
}

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Supabase is optional: without credentials, leads stay in this browser so the demo still works end to end. */
export const backendMode: 'supabase' | 'local' = url && key ? 'supabase' : 'local';

let client: Promise<SupabaseClient> | null = null;
/** Loaded on demand so visitors who never hit the backend don't download the client. */
export function getSupabase(): Promise<SupabaseClient> | null {
  if (backendMode === 'local') return null;
  client ??= import('@supabase/supabase-js').then(m => m.createClient(url!, key!));
  return client;
}

const LOCAL_KEY = 'keyready:leads';

function localLeads(): Lead[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? '[]') as Lead[];
  } catch {
    return [];
  }
}

export async function submitLead(input: Pick<Lead, 'name' | 'email' | 'phone' | 'preferred_time' | 'consent' | 'profile' | 'summary'>): Promise<void> {
  const lead: Omit<Lead, 'id' | 'created_at'> = { ...input, site: SITE.id, segment: SITE.segment, channel: 'web', attribution: attribution() };
  const sb = getSupabase();
  if (sb) {
    const { error } = await (await sb).from('leads').insert(lead);
    if (error) throw new Error(error.message);
    return;
  }
  const full: Lead = { ...lead, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([full, ...localLeads()]));
  } catch {
    throw new Error('Could not save on this device.');
  }
}

export async function listLeads(): Promise<Lead[]> {
  const sb = getSupabase();
  if (sb) {
    const { data, error } = await (await sb).from('leads').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []) as Lead[];
  }
  return localLeads();
}

export type ConfirmResult = 'confirmed' | 'already_confirmed' | 'expired' | 'not_found';

/** The borrower confirms an AI-assistant referral from the link in our email. */
export async function confirmLead(token: string): Promise<ConfirmResult> {
  const sb = getSupabase();
  if (!sb) return 'not_found';
  const { data, error } = await (await sb).rpc('confirm_lead', { p_token: token });
  if (error) throw new Error(error.message);
  return data as ConfirmResult;
}

export const LEAD_STATUSES: LeadStatus[] = ['new', 'contacted', 'application', 'approved', 'settled', 'lost'];

/** Link the signed-in broker account to its broker row (rows are added by the operator; see docs/BACKEND.md). */
export async function claimBroker(): Promise<{ name: string } | null> {
  const sb = getSupabase();
  if (!sb) return { name: 'Demo broker' };
  const { data, error } = await (await sb).rpc('claim_broker');
  if (error) throw new Error(error.message);
  return data?.id ? (data as { name: string }) : null;
}

/** Broker feedback on a lead — the signal that tells us which sub-markets convert. */
export async function setLeadStatus(id: string, status: LeadStatus, note = '', settledAmount?: number): Promise<void> {
  const sb = getSupabase();
  if (sb) {
    const { error } = await (await sb).rpc('set_lead_status', { p_lead: id, p_status: status, p_note: note, p_settled_amount: settledAmount ?? null });
    if (error) throw new Error(error.message);
    return;
  }
  const all = localLeads().map(l => (l.id === id ? { ...l, status } : l));
  localStorage.setItem(LOCAL_KEY, JSON.stringify(all));
}
