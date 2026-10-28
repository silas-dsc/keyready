import {
  applicantGross, debtToIncome, deposit, depositScheme, fmtMoney, hecsRepayment, incomeTax,
  livingExpensesMonthly, lmiEstimate, lvr, principalFor, repayment, totalGross, upfrontCosts,
} from './finance';
import { comparisonRate, MARKET_LENDERS, productRate } from './market';
import { PROFESSION_NAME, usesAltDoc } from './segment-labels';
import { altDocFor, expatPolicyFor, foreignIncomeTier, lmiWaiverFor, shadingFor } from './segments';
import type { Check, Employment, LenderPolicy, LenderResult, MatchStatus, Profile, Residency } from './types';

export const EMPLOYMENT_LABEL: Record<Employment, string> = {
  full_time: 'full-time', part_time: 'part-time', casual: 'casual', contractor: 'contract',
  self_employed: 'self-employed', not_working: 'no current', retired: 'retirement',
};

export const RESIDENCY_LABEL: Record<Residency, string> = {
  citizen: 'Australian citizens', permanent_resident: 'permanent residents', nz_citizen: 'NZ citizens',
  awaiting_pr: 'applicants awaiting PR', temporary_visa: 'temporary visa holders', other: 'this visa type',
};

const pct = (n: number) => `${Math.round(n * 10) / 10}%`;

export interface Serviceability {
  netMonthly: number;
  expenses: number;
  commitments: number;
  surplus: number;
  assessmentRate: number;
  termYears: number;
  byService: number;
  byDti: number;
}

/** Who actually earns: a non-working co-borrower with no income does not need to pass employment checks. */
function earners(p: Profile) {
  return p.applicants.filter(a => !(a.employment === 'not_working' && applicantGross(a) === 0) || p.applicants.length === 1);
}

export function serviceability(p: Profile, L: LenderPolicy): Serviceability {
  let netAnnual = 0;
  p.applicants.forEach((a, i) => {
    // Profession rules (e.g. hospital nurses' overtime at 100%) apply to the main borrower.
    const s = i === 0 ? shadingFor(p, L) : L.shading;
    let g = a.baseIncome + a.overtime * s.overtime + a.allowances * s.allowances +
      a.bonus * s.bonus + a.commission * s.commission;
    // Foreign-currency income is haircut (currency risk); lenders that don't publish a rate get 80%.
    if (i === 0 && p.incomeCurrency !== 'AUD') g *= foreignIncomeTier(p, L)?.shading ?? 0.8;
    if (i === 0) g += p.rentalIncome * L.shading.rental;
    netAnnual += g - incomeTax(g);
  });
  netAnnual += p.ftb + p.childSupport;
  const netMonthly = netAnnual / 12;
  const gross = totalGross(p);
  const expenses = livingExpensesMonthly(p.household, p.dependants, gross, p.mode === 'joint');
  const hecsIncome = p.applicants[0] ? applicantGross(p.applicants[0]) : 0;
  const commitments = p.cardLimits * L.cardFactor + p.personalLoans * 0.025 + hecsRepayment(hecsIncome, p.hecs) / 12;
  const surplus = netMonthly - expenses - commitments;
  const rate = productRate(L, p.purpose, lvr(p)) + (usesAltDoc(p, L) ? altDocFor(L)?.rateLoading ?? 0 : 0);
  const assessmentRate = Math.max(rate + L.buffer, L.floorRate);
  const oldest = Math.max(...p.applicants.map(a => a.age || 30));
  const termYears = Math.max(5, Math.min(30, L.maxAgeAtTermEnd - oldest));
  const byService = Math.max(0, principalFor(surplus, assessmentRate, termYears));
  const byDti = Math.max(0, L.maxDti * gross - (p.personalLoans + p.cardLimits + p.hecs));
  return { netMonthly, expenses, commitments, surplus, assessmentRate, termYears, byService, byDti };
}

export function evaluate(p: Profile, L: LenderPolicy): LenderResult {
  const checks: Check[] = [];
  const add = (c: Check) => checks.push(c);
  const theLvr = lvr(p);
  const scheme = depositScheme(p);
  const sv = serviceability(p, L);

  // Residency
  const resCaps = p.applicants.map(a => L.residency[a.residency]);
  const badRes = p.applicants.find(a => L.residency[a.residency] === null);
  if (badRes) {
    add({ id: 'residency', label: 'Residency', status: 'fail', gap: 'far', weight: 3,
      detail: `Doesn't lend to ${RESIDENCY_LABEL[badRes.residency]}.` });
  } else {
    add({ id: 'residency', label: 'Residency', status: 'pass', weight: 3, detail: 'Your residency status is accepted.' });
  }

  // Employment & tenure
  const workers = earners(p);
  let empFail: Check | null = null;
  const altDoc = altDocFor(L);
  let altDocUsed = false;
  for (const a of workers) {
    // Self-employed without two years of tax returns, or not yet at the full-doc minimum: alt-doc path.
    if (a.employment === 'self_employed' && (p.lowDoc || a.tenureMonths < (L.minTenure.self_employed ?? Infinity))) {
      if (altDoc && a.tenureMonths >= (altDoc.minAbnMonths ?? 0)) {
        altDocUsed = true;
        continue;
      }
      if (p.lowDoc) {
        empFail = { id: 'employment', label: 'Documents', status: 'fail', gap: 'far', weight: 3,
          detail: altDoc
            ? `Its alt-doc (low-doc) loan needs ${altDoc.minAbnMonths ?? 'a minimum period of'}+ months of ABN registration.`
            : 'Lends to the self-employed on full documents (two years of tax returns) only.' };
        break;
      }
    }
    const min = L.minTenure[a.employment];
    if (min === null) {
      empFail = { id: 'employment', label: 'Employment', status: 'fail', gap: 'far', weight: 3,
        detail: `Doesn't accept ${EMPLOYMENT_LABEL[a.employment]} income as the main income.` };
      break;
    }
    if (a.tenureMonths < min) {
      const wait = min - a.tenureMonths;
      const unit = a.employment === 'self_employed' ? 'trading on your ABN' : 'in your role';
      empFail = { id: 'employment', label: 'Time in role', status: 'fail', gap: wait <= 6 ? 'close' : 'far', weight: 3,
        detail: `${a.tenureMonths} months ${unit} is below the ${min}-month minimum — you’d meet this rule in about ${wait} month${wait === 1 ? '' : 's'}.` };
      break;
    }
  }
  add(empFail ?? (altDocUsed
    ? { id: 'employment', label: 'Documents', status: 'pass', weight: 3,
        detail: `May qualify for its alt-doc (low-doc) loan: ${altDoc!.evidence ?? 'BAS, business bank statements or an accountant’s letter instead of tax returns'}.` }
    : { id: 'employment', label: 'Employment', status: 'pass', weight: 3, detail: 'Your work history meets policy.' }));

  // Living overseas / foreign income
  const expat = expatPolicyFor(L);
  const fi = foreignIncomeTier(p, L);
  const excludedAbroad = p.livesOverseas && !expat?.acceptsNonResidents;
  if (p.livesOverseas) {
    add(excludedAbroad
      ? { id: 'expat', label: 'Living overseas', status: 'fail', gap: 'far', weight: 3,
          detail: expat ? 'Doesn’t lend to borrowers who live overseas.' : 'Doesn’t publish lending to Australians living overseas.' }
      : { id: 'expat', label: 'Living overseas', status: 'pass', weight: 3, detail: 'Lends to Australians living overseas.' });
  }
  if (p.incomeCurrency !== 'AUD' && !excludedAbroad) {
    add(fi
      ? { id: 'foreign-income', label: 'Foreign income', status: 'pass', weight: 2,
          detail: `Counts about ${Math.round(fi.shading * 100)}% of ${p.incomeCurrency} income${fi.maxLvr ? `, up to ${fi.maxLvr}% LVR` : ''}.` }
      : { id: 'foreign-income', label: 'Foreign income', status: 'warn', weight: 2,
          detail: `Doesn’t publish how it treats ${p.incomeCurrency} income — we’ve assumed 80% is counted.` });
  }

  // Credit history
  if (p.defaults === 'yes' && !L.acceptsDefaults) {
    add({ id: 'credit', label: 'Credit history', status: 'fail', gap: 'far', weight: 3, detail: "Doesn't lend with a recent default on file." });
  } else if (p.bankruptcyYears !== null && p.bankruptcyYears < L.bankruptcyMinYears) {
    const gap = L.bankruptcyMinYears - p.bankruptcyYears;
    add({ id: 'credit', label: 'Credit history', status: 'fail', gap: gap <= 1 ? 'close' : 'far', weight: 3,
      detail: L.bankruptcyMinYears >= 99 ? "Doesn't lend after a bankruptcy." : `Needs ${L.bankruptcyMinYears}+ years since bankruptcy discharge.` });
  } else if (p.creditScore !== null && p.creditScore < L.minCreditScore) {
    add({ id: 'credit', label: 'Credit score', status: 'fail', gap: L.minCreditScore - p.creditScore <= 60 ? 'close' : 'far', weight: 3,
      detail: `A score of ${p.creditScore} is below the ~${L.minCreditScore} this lender looks for.` });
  } else if (p.defaults === 'unsure' || p.creditScore === null) {
    add({ id: 'credit', label: 'Credit history', status: 'warn', weight: 3,
      detail: p.defaults === 'unsure' ? 'Worth checking your credit file for defaults before applying.' : 'Your credit score will be confirmed when you apply.' });
  } else {
    add({ id: 'credit', label: 'Credit history', status: 'pass', weight: 3, detail: 'Your credit profile fits.' });
  }

  // LVR
  const policyMax = p.purpose === 'construction' ? L.maxLvr.construction
    : p.dwelling === 'land' ? L.maxLvr.land
    : p.purpose === 'investment' ? L.maxLvr.investment
    : p.dwelling === 'apartment' ? Math.min(L.maxLvr.apartment, L.maxLvr.owner)
    : L.maxLvr.owner;
  const resMax = Math.min(...resCaps.map(c => c ?? 0));
  const schemeMax = scheme.eligible && L.depositScheme ? (scheme.variant === 'family' ? 98 : 95) : 0;
  const waiver = lmiWaiverFor(p, L);
  const segmentCap = Math.min(altDocUsed ? altDoc!.maxLvr : 100, fi?.maxLvr ?? 100);
  const maxLvr = Math.min(
    Math.max(Math.min(policyMax, resMax), policyMax > 0 ? Math.max(schemeMax, waiver?.maxLvr ?? 0) : 0),
    segmentCap,
  );
  const lmiWaived = !!waiver && theLvr > 80 && theLvr <= Math.min(waiver.maxLvr, maxLvr);
  const usesScheme = !lmiWaived && theLvr > 80 && schemeMax > 0 && theLvr <= Math.min(schemeMax, maxLvr);
  if (policyMax === 0) {
    add({ id: 'lvr', label: 'Loan type', status: 'fail', gap: 'far', weight: 3,
      detail: `Doesn't offer ${p.purpose === 'construction' ? 'construction' : 'vacant land'} loans.` });
  } else if (theLvr > maxLvr) {
    const extra = p.loan - (maxLvr / 100) * p.price;
    add({ id: 'lvr', label: 'Loan-to-value', status: 'fail', gap: theLvr - maxLvr <= 5 ? 'close' : 'far', weight: 3,
      detail: `An LVR of ${pct(theLvr)} is above the ${maxLvr}% maximum — about ${fmtMoney(extra)} more deposit closes the gap.` });
  } else {
    add({ id: 'lvr', label: 'Loan-to-value', status: 'pass', weight: 3,
      detail: usesScheme ? `${pct(theLvr)} LVR works through the 5% Deposit Scheme.` : `${pct(theLvr)} LVR is within the ${maxLvr}% limit.` });
  }

  // LMI
  if (lmiWaived) {
    add({ id: 'lmi', label: 'Mortgage insurance', status: 'pass', weight: 1,
      detail: `May waive LMI for ${PROFESSION_NAME[p.profession!]} up to ${waiver!.maxLvr}% LVR — about ${fmtMoney(lmiEstimate(p.loan, theLvr))} saved.${waiver!.conditions ? ` ${waiver!.conditions}` : ''}` });
  } else if (theLvr > 80 && !usesScheme && theLvr <= maxLvr) {
    add({ id: 'lmi', label: 'Mortgage insurance', status: 'warn', weight: 1,
      detail: `Lenders Mortgage Insurance of roughly ${fmtMoney(lmiEstimate(p.loan, theLvr))} applies (usually added to the loan).` });
  }

  // Genuine savings
  if (theLvr > L.genuineSavingsAbove) {
    const need = p.price * 0.05;
    if (p.savings < need) {
      add({ id: 'genuine', label: 'Genuine savings', status: 'fail', gap: need - p.savings <= 15_000 ? 'close' : 'far', weight: 2,
        detail: `Above ${L.genuineSavingsAbove}% LVR it wants 5% (${fmtMoney(need)}) saved yourself — gifts don't count toward this.` });
    } else {
      add({ id: 'genuine', label: 'Genuine savings', status: 'pass', weight: 2, detail: 'You have 5% in genuine savings.' });
    }
  }

  // Funds to complete
  const costs = upfrontCosts(p);
  const need = deposit(p) + costs.total;
  const have = p.savings + p.gift + costs.fhog;
  if (have < need) {
    const short = need - have;
    add({ id: 'funds', label: 'Funds to complete', status: 'fail', gap: short <= Math.max(25_000, p.price * 0.03) ? 'close' : 'far', weight: 3,
      detail: `Your deposit plus about ${fmtMoney(costs.total)} in upfront costs needs ${fmtMoney(need)}; you have ${fmtMoney(have)}${costs.fhog ? ` including the ${fmtMoney(costs.fhog)} grant` : ''}.` });
  } else {
    add({ id: 'funds', label: 'Funds to complete', status: 'pass', weight: 3,
      detail: `You have the ${fmtMoney(need)} needed for deposit and costs.` });
  }

  // Serviceability
  if (p.loan > sv.byService) {
    add({ id: 'service', label: 'Serviceability', status: 'fail', gap: p.loan <= sv.byService * 1.12 ? 'close' : 'far', weight: 4,
      detail: `Assessed at ${sv.assessmentRate.toFixed(2)}%, your income supports about ${fmtMoney(sv.byService)} — ${fmtMoney(p.loan - sv.byService)} short.` });
  } else {
    add({ id: 'service', label: 'Serviceability', status: 'pass', weight: 4,
      detail: `Assessed at ${sv.assessmentRate.toFixed(2)}%, you can service up to ${fmtMoney(sv.byService)}.` });
  }

  // Debt-to-income
  const dti = debtToIncome(p);
  if (dti > L.maxDti) {
    add({ id: 'dti', label: 'Debt-to-income', status: 'fail', gap: dti - L.maxDti <= 1 ? 'close' : 'far', weight: 2,
      detail: `Total debts of ${dti.toFixed(1)}× income are above this lender's ${L.maxDti}× limit.` });
  } else if (dti >= 6) {
    add({ id: 'dti', label: 'Debt-to-income', status: 'warn', weight: 2,
      detail: `${dti.toFixed(1)}× income counts as high DTI — APRA caps these at 20% of a bank's new loans, so approval can depend on timing.` });
  } else {
    add({ id: 'dti', label: 'Debt-to-income', status: 'pass', weight: 2, detail: `${isFinite(dti) ? dti.toFixed(1) : '—'}× income is comfortable.` });
  }

  // Age / term
  if (sv.termYears < 30) {
    add({ id: 'age', label: 'Loan term', status: 'warn', weight: 1,
      detail: `Term may be limited to ${sv.termYears} years; a lender will ask how you'll repay into retirement.` });
  }

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce((s, c) =>
    s + (c.status === 'pass' ? c.weight : c.status === 'warn' ? c.weight * 0.85 : c.gap === 'close' ? c.weight * 0.4 : 0), 0);
  const fails = checks.filter(c => c.status === 'fail');
  const status: MatchStatus = fails.length === 0 ? 'ready' : fails.every(f => f.gap === 'close') && fails.length <= 2 ? 'close' : 'not_yet';
  const rate = productRate(L, p.purpose, theLvr);
  // An alt-doc loading changes the rate, so the base product's comparison rate no longer applies.
  const comparison = usesAltDoc(p, L) && altDocFor(L)?.rateLoading ? undefined : comparisonRate(L, p.purpose, theLvr);

  return {
    lender: L,
    status,
    score: Math.round((got / total) * 100),
    checks,
    maxBorrow: Math.min(sv.byService, sv.byDti),
    usesScheme,
    lmiWaived,
    rate,
    comparison,
    assessmentRate: sv.assessmentRate,
    monthlyRepayment: repayment(p.loan, rate, 30),
  };
}

export interface Assessment {
  results: LenderResult[];
  ready: number;
  close: number;
  notYet: number;
  borrowingPower: { typical: number; best: number };
  lvr: number;
}

const ORDER: Record<MatchStatus, number> = { ready: 0, close: 1, not_yet: 2 };

export function assess(p: Profile, lenders: LenderPolicy[] = MARKET_LENDERS): Assessment {
  const results = lenders.map(L => evaluate(p, L)).sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.score - a.score || a.rate - b.rate);
  // Borrowing power only counts lenders that would take you on non-financial grounds.
  const eligible = results.filter(r => !r.checks.some(c => c.status === 'fail' && ['residency', 'employment', 'credit'].includes(c.id) && c.gap === 'far'));
  const powers = (eligible.length ? eligible : results).map(r => r.maxBorrow).sort((a, b) => a - b);
  return {
    results,
    ready: results.filter(r => r.status === 'ready').length,
    close: results.filter(r => r.status === 'close').length,
    notYet: results.filter(r => r.status === 'not_yet').length,
    borrowingPower: { typical: powers[Math.floor(powers.length / 2)] ?? 0, best: powers[powers.length - 1] ?? 0 },
    lvr: lvr(p),
  };
}
