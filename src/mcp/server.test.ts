import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';
import { decodeProfile } from '../engine/share';
import { createKeyReadyMcp, type LeadInsert } from './server';

/** End-to-end: the official MCP client talking to the server through its web-standard fetch handler. */
async function connect() {
  const leads: LeadInsert[] = [];
  const handler = createKeyReadyMcp({ insertLead: async l => (leads.push(l), { id: 'abcdef12-0000-0000-0000-000000000000' }) });
  const client = new Client({ name: 'test', version: '1.0.0' });
  await client.connect(new StreamableHTTPClientTransport(new URL('https://mcp.test/mcp'), { fetch: (url, init) => handler.fetch(new Request(url, init)) }));
  return { client, leads };
}

type Result = { content: { type: string; text?: string }[]; structuredContent?: Record<string, unknown>; isError?: boolean };
const call = async (client: Client, name: string, args: Record<string, unknown>) => (await client.callTool({ name, arguments: args })) as Result;

const borrower = {
  applicants: [{ age: 34, annual_base_income: 140_000, months_in_role: 48 }],
  first_home: true,
  state: 'WA',
  price: 650_000,
  savings: 160_000,
  credit_score: 820,
};

describe('KeyReady MCP server', () => {
  it('lists the five tools, with calculators marked read-only', async () => {
    const { client } = await connect();
    const { tools } = await client.listTools();
    expect(tools.map(t => t.name).sort()).toEqual(['assess_home_loan_readiness', 'calculate_stamp_duty', 'check_5_percent_deposit_scheme', 'list_lender_rates', 'refer_to_broker']);
    for (const t of tools.filter(t => t.name !== 'refer_to_broker')) expect(t.annotations?.readOnlyHint).toBe(true);
    expect(tools.find(t => t.name === 'refer_to_broker')?.annotations?.readOnlyHint).toBe(false);
  });

  it('assesses readiness and links to the full report', async () => {
    const { client } = await connect();
    const r = await call(client, 'assess_home_loan_readiness', borrower);
    const s = r.structuredContent!;
    expect(s.lenders_checked).toBeGreaterThan(30);
    expect(s.fits).toBeGreaterThan(0);
    expect(s.stamp_duty).toBe(8075); // WA first home owner rate, $650k
    expect(r.content[0].text).toMatch(/Full interactive report: https:\/\//);
    const p = decodeProfile(String(s.full_report_url).split('profile=')[1]);
    expect(p?.price).toBe(650_000);
    expect(p?.loan).toBeGreaterThan(400_000); // derived from savings when loan is omitted
  });

  it('calculates stamp duty with official figures', async () => {
    const { client } = await connect();
    const r = await call(client, 'calculate_stamp_duty', { state: 'VIC', price: 650_000, first_home: true });
    expect(r.structuredContent?.duty).toBe(11_356); // SRO VIC calculator
  });

  it('checks the 5% Deposit Scheme', async () => {
    const { client } = await connect();
    const r = await call(client, 'check_5_percent_deposit_scheme', { state: 'NSW', price: 900_000, first_home: true });
    expect(r.structuredContent?.eligible).toBe(true);
  });

  it('lists live lender rates, masked', async () => {
    const { client } = await connect();
    const r = await call(client, 'list_lender_rates', { lvr: 80, limit: 5 });
    const rows = r.structuredContent?.lenders as { lender: string; rate: number }[];
    expect(rows).toHaveLength(5);
    expect(rows.every(x => /^Lender \d+$/.test(x.lender))).toBe(true);
    expect(rows[0].rate).toBeLessThanOrEqual(rows[4].rate);
  });

  it('never gives a rate without its comparison rate and the warning', async () => {
    const { client } = await connect();
    const list = await call(client, 'list_lender_rates', { lvr: 80, limit: 25 });
    const rows = list.structuredContent?.lenders as { rate: number; comparison_rate: number }[];
    expect(rows.every(x => x.comparison_rate >= x.rate - 0.01)).toBe(true);
    expect(list.content[0].text).toMatch(/comparison rate .*\n[\s\S]*\$150,000 over 25 years[\s\S]*WARNING: This comparison rate is true only/);

    const r = await call(client, 'assess_home_loan_readiness', borrower);
    const top = r.structuredContent?.top_lenders as { rate?: string; comparison_rate?: string }[];
    expect(top.every(t => (t.rate === undefined) === (t.comparison_rate === undefined))).toBe(true);
    expect(r.structuredContent?.comparison_rate_warning).toMatch(/^Comparison rates are calculated on a secured loan of \$150,000/);
  });

  it('refers to the broker only with consent, pending the borrower’s email confirmation', async () => {
    const { client, leads } = await connect();
    const contact = { name: 'Sam Test', email: 'sam@example.com', phone: '0400 000 000' };
    const refused = await call(client, 'refer_to_broker', { ...borrower, ...contact, consent: false });
    expect(refused.isError).toBe(true);
    expect(leads).toHaveLength(0);

    const ok = await call(client, 'refer_to_broker', { ...borrower, ...contact, consent: true, site: 'professionals' });
    expect(ok.structuredContent?.pending_confirmation).toBe(true);
    expect(ok.content[0].text).toMatch(/emailed sam@example\.com a link to confirm/);
    expect(leads[0]).toMatchObject({ channel: 'mcp', site: 'professionals', segment: 'professionals', consent: true, email: 'sam@example.com' });
    expect(ok.content[0].text).toMatch(/Goodlend Mortgage Brokers/);
  });
});
