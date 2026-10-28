import { describe, expect, it } from 'vitest';
import { fixActions } from './actions';
import lenders from './__fixtures__/lenders.json';
import { PROFILES } from './__fixtures__/profiles';
import { assess } from './match';
import { summarise } from './summary';
import type { LenderPolicy } from './types';

// A frozen copy of the lender list, so the weekly Open Banking refresh can't change these results.
// Regenerate it (and review the snapshot diff) only when a rule change is meant to change outcomes.
const LENDERS = lenders as unknown as LenderPolicy[];
const r0 = (n: number) => Math.round(n);

describe('engine regression (frozen lenders)', () => {
  for (const [name, p] of Object.entries(PROFILES)) {
    it(name, () => {
      const a = assess(p, LENDERS);
      expect({
        counts: [a.ready, a.close, a.notYet],
        lvr: +a.lvr.toFixed(2),
        power: [r0(a.borrowingPower.typical), r0(a.borrowingPower.best)],
        lenders: a.results.map(r =>
          `${r.lender.id} ${r.status} ${r.score} ${r.rate.toFixed(3)} ${r.comparison ?? '-'} ${r0(r.maxBorrow)} ${r0(r.monthlyRepayment)}` +
          `${r.usesScheme ? ' scheme' : ''}${r.lmiWaived ? ' waived' : ''} | ${r.checks.map(c => `${c.id}:${c.status}${c.gap ? `:${c.gap}` : ''}`).join(' ')}`),
        // Full wording for the best three, and every distinct check message across all lenders.
        top: a.results.slice(0, 3).map(r => r.checks.map(c => c.detail)),
        messages: [...new Set(a.results.flatMap(r => r.checks.map(c => c.detail)))].sort(),
        fixes: fixActions(p, a, LENDERS).map(({ profile, ...f }) => ({ ...f, powerGain: r0(f.powerGain), loan: profile.loan, price: profile.price, savings: profile.savings })),
        summary: summarise(p, a),
      }).toMatchSnapshot();
    });
  }
});
