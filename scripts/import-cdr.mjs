#!/usr/bin/env node
/**
 * Imports live home-loan product data from Australia's Consumer Data Right (Open Banking)
 * Product Reference Data APIs — public, unauthenticated endpoints every bank must publish.
 *
 *   node scripts/import-cdr.mjs [out=src/data/market.json]
 *
 * Behind an HTTP proxy on Node 22, run with NODE_USE_ENV_PROXY=1.
 * Spec: https://consumerdatastandardsaustralia.github.io/standards/#get-products
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const OUT = process.argv[2] ?? 'src/data/market.json';
const REGISTER = 'https://api.cdr.gov.au/cdr-register/v1/banking/data-holders/brands/summary';
const BANDS = [60, 70, 80, 85, 90, 95];
const CONCURRENCY = 8;

const SKIP_BRAND = /commbiz|business\+|wholesale|credit cards|paypal|wise|revolut|tyro|thriday|judo|mycard|solo by myob|heartland/i;
const MAJOR = /^(anz|commbank|national australia bank|westpac)$/i;
const ONLINE = /ubank|unloan|^ing |^up$|tiimely|alex\.bank|me go|amp bank go|anz plus|qantas money|aussie elevate/i;
const SPECIALIST = /liberty|boq specialist|bank of china|bank of sydney|arab bank|rabobank/i;
const CUSTOMER_OWNED = /credit union|mutual|\bcul\b|\bcu\b|bank australia|beyond bank|great southern|greater bank|newcastle permanent|imb bank|police|teachers|hume bank|regional australia|heritage|p&n|queensland country|qbank|qudos|defence bank|military bank|bankvic|unity bank|summerland|horizon bank|coastline|border bank|broken hill|cairns bank|central murray|darling downs|gateway bank|geelong bank|first option|health professionals|firefighters|movebank|swsbank|capricornian|the mac|tmcu|unibank|bankwaw|gmcu|bank of us|bank first|dnister|bcu bank|racq|woolworths team|rsl money|commfcu|southern cross|traditional credit|laboratories/i;

function kindOf(name) {
  if (MAJOR.test(name)) return 'Major bank';
  if (ONLINE.test(name)) return 'Online lender';
  if (SPECIALIST.test(name)) return 'Specialist';
  if (CUSTOMER_OWNED.test(name)) return 'Customer-owned';
  return 'Other bank';
}

/** Versions that worked per host+endpoint: hosts often reject versions they don't serve instead of negotiating. */
const versionCache = new Map();

async function fetchJson(url, v) {
  for (let i = 0; i < 2; i++) {
    try {
      const res = await fetch(url, { headers: { 'x-v': String(v), 'x-min-v': '1', accept: 'application/json' }, signal: AbortSignal.timeout(20_000) });
      if (res.ok) return { ok: true, body: await res.json() };
      if (res.status < 500) return { ok: false, status: res.status, text: await res.text() };
    } catch {
      /* retry */
    }
  }
  return { ok: false, status: 0, text: '' };
}

async function get(url) {
  const key = url.replace(/\/products\/[^/?]+/, '/products/:id').replace(/\?.*/, '');
  const cached = versionCache.get(key);
  const order = cached ? [cached] : [6, 7, 8, 5, 4, 3, 2, 1];
  for (const v of order) {
    const r = await fetchJson(url, v);
    if (r.ok) {
      versionCache.set(key, v);
      return r.body;
    }
    const hint = r.text?.match(/available:?\s*(\d+)/i);
    if (hint && Number(hint[1]) !== v) {
      const h = await fetchJson(url, Number(hint[1]));
      if (h.ok) {
        versionCache.set(key, Number(hint[1]));
        return h.body;
      }
    }
    if (r.status !== 406 && r.status !== 400) return null;
  }
  return null;
}

async function pool(items, fn) {
  const out = [];
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  }));
  return out;
}

const num = v => (v === undefined || v === null || v === '' ? null : Number(v));
/** LVR tiers arrive as fractions (0.8) or percentages (80). */
const pctOf = v => (v === null || Number.isNaN(v) ? null : v <= 1.5 ? +(v * 100).toFixed(2) : v);

function lvrRange(rate) {
  const t = (rate.tiers ?? []).find(t => /lvr|loan.?to.?value/i.test(`${t.name} ${t.rateApplicationMethod ?? ''}`) || t.unitOfMeasure === 'PERCENT');
  if (!t) return null;
  return [pctOf(num(t.minimumValue)) ?? 0, pctOf(num(t.maximumValue)) ?? 100];
}

function maxLvrFromText(product) {
  const texts = [...(product.eligibility ?? []), ...(product.constraints ?? [])]
    .map(e => `${e.additionalInfo ?? ''} ${e.additionalValue ?? ''} ${e.constraintType ?? ''}`);
  for (const c of product.constraints ?? []) if (/MAX_LVR/.test(c.constraintType ?? '')) return pctOf(num(c.additionalValue));
  for (const t of texts) {
    const m = t.match(/(?:loan[- ]to[- ]value ratio|lvr)[^%\d]{0,40}(\d{2}(?:\.\d+)?)\s*%/i);
    if (m && /no more than|maximum|max|up to|less than|below|<=|≤/i.test(t)) return Number(m[1]);
  }
  return null;
}

/** Niche products whose rates shouldn't stand in for a lender's mainstream home loan. */
const NICHE = /sustainab|green|upgrade|bridging|staff|employee|reverse|construction|line of credit|equity|solar|top.?up|land loan|bare land|smsf|commercial|business/i;

const sameRange = (a, b) => (!a && !b) || (a && b && Math.abs(a[0] - b[0]) < 0.5 && Math.abs(a[1] - b[1]) < 0.5);

/** Map free-text residency eligibility onto the app's residency categories. */
function normaliseResidency(values) {
  const t = values.join(' ');
  return {
    citizen: true,
    permanent_resident: /PERMANENT|RESIDENT|\bPR\b/.test(t),
    nz_citizen: /NEW_ZEALAND|\bNZ\b/.test(t),
    temporary_visa: /TEMPORARY|VISA|NON_RESIDENT|FOREIGN/.test(t),
  };
}

function summariseProduct(p) {
  const purposeFromName = /invest/i.test(p.name) ? 'INVESTMENT' : null;
  const statedMax = maxLvrFromText(p);
  const all = (p.lendingRates ?? [])
    .filter(r => !r.repaymentType || r.repaymentType === 'PRINCIPAL_AND_INTEREST')
    .map(r => ({ type: r.lendingRateType, rate: Number(r.rate), comparison: num(r.comparisonRate), purpose: r.loanPurpose ?? purposeFromName ?? 'OWNER_OCCUPIED', lvr: lvrRange(r) }));
  const rates = [];
  for (const r of all.filter(x => x.type === 'VARIABLE')) {
    // Some banks publish a standard rate plus a separate DISCOUNT for the same LVR band.
    const discounts = all.filter(d => d.type === 'DISCOUNT' && d.purpose === r.purpose && sameRange(d.lvr, r.lvr) && d.rate < 0.05);
    const best = discounts.reduce((a, d) => (!a || d.rate > a.rate ? d : a), null);
    const rate = (r.rate - (best?.rate ?? 0)) * 100;
    // Outside this range is almost always a niche product or a data error.
    if (!(rate > 4.5 && rate < 12)) continue;
    // A discounted rate needs the discount's own comparison rate: the standard rate's would overstate it.
    // Banks fill this field inconsistently, so keep it only when it sits at or a little above the rate.
    const c = (best ? best.comparison : r.comparison) * 100;
    const comparison = c >= rate - 0.005 && c < rate + 1.5 ? +c.toFixed(3) : null;
    rates.push({ purpose: r.purpose, rate: +rate.toFixed(3), comparison, lvr: r.lvr });
  }
  const residency = (p.eligibility ?? []).filter(e => e.eligibilityType === 'RESIDENCY_STATUS')
    .map(e => String(e.additionalValue ?? e.additionalInfo ?? '').toUpperCase().replace(/\s+/g, '_'));
  const minAge = num((p.eligibility ?? []).find(e => e.eligibilityType === 'MIN_AGE')?.additionalValue);
  return { id: p.productId, name: p.name, statedMax, rates, residency: residency.length ? residency : null, minAge };
}

/** Best variable P&I rate available at each LVR band (with its comparison rate), and the highest LVR any product offers. */
function bandRates(products, purpose) {
  const rs = products.flatMap(p => p.rates.filter(r => r.purpose === purpose).map(r => ({ ...r, statedMax: p.statedMax })));
  if (!rs.length) return { tiers: [], maxLvr: null };
  const tierMax = Math.max(0, ...rs.map(r => r.lvr?.[1] ?? 0), ...products.map(p => p.statedMax ?? 0));
  // Tiers are often written as "above 80% up to 100%"; no mainstream home loan goes past 95%.
  const maxLvr = tierMax > 0 ? Math.min(tierMax, 95) : null;
  const tiers = [];
  for (const b of BANDS) {
    const ok = rs.filter(r => (r.lvr ? r.lvr[0] < b && b <= r.lvr[1] + 0.01 : b <= (r.statedMax ?? maxLvr ?? 95)));
    if (!ok.length) continue;
    const top = ok.reduce((a, r) => (r.rate < a.rate || (r.rate === a.rate && !a.comparison && r.comparison) ? r : a));
    tiers.push({ maxLvr: b, rate: top.rate, ...(top.comparison ? { comparison: top.comparison } : {}) });
  }
  return { tiers, maxLvr };
}

async function main() {
  const reg = await get(REGISTER);
  if (!reg) throw new Error('CDR register unreachable');
  const brands = reg.data.filter(b => !SKIP_BRAND.test(b.brandName));
  console.error(`Register: ${reg.data.length} brands, ${brands.length} candidates`);

  const results = await pool(brands, async b => {
    const base = (b.productBaseUri ?? b.publicBaseUri ?? '').replace(/\/$/, '');
    if (!base) return null;
    let url = `${base}/cds-au/v1/banking/products?product-category=RESIDENTIAL_MORTGAGES&page-size=100`;
    const list = [];
    for (let page = 0; url && page < 10; page++) {
      const r = await get(url);
      if (!r) break;
      list.push(...(r.data?.products ?? []));
      url = r.links?.next && r.links.next !== url ? r.links.next : null;
    }
    // Some hosts serve several brands; keep this brand's products where they're labelled.
    const own = list.filter(p => !p.brandName || p.brandName === b.brandName || list.every(q => q.brandName === list[0].brandName));
    if (!own.length) return null;
    const details = [];
    for (const p of own.filter(p => !NICHE.test(p.name)).slice(0, 40)) {
      const d = await get(`${base}/cds-au/v1/banking/products/${encodeURIComponent(p.productId)}`);
      if (d?.data) details.push(summariseProduct(d.data));
    }
    const owner = bandRates(details, 'OWNER_OCCUPIED');
    const invest = bandRates(details, 'INVESTMENT');
    if (!owner.tiers.length && !invest.tiers.length) return null;
    const unrestricted = details.some(d => !d.residency);
    console.error(`  ✓ ${b.brandName}: ${details.length} products`);
    return {
      brand: b.brandName,
      kind: kindOf(b.brandName),
      products: details.length,
      owner,
      investment: invest,
      residency: unrestricted ? null : normaliseResidency(details.flatMap(d => d.residency ?? [])),
      minAge: Math.min(...details.map(d => d.minAge ?? 18)),
      source: base,
    };
  });

  const lenders = results.filter(Boolean).sort((a, b) => a.brand.localeCompare(b.brand));
  const out = { fetchedAt: new Date().toISOString(), source: REGISTER, lenders };
  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(out, null, 1) + '\n');
  console.error(`Wrote ${lenders.length} lenders to ${OUT}`);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
