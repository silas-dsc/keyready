import { LENDER_COUNT_ROUGH } from '../engine/market';
import { sampleProfile } from '../engine/profile';
import type { SiteConfig } from './types';

/** The general site: first home buyers and everyone else. */
export const core: SiteConfig = {
  id: 'core',
  segment: 'general',
  name: 'KeyReady',
  theme: { ink: '#0e3b3a', inkSoft: '#3d5f5d', go: '#12805c', mint: '#50e3a4', mintSoft: '#dcf8ea', paper: '#f7f5ef' },
  seo: {
    title: 'KeyReady: check your home loan readiness against lenders’ published rules',
    description: `Free 5-minute check against ${LENDER_COUNT_ROUGH} Australian lenders’ live rates and rules, plus exact stamp duty and grants for your state. No credit check.`,
  },
  hero: {
    pill: 'Free · 5 minutes · no credit check',
    title: ['See which lenders’ rules you ', 'already fit', ' before you apply.'],
    sub: 'Answer a few easy questions. We check your situation against each lender’s published rules and show which ones you fit, which are close, and exactly what to fix.',
    ticks: ['No sign-up', 'No payslips', 'No credit check', 'Your data stays yours'],
  },
  pitch: {
    title: ['You shouldn’t need to call five brokers to find out ', 'where you stand.'],
    points: [
      ['🎯', 'Where you fit', 'Every lender checked against its own published rules, with a plain-English reason for each result.'],
      ['🧭', 'What to fix', 'Your fastest wins, ranked by how many lenders each one unlocks, like cancelling an unused card.'],
      ['🎛️', 'What if', 'Drag the price, deposit or income and see which lenders’ rules you meet change in real time.'],
    ],
  },
  faq: [
    ['Is it really free?', 'Yes. The check, the report and the what-if tools are free, with no sign-up. If you choose to talk to us about a loan and go ahead, the lender pays us commission (set out in our Credit Guide). You never pay us a fee.'],
    ['Will this affect my credit score?', 'No. We don’t run a credit check. Your score is only touched when you formally apply with a lender, and a broker helps you apply once, to the right one, instead of collecting enquiries.'],
    ['How does the matching work?', 'We model each lender’s policy rules (residency, time in job, how they shade overtime and bonuses, LVR limits, genuine savings, debt-to-income caps) and stress-test your repayments at 3% above the rate, the buffer APRA expects banks to use.'],
    ['What happens to my answers?', 'They stay in your browser until you choose to share them with a broker. You can clear them at any time.'],
    ['How is this different from a broker?', 'Think of it as preparation. You walk in knowing where you stand and what to fix, so the conversation starts at “let’s apply” instead of “let’s see”.'],
  ],
  guides: [
    {
      slug: 'first-home-buyer-stamp-duty-grants',
      title: 'First home buyer stamp duty and grants by state (2026–27)',
      description: 'Every state and territory’s first home buyer stamp duty exemption or concession and First Home Owner Grant for 2026–27, from the revenue offices.',
      updated: '2026-10-27',
      intro: 'Stamp duty and grants for first home buyers are set by each state and change often. Tasmania’s exemption ended on 30 June 2026, WA lifted its thresholds in May 2026 and the ACT removed its income test in July. Here’s where each one stands.',
      sections: [
        {
          heading: 'Stamp duty relief and grants for first home buyers',
          body: ['Owner-occupier first home buyers who meet each state’s conditions (usually moving in within 12 months). Our readiness check calculates the exact duty for your price.'],
          table: {
            head: ['State', 'Stamp duty relief', 'First Home Owner Grant (new homes)'],
            rows: [
              ['NSW', 'No duty up to $800,000; concession to $1m (vacant land $350k–$450k)', '$10,000 (homes up to $600k; land + build up to $750k)'],
              ['VIC', 'No duty up to $600,000; concession to $750,000', '$10,000 (up to $750k)'],
              ['QLD', 'New home or vacant land: no duty, no cap. Established: none up to $700k, stepped concession to $800k', '$30,000 (under $750k)'],
              ['WA', 'From 7 May 2026: no duty up to $600,000; concession to $800,000 (vacant land $450k–$550k)', '$10,000 (cap $800k; $1m north of the 26th parallel)'],
              ['SA', 'New home or land to build: no duty, no cap. Established: no relief', '$15,000 (no cap)'],
              ['TAS', 'None for settlements after 30 June 2026', '$20,000 (2026–27)'],
              ['ACT', 'Home Buyer Concession Scheme: no duty, no income or price cap from 1 July 2026 (no property interest in the past 5 years)', 'None'],
              ['NT', 'Established: none. New house-and-land packages: exempt until 30 June 2027', '$50,000 HomeGrown Territory Grant (until 30 Sep 2027)'],
            ],
          },
        },
        {
          heading: 'Don’t forget the 5% Deposit Scheme',
          body: ['Since October 2025 the government’s 5% Deposit Scheme has had no income caps or place limits, so many first home buyers can avoid Lenders Mortgage Insurance with a 5% deposit, under the property price cap for their area.'],
        },
      ],
      sources: [
        { label: 'Revenue NSW: First Home Buyers Assistance Scheme', url: 'https://www.revenue.nsw.gov.au/grants-schemes/first-home-buyer/assistance-scheme' },
        { label: 'SRO Victoria: first home buyer duty exemption or concession', url: 'https://www.sro.vic.gov.au/buying-property/land-transfer-stamp-duty/concessions-exemptions-and-waivers/first-home-buyers/first-home-buyer-duty-exemption-or-concession' },
        { label: 'Queensland Revenue Office: concession rates', url: 'https://qro.qld.gov.au/duties/transfer-duty/calculate/concession-rates/' },
        { label: 'Queensland: first home (new home) concession', url: 'https://qro.qld.gov.au/duties/transfer-duty/concessions/homes/first-home-new-home/' },
        { label: 'WA Department of Finance: transfer duty assessment', url: 'https://www.wa.gov.au/organisation/department-of-finance/transfer-duty-assessment' },
        { label: 'RevenueSA: first home buyer relief', url: 'https://www.revenuesa.sa.gov.au/stamp-duty-land/first-home-buyer-relief' },
        { label: 'SRO Tasmania: first home owner eligibility', url: 'https://www.sro.tas.gov.au/first-home-owner/eligibility' },
        { label: 'ACT Home Buyer Concession Scheme determination 2026', url: 'https://www.legislation.act.gov.au/di/2026-157/' },
        { label: 'NT First Home Owner Grant Act', url: 'https://legislation.nt.gov.au/Legislation/FIRST-HOME-OWNER-GRANT-ACT-2000' },
        { label: 'First Home Buyers: 5% Deposit Scheme', url: 'https://firsthomebuyers.gov.au/' },
      ],
    },
  ],
  wizard: {},
  sample: sampleProfile,
};
