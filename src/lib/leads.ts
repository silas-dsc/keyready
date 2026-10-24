import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '../engine/types';

export interface LeadSummary {
  ready: number;
  close: number;
  lvr: number;
  borrowingPower: number;
  topLenders: string[];
}

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

export async function submitLead(lead: Omit<Lead, 'id' | 'created_at'>): Promise<void> {
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
