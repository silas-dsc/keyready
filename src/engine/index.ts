/**
 * Public API of the shared rules engine. Every site, and the MCP server (bundled for Deno by
 * scripts/bundle-rules.mjs), uses exactly this — there is one copy of the lending rules.
 */
export { fixActions, type FixAction } from './actions';
export { SOURCES as DUTY_SOURCES, stampDuty, type DutyResult } from './duty';
export { deposit, depositScheme, fmtMoney, lmiEstimate, lvr, totalGross, upfrontCosts } from './finance';
export { MARKET_FETCHED_AT, MARKET_LENDERS, productRate } from './market';
export { assess, type Assessment } from './match';
export { emptyProfile, newApplicant } from './profile';
export { decodeProfile, encodeProfile } from './share';
export { summarise, type LeadSummary } from './summary';
export type * from './types';
