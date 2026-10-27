import type { AuState, Profile } from './types';

/**
 * Transfer (stamp) duty, first home buyer concessions and First Home Owner Grants for every
 * state and territory, 2026–27. Figures come from the official revenue offices or legislation
 * listed in SOURCES and are unit-tested against their published worked examples.
 */

interface Bracket {
  from: number;
  base: number;
  /** Dollars per $100 of value above `from`. */
  per100: number;
}

/** Marginal schedule. `orPart` rounds the excess up to the next $100 ("per $100 or part"). */
function schedule(v: number, brackets: Bracket[], orPart = false): number {
  const b = [...brackets].reverse().find(x => v > x.from) ?? brackets[0];
  let excess = Math.max(0, v - b.from);
  if (orPart) excess = Math.ceil(excess / 100) * 100;
  return b.base + (excess * b.per100) / 100;
}

const cents = (n: number) => Math.round(n * 100) / 100;

// ── NSW ──────────────────────────────────────────────────────────────────────
const NSW: Bracket[] = [
  { from: 0, base: 0, per100: 1.25 },
  { from: 18_000, base: 225, per100: 1.5 },
  { from: 38_000, base: 525, per100: 1.75 },
  { from: 103_000, base: 1_662, per100: 3.5 },
  { from: 387_000, base: 11_602, per100: 4.5 },
  { from: 1_290_000, base: 52_237, per100: 5.5 },
  { from: 3_870_000, base: 194_137, per100: 7 }, // premium residential
];
// The excess rounds up to the next $100: Revenue NSW calculator gives $14,441.50 for $450,050
// and $52,242.50 for $1,290,050 (retrieved 2026-10-27).
const nswGeneral = (v: number) => Math.max(20, schedule(v, NSW, true));

/** First Home Buyers Assistance Scheme: N(V) − ((U − V)/(U − E)) × N(E). */
function nswFirstHome(v: number, land: boolean) {
  const [E, U] = land ? [350_000, 450_000] : [800_000, 1_000_000];
  if (v <= E) return 0;
  if (v >= U) return nswGeneral(v);
  return cents(nswGeneral(v) - ((U - v) / (U - E)) * nswGeneral(E));
}

// ── VIC ──────────────────────────────────────────────────────────────────────
function vicGeneral(v: number) {
  if (v > 2_000_000) return Math.round(110_000 + (v - 2_000_000) * 0.065);
  if (v > 960_000) return Math.round(v * 0.055); // flat rate on the whole value
  return Math.round(schedule(v, [
    { from: 0, base: 0, per100: 1.4 },
    { from: 25_000, base: 350, per100: 2.4 },
    { from: 130_000, base: 2_870, per100: 6 },
  ]));
}
/** Principal place of residence concession, dutiable value up to $550,000. */
const vicPpr = (v: number) => Math.round(schedule(v, [
  { from: 0, base: 0, per100: 1.4 },
  { from: 25_000, base: 350, per100: 2.4 },
  { from: 130_000, base: 2_870, per100: 5 },
  { from: 440_000, base: 18_370, per100: 6 },
]));
function vicFirstHome(v: number) {
  if (v <= 600_000) return 0;
  if (v <= 750_000) return Math.floor((vicGeneral(v) * (v - 600_000)) / 150_000);
  return vicGeneral(v);
}

// ── QLD ──────────────────────────────────────────────────────────────────────
const qldGeneral = (v: number) => (v <= 5_000 ? 0 : schedule(v, [
  { from: 5_000, base: 0, per100: 1.5 },
  { from: 75_000, base: 1_050, per100: 3.5 },
  { from: 540_000, base: 17_325, per100: 4.5 },
  { from: 1_000_000, base: 38_025, per100: 5.75 },
], true));
const qldHome = (v: number) => schedule(v, [
  { from: 0, base: 0, per100: 1 },
  { from: 350_000, base: 3_500, per100: 3.5 },
  { from: 540_000, base: 10_150, per100: 4.5 },
  { from: 1_000_000, base: 30_850, per100: 5.75 },
], true);
/** First home concession (established): home concession duty less a stepped deduction. */
function qldFirstHome(v: number) {
  const deduct = v < 710_000 ? 17_350 : v >= 800_000 ? 0 : 15_615 - Math.floor((v - 710_000) / 10_000) * 1_735;
  return Math.max(0, qldHome(v) - deduct);
}

// ── WA ───────────────────────────────────────────────────────────────────────
const waGeneral = (v: number) => schedule(v, [
  { from: 0, base: 0, per100: 1.9 },
  { from: 120_000, base: 2_280, per100: 2.85 },
  { from: 150_000, base: 3_135, per100: 3.8 },
  { from: 360_000, base: 11_115, per100: 4.75 },
  { from: 725_000, base: 28_453, per100: 5.15 },
], true);
const waPpr = (v: number) => schedule(v, [
  { from: 0, base: 0, per100: 1.5 },
  { from: 120_000, base: 1_800, per100: 4.04 },
], true);
/** First home owner rate, agreements from 7 May 2026 (no metro/regional split). */
function waFirstHome(v: number, land: boolean) {
  const [nil, upper, per100] = land ? [450_000, 550_000, 20.14] : [600_000, 800_000, 16.15];
  if (v <= nil) return 0;
  if (v <= upper) return (Math.ceil((v - nil) / 100) * 100 * per100) / 100;
  return waGeneral(v);
}

// ── SA ───────────────────────────────────────────────────────────────────────
const saGeneral = (v: number) => schedule(v, [
  { from: 0, base: 0, per100: 1 },
  { from: 12_000, base: 120, per100: 2 },
  { from: 30_000, base: 480, per100: 3 },
  { from: 50_000, base: 1_080, per100: 3.5 },
  { from: 100_000, base: 2_830, per100: 4 },
  { from: 200_000, base: 6_830, per100: 4.25 },
  { from: 250_000, base: 8_955, per100: 4.75 },
  { from: 300_000, base: 11_330, per100: 5 },
  { from: 500_000, base: 21_330, per100: 5.5 },
], true);

// ── TAS ──────────────────────────────────────────────────────────────────────
const tasGeneral = (v: number) => (v <= 3_000 ? 50 : schedule(v, [
  { from: 3_000, base: 50, per100: 1.75 },
  { from: 25_000, base: 435, per100: 2.25 },
  { from: 75_000, base: 1_560, per100: 3.5 },
  { from: 200_000, base: 5_935, per100: 4 },
  { from: 375_000, base: 12_935, per100: 4.25 },
  { from: 725_000, base: 27_810, per100: 4.5 },
], true));

// ── ACT ──────────────────────────────────────────────────────────────────────
function actDuty(v: number, ownerOccupier: boolean) {
  if (v > 1_455_000) return cents(v * 0.0454); // flat rate on the whole value
  const firstTop = ownerOccupier ? 260_000 : 200_000;
  if (v <= firstTop) return cents((Math.ceil(v / 100) * (ownerOccupier ? 0.28 : 1.2)));
  return schedule(v, ownerOccupier
    ? [
        { from: 260_000, base: 728, per100: 2.2 },
        { from: 300_000, base: 1_608, per100: 3.4 },
        { from: 500_000, base: 8_408, per100: 4.32 },
        { from: 750_000, base: 19_208, per100: 5.9 },
        { from: 1_000_000, base: 33_958, per100: 6.4 },
      ]
    : [
        { from: 200_000, base: 2_400, per100: 2.2 },
        { from: 300_000, base: 4_600, per100: 3.4 },
        { from: 500_000, base: 11_400, per100: 4.32 },
        { from: 750_000, base: 22_200, per100: 5.9 },
        { from: 1_000_000, base: 36_950, per100: 6.4 },
      ], true);
}

// ── NT ───────────────────────────────────────────────────────────────────────
/** Rounded down to the nearest 5 cents, as the Territory Revenue Office calculator does
 *  ($300,000 → $10,414.25; $525,050 → $25,989.95; retrieved 2026-10-27). */
const down5c = (n: number) => Math.floor(n * 20 + 1e-9) / 20;
function ntGeneral(v: number) {
  if (v <= 525_000) {
    const V = v / 1000;
    return down5c(0.06571441 * V * V + 15 * V);
  }
  return down5c(v * (v < 3_000_000 ? 0.0495 : v < 5_000_000 ? 0.0575 : 0.0595));
}

// ── Grants & surcharges ─────────────────────────────────────────────────────
/** First Home Owner Grant (new homes only) for 2026–27: amount and price cap (null = no cap). */
const FHOG: Record<AuState, { amount: number; cap: number | null; buildCap?: number }> = {
  NSW: { amount: 10_000, cap: 600_000, buildCap: 750_000 },
  VIC: { amount: 10_000, cap: 750_000 },
  QLD: { amount: 30_000, cap: 749_999 },
  WA: { amount: 10_000, cap: 800_000 }, // $1m north of the 26th parallel
  SA: { amount: 15_000, cap: null },
  TAS: { amount: 20_000, cap: null },
  ACT: { amount: 0, cap: null },
  NT: { amount: 50_000, cap: null }, // HomeGrown Territory Grant
};

const FOREIGN_SURCHARGE: Record<AuState, number> = { NSW: 0.09, VIC: 0.08, QLD: 0.08, WA: 0.07, SA: 0.07, TAS: 0.08, ACT: 0, NT: 0 };

export const SOURCES: Record<AuState, string> = {
  NSW: 'https://www.revenue.nsw.gov.au/_resources/duties-links/current-thresholds-and-rates',
  VIC: 'https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty',
  QLD: 'https://qro.qld.gov.au/duties/transfer-duty/calculate/rates/',
  WA: 'https://www.wa.gov.au/organisation/department-of-finance/transfer-duty-assessment',
  SA: 'https://www.revenuesa.sa.gov.au/stamp-duty-land/rate-of-stamp-duty',
  TAS: 'https://www.sro.tas.gov.au/property-transfer-duties/rates-of-duty',
  ACT: 'https://www.legislation.act.gov.au/di/2026-155/',
  NT: 'https://legislation.nt.gov.au/Legislation/STAMP-DUTY-ACT-1978',
};

export interface DutyResult {
  /** Duty payable after any concession, before the foreign surcharge. */
  duty: number;
  /** Duty at general (non-concessional) rates, for comparison. */
  generalDuty: number;
  concession: string | null;
  foreignSurcharge: number;
  fhog: number;
  source: string;
}

const isNewHome = (p: Profile) => p.condition === 'new' || p.purpose === 'construction' || p.dwelling === 'house_land';

export function stampDuty(p: Profile): DutyResult {
  const v = Math.max(0, p.price);
  const owner = p.purpose !== 'investment';
  const land = p.dwelling === 'land';
  const residents = p.applicants.every(a => ['citizen', 'permanent_resident'].includes(a.residency));
  // VIC and SA need only one applicant to be a citizen, PR or NZ citizen (SA: Special Category
  // visa); SA source: revenuesa.sa.gov.au/stamp-duty-land/first-home-buyer-relief, retrieved 2026-10-27.
  const fhb = p.firstHome && owner && (residents || (['VIC', 'SA'].includes(p.state) && p.applicants.some(a => ['citizen', 'permanent_resident', 'nz_citizen'].includes(a.residency))));
  const newHome = isNewHome(p);

  let general: number;
  let duty: number;
  let concession: string | null = null;
  const use = (d: number, label: string) => {
    if (d < duty) {
      duty = d;
      concession = label;
    }
  };

  switch (p.state) {
    case 'NSW':
      general = duty = nswGeneral(v);
      if (fhb) use(nswFirstHome(v, land), 'First Home Buyers Assistance Scheme');
      break;
    case 'VIC':
      general = duty = vicGeneral(v);
      if (owner && v <= 550_000) use(vicPpr(v), 'Principal place of residence concession');
      if (fhb) use(vicFirstHome(v), 'First home buyer duty exemption/concession');
      break;
    case 'QLD':
      general = duty = qldGeneral(v);
      if (owner && residents) use(qldHome(v), 'Home concession');
      if (fhb) use(newHome || land ? 0 : qldFirstHome(v), newHome ? 'First home (new home) concession' : land ? 'First home vacant land concession' : 'First home concession');
      break;
    case 'WA':
      general = duty = waGeneral(v);
      if (owner && v <= 200_000) use(waPpr(v), 'Concessional rate (home ≤ $200k)');
      if (fhb) use(waFirstHome(v, land), 'First home owner rate');
      break;
    case 'SA':
      general = duty = saGeneral(v);
      if (fhb && (newHome || land)) use(0, 'First home buyer relief (new home or land)');
      break;
    case 'TAS':
      general = duty = tasGeneral(v);
      break;
    case 'ACT':
      general = actDuty(v, false);
      duty = actDuty(v, owner);
      if (owner) concession = 'Owner-occupier rates';
      if (fhb) use(0, 'Home Buyer Concession Scheme');
      break;
    case 'NT':
      general = duty = ntGeneral(v);
      if (owner && residents && p.dwelling === 'house_land') use(0, 'House and land package exemption');
      break;
  }

  const foreignShare = p.applicants.filter(a => ['temporary_visa', 'awaiting_pr', 'other'].includes(a.residency)).length / p.applicants.length;
  const g = FHOG[p.state];
  const cap = p.purpose === 'construction' || p.dwelling === 'house_land' ? (g.buildCap ?? g.cap) : g.cap;
  const fhog = p.firstHome && owner && residents && newHome && (cap === null || v <= cap) ? g.amount : 0;

  return {
    duty: cents(duty!),
    generalDuty: cents(general!),
    concession,
    foreignSurcharge: cents(v * FOREIGN_SURCHARGE[p.state] * foreignShare),
    fhog,
    source: SOURCES[p.state],
  };
}
