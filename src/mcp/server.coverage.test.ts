import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { describe, expect, it, vi } from 'vitest';
import { emptyProfile, newApplicant } from '../engine/profile';
import type { Profile } from '../engine/types';
import { SITE_CATALOG } from '../sites/catalog';
import { createKeyReadyMcp, readinessReport, toProfile, type McpDeps } from './server';

// The frozen lender fixture stands in for the weekly-refreshed market data, so results are stable.
vi.mock('../engine/market', async importOriginal => {
  const lenders = (await import('../engine/__fixtures__/lenders.json')).default;
  return { ...(await importOriginal<typeof import('../engine/market')>()), MARKET_LENDERS: lenders };
});

async function connect(deps: Partial<McpDeps> = {}) {
  const handler = createKeyReadyMcp({ insertLead: async () => ({ id: 'abcdef12-0000-0000-0000-000000000000' }), ...deps });
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('https://mcp.test/mcp'), { fetch: (url, init) => handler.fetch(new Request(url, init)) }));
  return client;
}
type Result = { content: { text?: string }[]; structuredContent?: Record<string, any>; isError?: boolean };
const call = async (client: Client, name: string, args: Record<string, unknown>) => (await client.callTool({ name, arguments: args })) as Result;

type Situation = Parameters<typeof toProfile>[0];
const person = { age: 34, residency: 'citizen', employment: 'full_time', months_in_role: 48, annual_base_income: 140_000, annual_overtime: 0, annual_allowances: 0, annual_bonus: 0, annual_commission: 0 } as const;
const sit = (o: Partial<Situation> = {}): Situation => ({
  applicants: [person], first_home: false, state: 'WA', location: 'capital', purpose: 'owner', property_type: 'house', new_or_existing: 'existing',
  price: 650_000, savings: 160_000, gift: 0, credit_card_limits: 0, personal_loans: 0, hecs_balance: 0, dependants: 0,
  credit_defaults: 'no', lives_overseas: false, income_currency: 'AUD', low_doc: false, ...o,
});
const profile = (o: Partial<Profile> = {}): Profile => ({
  ...emptyProfile(), applicants: [{ ...newApplicant(), age: 34, tenureMonths: 48, baseIncome: 140_000 }],
  firstHome: false, state: 'WA', price: 650_000, loan: 520_000, savings: 160_000, creditScore: 820, ...o,
});

describe('toProfile', () => {
  it('infers the household from applicants and dependants', () => {
    expect(toProfile(sit({ applicants: [person, person], dependants: 2 }))).toMatchObject({ mode: 'joint', household: 'family' });
    expect(toProfile(sit({ applicants: [person, person] }))).toMatchObject({ mode: 'joint', household: 'couple' });
    expect(toProfile(sit({ dependants: 1 }))).toMatchObject({ mode: 'solo', household: 'family' });
    expect(toProfile(sit())).toMatchObject({ mode: 'solo', household: 'single', creditScore: null, profession: null });
    expect(toProfile(sit({ household: 'sharing', dependants: 1 })).household).toBe('sharing');
  });
  it('maps construction to a new build and keeps given loan, score and profession', () => {
    const p = toProfile(sit({ purpose: 'construction', loan: 400_000, credit_score: 700, profession: 'nurse' }));
    expect(p).toMatchObject({ condition: 'new', loan: 400_000, creditScore: 700, profession: 'nurse' });
  });
});

describe('readinessReport', () => {
  it('labels fits, close and not-yet lenders, and omits rates without a comparison rate', () => {
    const s = readinessReport(profile({ creditScore: 360 })).structuredContent;
    expect(new Set(s.top_lenders.map(t => t.status))).toEqual(new Set(['fits published rules', 'close']));
    const far = readinessReport(profile({ creditScore: 300, applicants: [{ ...newApplicant(), age: 34, tenureMonths: 0, baseIncome: 140_000 }] })).structuredContent;
    expect(new Set(far.top_lenders.map(t => t.status))).toEqual(new Set(['fits published rules', 'not yet']));
    expect(s.top_lenders.some(t => !('rate' in t) && !('comparison_rate' in t))).toBe(true);
    expect(s.top_lenders.find(t => t.status === 'close')!.reasons.length).toBeGreaterThan(0);
  });
  it('lists the fastest wins when there are fixes', () => {
    const r = readinessReport(profile({ loan: 640_000 }));
    expect(r.structuredContent.fastest_wins.length).toBeGreaterThan(0);
    expect(r.structuredContent.fastest_wins[0]).toHaveProperty('borrowing_power_gain');
    expect(r.content[0].text).toMatch(/Fastest wins: /);
  });
  it('mentions the concession and grant, and falls back to the core site for an unknown id', () => {
    const r = readinessReport(profile({ firstHome: true, state: 'QLD', condition: 'new', price: 700_000, loan: 600_000 }), 'nope');
    expect(r.structuredContent.full_report_url.startsWith(`${SITE_CATALOG.core.url}/#/report?`)).toBe(true);
    expect(r.content[0].text).toMatch(/\(First home \(new home\) concession\); First Home Owner Grant \$30,000/);
  });
  it('omits concession, grant and wins when there are none', () => {
    const text = readinessReport(profile({ purpose: 'investment' })).content[0].text;
    expect(text).toMatch(/Stamp duty \$[\d,]+\. 5% Deposit Scheme: not eligible\./);
  });
});

describe('MCP tools, other branches', () => {
  it('stamp duty: concession, surcharge, grant and property types', async () => {
    const c = await connect();
    const fhb = await call(c, 'calculate_stamp_duty', { state: 'NSW', price: 850_000, first_home: true });
    expect(fhb.content[0].text).toMatch(/with the First Home Buyers Assistance Scheme \(general rate \$[\d,]+\)/);

    const foreign = await call(c, 'calculate_stamp_duty', { state: 'NSW', price: 850_000, owner_occupier: false, foreign_buyer: true, vacant_land: true });
    expect(foreign.structuredContent!.foreign_surcharge).toBe(76_500);
    expect(foreign.content[0].text).toMatch(/Foreign surcharge \$76,500\./);

    const grant = await call(c, 'calculate_stamp_duty', { state: 'QLD', price: 700_000, first_home: true, new_home: true });
    expect(grant.content[0].text).toMatch(/First Home Owner Grant \$30,000\./);

    const pkg = await call(c, 'calculate_stamp_duty', { state: 'NT', price: 500_000, house_and_land_package: true });
    expect(pkg.structuredContent).toMatchObject({ duty: 0, concession: 'House and land package exemption' });

    // ACT owner-occupier above $1.455m: concession named but no saving, so no "with the" clause.
    const act = await call(c, 'calculate_stamp_duty', { state: 'ACT', price: 2_000_000 });
    expect(act.structuredContent!.concession).toBe('Owner-occupier rates');
    expect(act.content[0].text).not.toMatch(/with the/);
  });

  it('deposit scheme: Family Home Guarantee and ineligible buyers', async () => {
    const c = await connect();
    const fam = await call(c, 'check_5_percent_deposit_scheme', { state: 'NSW', price: 700_000, first_home: false, single_parent: true });
    expect(fam.structuredContent).toMatchObject({ eligible: true, variant: 'family', min_deposit_pct: 2 });
    expect(fam.content[0].text).toMatch(/^Looks eligible for the Family Home Guarantee/);

    const no = await call(c, 'check_5_percent_deposit_scheme', { state: 'NSW', price: 700_000, first_home: true, all_buyers_citizens_or_pr: false, will_live_in_it: false });
    expect(no.structuredContent!.eligible).toBe(false);
    expect(no.content[0].text).toMatch(/^Not eligible: .*live in.*citizen or permanent resident/);
  });

  it('lists investor rates', async () => {
    const c = await connect();
    const r = await call(c, 'list_lender_rates', { lvr: 80, purpose: 'investment', limit: 3 });
    expect(r.structuredContent).toMatchObject({ purpose: 'investment' });
    expect(r.structuredContent!.lenders).toHaveLength(3);
    expect(r.content[0].text).toMatch(/Variable P&I, investment, LVR ≤ 80%/);
  });

  it('refuses a fourth referral for the same email in a day', async () => {
    const insertLead = vi.fn(async () => ({ id: 'abcdef12-0000' }));
    const args = { ...sit(), name: 'Sam', email: 'sam@example.com', phone: '0400 000 000', consent: true };
    const busy = await connect({ insertLead, recentLeadCount: async () => 3 });
    const r = await call(busy, 'refer_to_broker', args);
    expect(r.isError).toBe(true);
    expect(insertLead).not.toHaveBeenCalled();

    const quiet = await connect({ insertLead, recentLeadCount: async () => 2 });
    expect((await call(quiet, 'refer_to_broker', args)).structuredContent).toMatchObject({ pending_confirmation: true });
    expect(insertLead).toHaveBeenCalledOnce();
  });
});
