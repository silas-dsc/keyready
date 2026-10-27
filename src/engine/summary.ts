import { stampDuty } from './duty';
import { depositScheme } from './finance';
import type { Assessment } from './match';
import type { Profile } from './types';

/** Compact result attached to every lead (web or MCP) so the broker sees the case at a glance. */
export interface LeadSummary {
  ready: number;
  close: number;
  lenders: number;
  lvr: number;
  borrowingPower: number;
  /** Real brand names of the best matches — brokers see these, consumers see masked names. */
  topLenders: string[];
  stampDuty: number;
  fhog: number;
  schemeEligible: boolean;
}

export function summarise(p: Profile, a: Assessment): LeadSummary {
  const d = stampDuty(p);
  return {
    ready: a.ready,
    close: a.close,
    lenders: a.results.length,
    lvr: Math.round(a.lvr * 10) / 10,
    borrowingPower: Math.round(a.borrowingPower.typical),
    topLenders: a.results.filter(r => r.status === 'ready').slice(0, 3).map(r => r.lender.brand ?? r.lender.name),
    stampDuty: Math.round(d.duty),
    fhog: d.fhog,
    schemeEligible: depositScheme(p).eligible,
  };
}
