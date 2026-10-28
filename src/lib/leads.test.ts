// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { emptyProfile } from '../engine/profile';
import type { LeadSummary } from '../engine/summary';

const fake = vi.hoisted(() => {
  const state = {
    insert: { error: null as null | { message: string } },
    select: { data: [] as unknown[] | null, error: null as null | { message: string } },
    rpc: { data: null as unknown, error: null as null | { message: string } },
  };
  const calls = { insert: [] as unknown[], order: [] as unknown[], rpc: [] as unknown[], from: [] as string[] };
  const client = {
    from: (t: string) => {
      calls.from.push(t);
      return {
        insert: async (row: unknown) => (calls.insert.push(row), state.insert),
        select: () => ({ order: async (...a: unknown[]) => (calls.order.push(a), state.select) }),
      };
    },
    rpc: async (...a: unknown[]) => (calls.rpc.push(a), state.rpc),
  };
  const createClient = vi.fn(() => client);
  return { state, calls, client, createClient };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: fake.createClient }));

type LeadsModule = typeof import('./leads');

async function load(mode: 'local' | 'supabase'): Promise<LeadsModule> {
  vi.resetModules();
  vi.stubEnv('VITE_SUPABASE_URL', mode === 'supabase' ? 'https://example.supabase.co' : '');
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', mode === 'supabase' ? 'anon-key' : '');
  return import('./leads');
}

const summary: LeadSummary = { ready: 3, close: 1, lenders: 10, lvr: 80, borrowingPower: 600000, topLenders: ['A'], stampDuty: 1000, fhog: 0, schemeEligible: false };
const input = { name: 'Ann', email: 'a@b.co', phone: '0400', preferred_time: 'am', consent: true, profile: emptyProfile(), summary };

beforeEach(() => {
  fake.state.insert = { error: null };
  fake.state.select = { data: [], error: null };
  fake.state.rpc = { data: null, error: null };
  fake.calls.insert = [];
  fake.calls.order = [];
  fake.calls.rpc = [];
  fake.calls.from = [];
  fake.createClient.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/');
});

describe('captureAttribution', () => {
  it('stores first-touch utm params, referrer host and landing path', async () => {
    const m = await load('local');
    window.history.replaceState(null, '', '/landing?utm_source=google&utm_medium=cpc&utm_campaign=spring');
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://news.example.com/article');
    m.captureAttribution();
    const stored = JSON.parse(localStorage.getItem('keyready:attr:core')!);
    expect(stored).toEqual({ utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'spring', referrer: 'news.example.com', landing: '/landing' });
  });

  it('omits missing params and referrer', async () => {
    const m = await load('local');
    m.captureAttribution();
    expect(JSON.parse(localStorage.getItem('keyready:attr:core')!)).toEqual({ landing: '/' });
  });

  it('keeps the first touch on later visits', async () => {
    const m = await load('local');
    localStorage.setItem('keyready:attr:core', '{"utm_source":"first"}');
    window.history.replaceState(null, '', '/?utm_source=second');
    m.captureAttribution();
    expect(localStorage.getItem('keyready:attr:core')).toBe('{"utm_source":"first"}');
  });

  it('swallows blocked storage', async () => {
    const m = await load('local');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    expect(() => m.captureAttribution()).not.toThrow();
  });
});

describe('normaliseLead', () => {
  it('fills a non-object with safe defaults', async () => {
    const { normaliseLead } = await load('local');
    for (const raw of [null, 'x']) {
      const l = normaliseLead(raw);
      expect(l).toMatchObject({ id: '', name: '', consent: false, site: 'core', segment: '', channel: 'web', attribution: {}, status: undefined });
      expect(l.profile).toEqual(emptyProfile());
      expect(l.summary).toEqual({ ready: 0, close: 0, lenders: 0, lvr: 0, borrowingPower: 0, topLenders: [], stampDuty: 0, fhog: 0, schemeEligible: false });
    }
  });

  it('keeps valid fields and drops malformed ones', async () => {
    const { normaliseLead } = await load('local');
    const l = normaliseLead({
      id: 'x1', created_at: '2026-01-01', name: 'Bo', email: 'e', phone: 'p', preferred_time: 't', consent: true,
      profile: { ...emptyProfile(), price: 500000 },
      summary: { ready: 2, close: Infinity, lenders: '3', topLenders: ['A', 4, 'B'], schemeEligible: true },
      site: 'nurses', segment: 'icu', channel: 'mcp',
      attribution: { utm_source: 'g', utm_medium: 7, referrer: 'r' },
      status: 'settled',
    });
    expect(l).toMatchObject({ id: 'x1', name: 'Bo', consent: true, site: 'nurses', segment: 'icu', channel: 'mcp', status: 'settled' });
    expect(l.profile.price).toBe(500000);
    expect(l.summary).toMatchObject({ ready: 2, close: 0, lenders: 0, topLenders: ['A', 'B'], schemeEligible: true });
    expect(l.attribution).toEqual({ utm_source: 'g', referrer: 'r' });
    expect(normaliseLead({ summary: { topLenders: 'A' }, status: 'bogus', attribution: null }).summary.topLenders).toEqual([]);
  });
});

describe('local mode', () => {
  it('reports local mode and no client', async () => {
    const m = await load('local');
    expect(m.backendMode).toBe('local');
    expect(m.getSupabase()).toBeNull();
    expect(await m.confirmLead('t')).toBe('not_found');
    expect(await m.claimBroker()).toEqual({ name: 'Demo broker' });
  });

  it('submits, lists (newest first) and updates status in this browser', async () => {
    const m = await load('local');
    localStorage.setItem('keyready:attr:core', JSON.stringify({ utm_source: 'fb', bad: 1 }));
    expect(await m.listLeads()).toEqual([]);
    await m.submitLead(input);
    await m.submitLead({ ...input, name: 'Second' });
    const list = await m.listLeads();
    expect(list.map(l => l.name)).toEqual(['Second', 'Ann']);
    expect(list[0]).toMatchObject({ site: 'core', channel: 'web', attribution: { utm_source: 'fb' } });
    expect(list[0].id).toMatch(/[0-9a-f-]{36}/);
    await m.setLeadStatus(list[1].id, 'contacted');
    const after = await m.listLeads();
    expect(after.map(l => l.status)).toEqual([undefined, 'contacted']);
    expect(fake.createClient).not.toHaveBeenCalled();
  });

  it('treats unreadable attribution and lead storage as empty', async () => {
    const m = await load('local');
    localStorage.setItem('keyready:attr:core', '{bad json');
    localStorage.setItem('keyready:leads', '{"not":"array"}');
    expect(await m.listLeads()).toEqual([]);
    await m.submitLead(input);
    expect((await m.listLeads())[0].attribution).toEqual({});
    localStorage.setItem('keyready:leads', 'not json');
    expect(await m.listLeads()).toEqual([]);
  });

  it('reports when the device cannot save', async () => {
    const m = await load('local');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });
    await expect(m.submitLead(input)).rejects.toThrow('Could not save on this device.');
  });
});

describe('supabase mode', () => {
  it('creates the client once, lazily', async () => {
    const m = await load('supabase');
    expect(m.backendMode).toBe('supabase');
    expect(fake.createClient).not.toHaveBeenCalled();
    const a = m.getSupabase();
    const b = m.getSupabase();
    expect(a).toBe(b);
    expect(await a).toBe(fake.client);
    expect(fake.createClient).toHaveBeenCalledWith('https://example.supabase.co', 'anon-key');
    expect(fake.createClient).toHaveBeenCalledTimes(1);
  });

  it('inserts leads and surfaces insert errors', async () => {
    const m = await load('supabase');
    await m.submitLead(input);
    expect(fake.calls.from).toEqual(['leads']);
    expect(fake.calls.insert[0]).toMatchObject({ name: 'Ann', site: 'core', channel: 'web', attribution: {} });
    expect(localStorage.getItem('keyready:leads')).toBeNull();
    fake.state.insert = { error: { message: 'insert denied' } };
    await expect(m.submitLead(input)).rejects.toThrow('insert denied');
  });

  it('lists leads newest first, normalised, and surfaces errors', async () => {
    const m = await load('supabase');
    fake.state.select = { data: [{ id: 'a', name: 'Z', site: '' }], error: null };
    const list = await m.listLeads();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 'a', name: 'Z', site: 'core' });
    expect(fake.calls.order[0]).toEqual(['created_at', { ascending: false }]);
    fake.state.select = { data: null, error: null };
    expect(await m.listLeads()).toEqual([]);
    fake.state.select = { data: null, error: { message: 'select denied' } };
    await expect(m.listLeads()).rejects.toThrow('select denied');
  });

  it('confirms leads by token', async () => {
    const m = await load('supabase');
    fake.state.rpc = { data: 'confirmed', error: null };
    expect(await m.confirmLead('tok')).toBe('confirmed');
    expect(fake.calls.rpc[0]).toEqual(['confirm_lead', { p_token: 'tok' }]);
    fake.state.rpc = { data: null, error: { message: 'rpc down' } };
    await expect(m.confirmLead('tok')).rejects.toThrow('rpc down');
  });

  it('claims a broker row, or null when the account is not a broker', async () => {
    const m = await load('supabase');
    fake.state.rpc = { data: { id: 'b1', name: 'Pat' }, error: null };
    expect(await m.claimBroker()).toEqual({ id: 'b1', name: 'Pat' });
    expect(fake.calls.rpc[0]).toEqual(['claim_broker']);
    fake.state.rpc = { data: {}, error: null };
    expect(await m.claimBroker()).toBeNull();
    fake.state.rpc = { data: null, error: null };
    expect(await m.claimBroker()).toBeNull();
    fake.state.rpc = { data: null, error: { message: 'no auth' } };
    await expect(m.claimBroker()).rejects.toThrow('no auth');
  });

  it('records lead status through the rpc', async () => {
    const m = await load('supabase');
    await m.setLeadStatus('l1', 'settled', 'done', 500000);
    await m.setLeadStatus('l2', 'lost');
    expect(fake.calls.rpc).toEqual([
      ['set_lead_status', { p_lead: 'l1', p_status: 'settled', p_note: 'done', p_settled_amount: 500000 }],
      ['set_lead_status', { p_lead: 'l2', p_status: 'lost', p_note: '', p_settled_amount: null }],
    ]);
    fake.state.rpc = { data: null, error: { message: 'forbidden' } };
    await expect(m.setLeadStatus('l1', 'new')).rejects.toThrow('forbidden');
  });
});
