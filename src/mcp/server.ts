import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { fixActions } from '../engine/actions';
import { stampDuty } from '../engine/duty';
import { depositScheme, upfrontCosts } from '../engine/finance';
import { MARKET_FETCHED_AT, MARKET_LENDERS, productRate } from '../engine/market';
import { assess } from '../engine/match';
import { emptyProfile, newApplicant } from '../engine/profile';
import { encodeProfile } from '../engine/share';
import { summarise } from '../engine/summary';
import type { Profile } from '../engine/types';
import { BROKER, BROKER_DISCLOSURE } from '../sites/broker';
import { SITE_CATALOG } from '../sites/catalog';

/**
 * The KeyReady MCP server: the same rules engine the websites use, exposed to AI assistants
 * (Claude, ChatGPT, Gemini, Perplexity, Le Chat, Cursor…). Runtime-agnostic — the Supabase Edge
 * Function supplies `insertLead`; tests supply a fake.
 */

export interface LeadInsert {
  name: string;
  email: string;
  phone: string;
  preferred_time: string;
  consent: true;
  profile: Profile;
  summary: ReturnType<typeof summarise>;
  site: string;
  segment: string;
  channel: 'mcp';
  attribution: Record<string, string>;
}

export interface McpDeps {
  insertLead: (lead: LeadInsert) => Promise<{ id: string }>;
  /** Max referrals per email address per day (abuse guard). */
  recentLeadCount?: (email: string) => Promise<number>;
}

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS', 'ACT', 'NT'] as const;
const SITE_IDS = Object.keys(SITE_CATALOG) as [string, ...string[]];
const DATA_DATE = MARKET_FETCHED_AT.slice(0, 10);
const NOTICE =
  'General information only — not credit assistance, financial advice or a comparison service. It checks the user’s answers against lenders’ published rules (Open Banking data) and typical policy settings; lenders make their own decisions. Lender names are masked.';

const applicant = z.object({
  age: z.number().int().min(18).max(90),
  residency: z.enum(['citizen', 'permanent_resident', 'nz_citizen', 'awaiting_pr', 'temporary_visa', 'other']).default('citizen'),
  employment: z.enum(['full_time', 'part_time', 'casual', 'contractor', 'self_employed', 'not_working', 'retired']).default('full_time'),
  months_in_role: z.number().int().min(0).max(600).default(24).describe('Months with the current employer, or months the ABN has been registered if self-employed'),
  annual_base_income: z.number().min(0).max(10_000_000).describe('Gross annual base income in AUD (or the equivalent if paid in another currency), excluding super'),
  annual_overtime: z.number().min(0).default(0),
  annual_allowances: z.number().min(0).default(0),
  annual_bonus: z.number().min(0).default(0),
  annual_commission: z.number().min(0).default(0),
});

const situation = z.object({
  applicants: z.array(applicant).min(1).max(2).describe('One or two borrowers; the first is the main borrower'),
  first_home: z.boolean().describe('Never owned property in Australia'),
  state: z.enum(STATES).describe('State or territory where the property is'),
  location: z.enum(['capital', 'regional']).default('capital').describe('Capital city / regional centre, or elsewhere in the state'),
  purpose: z.enum(['owner', 'investment', 'construction']).default('owner'),
  property_type: z.enum(['house', 'apartment', 'house_land', 'land']).default('house'),
  new_or_existing: z.enum(['existing', 'new']).default('existing'),
  price: z.number().min(50_000).max(50_000_000).describe('Purchase price in AUD'),
  loan: z.number().min(0).optional().describe('Loan amount in AUD; if omitted, savings + gift less upfront costs is used as the deposit'),
  savings: z.number().min(0).default(0),
  gift: z.number().min(0).default(0).describe('Family gift toward the deposit'),
  credit_card_limits: z.number().min(0).default(0).describe('Total credit card limits (not balances)'),
  personal_loans: z.number().min(0).default(0).describe('Personal and car loan balances'),
  hecs_balance: z.number().min(0).default(0),
  household: z.enum(['single', 'couple', 'family', 'sharing']).optional(),
  dependants: z.number().int().min(0).max(10).default(0),
  credit_defaults: z.enum(['no', 'yes', 'unsure']).default('no'),
  credit_score: z.number().int().min(0).max(1200).optional().describe('Equifax-style score out of 1200, if known'),
  profession: z.enum(['doctor', 'specialist', 'dentist', 'vet', 'pharmacist', 'physio', 'optometrist', 'psychologist', 'nurse', 'midwife', 'allied_health', 'lawyer', 'accountant', 'actuary', 'engineer']).optional()
    .describe('Main borrower’s profession — some lenders waive LMI for listed professions'),
  lives_overseas: z.boolean().default(false).describe('Main borrower currently lives outside Australia'),
  income_currency: z.enum(['AUD', 'USD', 'GBP', 'EUR', 'NZD', 'SGD', 'HKD', 'AED', 'CAD', 'JPY', 'CNY', 'other']).default('AUD'),
  low_doc: z.boolean().default(false).describe('Self-employed without two years of lodged tax returns'),
});
type Situation = z.infer<typeof situation>;

export function toProfile(s: Situation): Profile {
  const p: Profile = {
    ...emptyProfile(),
    mode: s.applicants.length > 1 ? 'joint' : 'solo',
    applicants: s.applicants.map(a => ({
      ...newApplicant(),
      age: a.age, residency: a.residency, employment: a.employment, tenureMonths: a.months_in_role,
      baseIncome: a.annual_base_income, overtime: a.annual_overtime, allowances: a.annual_allowances, bonus: a.annual_bonus, commission: a.annual_commission,
    })),
    household: s.household ?? (s.applicants.length > 1 ? (s.dependants ? 'family' : 'couple') : s.dependants ? 'family' : 'single'),
    dependants: s.dependants,
    savings: s.savings, gift: s.gift, cardLimits: s.credit_card_limits, personalLoans: s.personal_loans, hecs: s.hecs_balance,
    purpose: s.purpose, dwelling: s.property_type, condition: s.purpose === 'construction' ? 'new' : s.new_or_existing,
    state: s.state, location: s.location, price: s.price, loan: 0,
    firstHome: s.first_home, defaults: s.credit_defaults, creditScore: s.credit_score ?? null,
    profession: s.profession ?? null, livesOverseas: s.lives_overseas, incomeCurrency: s.income_currency, lowDoc: s.low_doc,
  };
  if (s.loan !== undefined) p.loan = s.loan;
  else {
    const c = upfrontCosts(p);
    p.loan = Math.max(0, s.price - Math.max(0, s.savings + s.gift + c.fhog - c.total));
  }
  return p;
}

const money = (n: number) => `$${Math.round(n).toLocaleString('en-AU')}`;
const text = (t: string) => ({ type: 'text' as const, text: t });

export function readinessReport(p: Profile, site = 'core') {
  const a = assess(p);
  const s = summarise(p, a);
  const duty = stampDuty(p);
  const scheme = depositScheme(p);
  const fixes = fixActions(p, a).slice(0, 3);
  const top = a.results.slice(0, 8).map(r => ({
    lender: r.lender.name,
    type: r.lender.kind,
    status: r.status === 'ready' ? 'fits published rules' : r.status === 'close' ? 'close' : 'not yet',
    policy_fit: `${r.score}%`,
    rate: `${r.rate.toFixed(2)}%`,
    lmi_waived: r.lmiWaived,
    reasons: r.checks.filter(c => c.status !== 'pass').map(c => c.detail),
  }));
  const reportUrl = `${(SITE_CATALOG[site] ?? SITE_CATALOG.core).url}/#/report?profile=${encodeProfile(p)}`;
  const structured = {
    lenders_checked: a.results.length,
    fits: a.ready,
    close: a.close,
    not_yet: a.notYet,
    lvr: s.lvr,
    loan: Math.round(p.loan),
    borrowing_power_typical: s.borrowingPower,
    borrowing_power_best: Math.round(a.borrowingPower.best),
    stamp_duty: s.stampDuty,
    stamp_duty_concession: duty.concession,
    first_home_owner_grant: duty.fhog,
    five_percent_deposit_scheme_eligible: scheme.eligible,
    lmi_waived_at: a.results.filter(r => r.lmiWaived).length,
    top_lenders: top,
    fastest_wins: fixes.map(f => ({ change: f.title, detail: f.detail, lenders_unlocked: f.unlocks, borrowing_power_gain: Math.round(f.powerGain) })),
    full_report_url: reportUrl,
    data_as_of: DATA_DATE,
    notice: NOTICE,
    broker_referral: `Available on request with the user's explicit consent (tool refer_to_broker). ${BROKER_DISCLOSURE}`,
  };
  const summary = [
    `Fits the published rules of ${a.ready} of ${a.results.length} lenders; ${a.close} more are close.`,
    `Loan ${money(p.loan)} on ${money(p.price)} (LVR ${s.lvr}%). Typical borrowing power ${money(s.borrowingPower)}.`,
    `Stamp duty ${money(duty.duty)}${duty.concession ? ` (${duty.concession})` : ''}${duty.fhog ? `; First Home Owner Grant ${money(duty.fhog)}` : ''}. 5% Deposit Scheme: ${scheme.eligible ? 'looks eligible' : 'not eligible'}.`,
    fixes.length ? `Fastest wins: ${fixes.map(f => f.title).join('; ')}.` : '',
    `Full interactive report: ${reportUrl}`,
    NOTICE,
  ].filter(Boolean).join('\n');
  return { content: [text(summary)], structuredContent: structured };
}

export function buildServer(deps: McpDeps): McpServer {
  const server = new McpServer(
    { name: 'keyready', version: '1.0.0' },
    {
      instructions:
        'KeyReady checks an Australian home buyer’s situation against ~90 lenders’ published rules (live Open Banking rates, LVR limits, residency rules), APRA’s 3% serviceability buffer, 2026–27 stamp duty and grants, and the 5% Deposit Scheme. ' +
        'Ask for the details you need conversationally, use ballpark figures, and never invent numbers. Present results as indicative general information, not advice or a recommendation, and keep lender names masked. ' +
        `Only call refer_to_broker after the user has seen this disclosure and explicitly agreed: ${BROKER_DISCLOSURE}`,
    },
  );
  const ro = { readOnlyHint: true, openWorldHint: false, idempotentHint: true } as const;

  server.registerTool('assess_home_loan_readiness', {
    title: 'Assess home loan readiness',
    description: 'Check a borrower’s situation against each Australian lender’s published rules. Returns how many lenders it fits, borrowing power, LVR, stamp duty, grants, 5% Deposit Scheme eligibility, profession LMI waivers, the fastest fixes and a link to the full interactive report.',
    inputSchema: situation.extend({ site: z.enum(SITE_IDS).default('core').describe('Which KeyReady site the report link should open') }),
    annotations: ro,
  }, async input => readinessReport(toProfile(input), input.site));

  server.registerTool('calculate_stamp_duty', {
    title: 'Calculate stamp duty and grants',
    description: 'Exact 2026–27 transfer (stamp) duty for any Australian state or territory, including first home buyer concessions, owner-occupier rates, the First Home Owner Grant and foreign purchaser surcharge.',
    inputSchema: z.object({
      state: z.enum(STATES),
      price: z.number().min(1000).max(50_000_000),
      first_home: z.boolean().default(false),
      owner_occupier: z.boolean().default(true),
      new_home: z.boolean().default(false).describe('Brand-new home, off the plan, or building'),
      vacant_land: z.boolean().default(false),
      house_and_land_package: z.boolean().default(false),
      foreign_buyer: z.boolean().default(false).describe('Buyer is a temporary visa holder or other foreign person'),
    }),
    annotations: ro,
  }, async i => {
    const p: Profile = {
      ...emptyProfile(),
      applicants: [{ ...newApplicant(), age: 30, residency: i.foreign_buyer ? 'temporary_visa' : 'citizen' }],
      state: i.state, price: i.price, firstHome: i.first_home, purpose: i.owner_occupier ? 'owner' : 'investment',
      condition: i.new_home ? 'new' : 'existing', dwelling: i.vacant_land ? 'land' : i.house_and_land_package ? 'house_land' : 'house',
    };
    const d = stampDuty(p);
    const out = { state: i.state, price: i.price, duty: d.duty, duty_at_general_rates: d.generalDuty, concession: d.concession, foreign_surcharge: d.foreignSurcharge, first_home_owner_grant: d.fhog, rules_year: '2026-27', source: d.source };
    return {
      content: [text(`${i.state} stamp duty on ${money(i.price)}: ${money(d.duty)}${d.concession && d.duty < d.generalDuty ? ` with the ${d.concession} (general rate ${money(d.generalDuty)})` : ''}.${d.foreignSurcharge ? ` Foreign surcharge ${money(d.foreignSurcharge)}.` : ''}${d.fhog ? ` First Home Owner Grant ${money(d.fhog)}.` : ''} 2026–27 rules; source: ${d.source}`)],
      structuredContent: out,
    };
  });

  server.registerTool('check_5_percent_deposit_scheme', {
    title: 'Check 5% Deposit Scheme eligibility',
    description: 'Check eligibility for the Australian Government 5% Deposit Scheme (First Home Guarantee) or Family Home Guarantee (single parents, 2% deposit), including the property price cap for the area.',
    inputSchema: z.object({
      state: z.enum(STATES),
      location: z.enum(['capital', 'regional']).default('capital'),
      price: z.number().min(1000),
      first_home: z.boolean(),
      single_parent: z.boolean().default(false),
      all_buyers_citizens_or_pr: z.boolean().default(true),
      will_live_in_it: z.boolean().default(true),
    }),
    annotations: ro,
  }, async i => {
    const p: Profile = {
      ...emptyProfile(),
      mode: 'solo',
      applicants: [{ ...newApplicant(), age: 30, residency: i.all_buyers_citizens_or_pr ? 'citizen' : 'temporary_visa' }],
      dependants: i.single_parent ? 1 : 0, household: i.single_parent ? 'family' : 'single',
      state: i.state, location: i.location, price: i.price, firstHome: i.first_home, purpose: i.will_live_in_it ? 'owner' : 'investment',
    };
    const s = depositScheme(p);
    return {
      content: [text(s.eligible
        ? `Looks eligible for the ${s.variant === 'family' ? 'Family Home Guarantee' : '5% Deposit Scheme'}: minimum deposit ${s.minDepositPct}%, no LMI, price cap ${money(s.cap)} in this area. Only participating lenders offer it.`
        : `Not eligible: ${s.reasons.join(' ')}`)],
      structuredContent: { eligible: s.eligible, variant: s.variant, min_deposit_pct: s.minDepositPct, price_cap: s.cap, reasons: s.reasons },
    };
  });

  server.registerTool('list_lender_rates', {
    title: 'List lender rates',
    description: `Live variable principal-and-interest home loan rates at a given LVR from lenders’ Open Banking product data (as of ${DATA_DATE}). Lender names are masked.`,
    inputSchema: z.object({
      lvr: z.number().min(1).max(98).default(80).describe('Loan-to-value ratio, %'),
      purpose: z.enum(['owner', 'investment']).default('owner'),
      limit: z.number().int().min(1).max(25).default(10),
    }),
    annotations: ro,
  }, async i => {
    const rows = MARKET_LENDERS.filter(L => L.source !== 'illustrative' && (i.purpose === 'investment' ? L.maxLvr.investment : L.maxLvr.owner) >= i.lvr)
      .map(L => ({ lender: L.name, type: L.kind, rate: productRate(L, i.purpose, i.lvr) }))
      .sort((a, b) => a.rate - b.rate)
      .slice(0, i.limit);
    return {
      content: [text(rows.map(r => `${r.lender} (${r.type}): ${r.rate.toFixed(2)}%`).join('\n') + `\nVariable P&I, ${i.purpose}, LVR ≤ ${i.lvr}%. Open Banking data as of ${DATA_DATE}.`)],
      structuredContent: { lvr: i.lvr, purpose: i.purpose, data_as_of: DATA_DATE, lenders: rows },
    };
  });

  server.registerTool('refer_to_broker', {
    title: 'Refer to a mortgage broker (with consent)',
    description:
      `Send the user’s situation and readiness report to ${BROKER.name}, a licensed mortgage broker, who will contact them. ` +
      'ONLY call this after you have shown the user this disclosure and they have explicitly agreed in this conversation: ' + BROKER_DISCLOSURE +
      ' Collect their name, email and phone. Never call it on the user’s behalf without that agreement.',
    inputSchema: situation.extend({
      name: z.string().min(1).max(120),
      email: z.email().max(200),
      phone: z.string().min(8).max(40),
      preferred_time: z.enum(['Morning', 'Afternoon', 'Evening', 'Anytime']).default('Anytime'),
      consent: z.literal(true).describe('True only if the user explicitly agreed to the disclosure in this conversation'),
      site: z.enum(SITE_IDS).default('core'),
    }),
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: true },
  }, async i => {
    if (((await deps.recentLeadCount?.(i.email)) ?? 0) >= 3)
      return { content: [text('This email address has already been referred several times today. The broker will be in touch.')], isError: true };
    const profile = toProfile(i);
    const site = SITE_CATALOG[i.site] ?? SITE_CATALOG.core;
    const { id } = await deps.insertLead({
      name: i.name, email: i.email, phone: i.phone, preferred_time: i.preferred_time, consent: true,
      profile, summary: summarise(profile, assess(profile)), site: i.site, segment: site.segment, channel: 'mcp', attribution: { utm_source: 'mcp' },
    });
    return {
      content: [text(`Done — ${BROKER.name} has the report and will contact ${i.name} (${i.preferred_time.toLowerCase()}). Reference ${id.slice(0, 8)}. ${BROKER_DISCLOSURE}`)],
      structuredContent: { referred: true, reference: id, broker: BROKER.name },
    };
  });

  return server;
}

/** Web-standard handler: `handler.fetch(request)` → Response (Deno, Workers, Node 22). */
export function createKeyReadyMcp(deps: McpDeps) {
  return createMcpHandler(() => buildServer(deps));
}
