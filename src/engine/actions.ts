import { fmtMoney, fundsToComplete } from './finance';
import { MARKET_LENDERS } from './market';
import { assess, type Assessment } from './match';
import type { LenderPolicy, Profile } from './types';

export interface FixAction {
  id: string;
  title: string;
  detail: string;
  /** Lenders that move to "ready" if you do this. */
  unlocks: number;
  powerGain: number;
  profile: Profile;
}

const clone = (p: Profile): Profile => ({ ...p, applicants: p.applicants.map(a => ({ ...a })) });

/**
 * Simulates concrete changes a borrower could make and ranks them by how many
 * lenders they unlock: the "what's between you and yes" list.
 */
export function fixActions(p: Profile, base?: Assessment, lenders: LenderPolicy[] = MARKET_LENDERS): FixAction[] {
  base ??= assess(p, lenders);
  const out: FixAction[] = [];
  const consider = (id: string, title: string, detail: string, next: Profile, a = assess(next, lenders)) => {
    const unlocks = a.ready - base.ready;
    const powerGain = a.borrowingPower.typical - base.borrowingPower.typical;
    if (unlocks > 0 || powerGain >= 5_000) out.push({ id, title, detail, unlocks, powerGain, profile: next });
  };

  if (p.cardLimits > 0) {
    const n = clone(p); n.cardLimits = 0;
    consider('cards', `Cancel ${fmtMoney(p.cardLimits)} in card limits`,
      'Banks count your full limit as debt, even if the card is paid off. Closing or reducing unused cards is the fastest win.', n);
  }

  const { need, have } = fundsToComplete(p);
  if (p.personalLoans > 0 && have - need >= p.personalLoans) {
    const n = clone(p); n.savings -= p.personalLoans; n.personalLoans = 0;
    consider('loans', `Pay off your ${fmtMoney(p.personalLoans)} personal/car loan`,
      'You have spare savings beyond your deposit. Clearing a loan removes a monthly commitment from the assessment.', n);
  }

  const tenureGaps = base.results
    .flatMap(r => r.checks.filter(c => c.id === 'employment' && c.status === 'fail' && c.gap === 'close').map(c => c.waitMonths ?? 0))
    .filter(Boolean);
  if (tenureGaps.length) {
    const wait = Math.min(...tenureGaps);
    const n = clone(p); n.applicants.forEach(a => { a.tenureMonths += wait; });
    consider('tenure', `Stay in your role ${wait} more month${wait === 1 ? '' : 's'}`,
      'Some lenders want a minimum time with your employer. Time fixes this one on its own.', n);
  }

  for (const extra of [5_000, 10_000, 20_000, 35_000, 50_000, 75_000]) {
    const keepLoan = clone(p); keepLoan.savings += extra;
    const smallerLoan = clone(p); smallerLoan.savings += extra; smallerLoan.loan = Math.max(0, p.loan - extra);
    const a = assess(keepLoan, lenders), b = assess(smallerLoan, lenders);
    const [best, bestA] = b.ready >= a.ready ? [smallerLoan, b] : [keepLoan, a];
    if (bestA.ready > base.ready) {
      consider('save', `Save another ${fmtMoney(extra)}`,
        best === smallerLoan ? 'Putting it into your deposit lowers your LVR and the loan you need.' : 'Covers your deposit and upfront costs in full.', best, bestA);
      break;
    }
  }

  for (let cut = 25_000; cut <= p.price * 0.35; cut += 25_000) {
    const n = clone(p); n.price = p.price - cut; n.loan = Math.max(0, p.loan - cut);
    const a = assess(n, lenders);
    if (a.ready > base.ready) {
      consider('price', `Look at homes around ${fmtMoney(n.price)}`,
        `Keeping the same deposit, a ${fmtMoney(cut)} lower price brings your loan to ${fmtMoney(n.loan)}.`, n, a);
      break;
    }
  }

  return out.sort((a, b) => b.unlocks - a.unlocks || b.powerGain - a.powerGain);
}
