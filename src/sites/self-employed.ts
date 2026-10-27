import { emptyProfile, newApplicant } from '../engine/profile';
import type { SiteConfig } from './types';

const MQ = 'https://www.macquarie.com.au/assets/bfs/documents/broker/mortgages/macquarie_broker-credit-guidelines.pdf';

/** Sole traders, tradies, contractors and business owners: full-doc vs alt-doc. */
export const selfEmployed: SiteConfig = {
  id: 'self-employed',
  segment: 'self-employed',
  name: 'Low Doc Check',
  plannedDomain: 'lowdoccheck.com.au',
  theme: { ink: '#2b2a1f', inkSoft: '#5c5a48', go: '#c2410c', mint: '#fdba74', mintSoft: '#fff1e6', paper: '#faf8f3' },
  seo: {
    title: 'Low Doc Check — home loans for the self-employed, tradies and ABN holders',
    description: 'Free check for self-employed borrowers: how long your ABN needs to be, full-doc vs alt-doc lenders, LVR limits and borrowing power. No credit check.',
  },
  hero: {
    pill: 'For sole traders, tradies & business owners',
    title: ['Self-employed? ', 'Find the lenders', ' that fit your paperwork.'],
    sub: 'Banks want two years of tax returns. Some accept 18 months of ABN or one year of financials, and specialist lenders offer alt-doc loans on BAS or an accountant’s letter. See which rules you fit today.',
    ticks: ['Full-doc & alt-doc', 'ABN-age rules', 'No credit check', 'Free'],
  },
  pitch: {
    title: ['Your bank’s “no” might just mean ', 'wrong lender.'],
    points: [
      ['📅', 'ABN age', 'Minimums range from 6 months (alt-doc) to 2 years — we check each lender’s published rule against yours.'],
      ['🧾', 'Documents', 'Two years of returns, one year, or BAS and bank statements — each path has different lenders and LVR limits.'],
      ['🎛️', 'What if', 'See how lodging this year’s return, or a bigger deposit, changes your options.'],
    ],
  },
  faq: [
    ['Is it really free?', 'Yes. The check, the report and the what-if tools are free, with no sign-up. If you choose to talk to us about a loan and go ahead, the lender pays us commission (set out in our Credit Guide). You never pay us a fee.'],
    ['What is an alt-doc (low-doc) loan?', 'A home loan for the self-employed that verifies income with BAS, business bank statements or an accountant’s letter instead of tax returns. They usually have a lower maximum LVR and a higher rate.'],
    ['Will this affect my credit score?', 'No. We don’t run a credit check.'],
    ['What happens to my answers?', 'They stay in your browser until you choose to share them with the broker.'],
  ],
  guides: [
    {
      slug: 'abn-time-home-loan',
      title: 'How long do you need an ABN to get a home loan? Lender rules (2026)',
      description: 'Minimum ABN and trading time for self-employed home loans at Westpac, ANZ, NAB, Bankwest, Macquarie, AMP, CommBank and alt-doc lenders — with sources.',
      updated: '2026-10-27',
      intro: 'The rule of thumb is two years of tax returns, but published minimums range from six months (alt-doc lenders) to two years. Here’s what each lender says on its own site.',
      sections: [
        {
          heading: 'Published minimums',
          body: ['As published by each lender on the date above.'],
          table: {
            head: ['Lender', 'Minimum time', 'Notes'],
            rows: [
              ['Westpac', 'ABN 2 years in most cases; GST 12 months may be required', 'Doesn’t offer low-doc loans; a 1-year assessment is available up to 80% LVR (credit score 650+)'],
              ['ANZ', 'ABN/ACN registered 18 months', '2 years if income is director’s fees or dividends'],
              ['Bankwest', 'ABN/ACN 18 months', 'Up to 80% LVR'],
              ['NAB', '1 year of financials considered', 'Up to 80% LVR; 2 years of returns standard'],
              ['Macquarie', '2 years trading', '1 year for self-employed professionals, up to 80% LVR'],
              ['AMP', '2 years', 'Low-doc product closed to new borrowers'],
              ['Pepper Money (non-bank)', '6 months ABN & GST (alt-doc)', 'BAS, bank statements or accountant’s letter; 80% LVR to $5m, 95% to $3m'],
              ['Liberty (non-bank)', 'Not stated (low-doc)', 'Up to 85% LVR; bank statements, BAS or accountant’s declaration'],
              ['La Trobe (non-bank)', 'Not stated (lite-doc)', '80% LVR to $5m; accountant’s letter, trading statements or BAS'],
            ],
          },
        },
        {
          heading: 'Full-doc beats alt-doc when you can',
          body: ['Alt-doc loans cost more and cap the LVR. If you’re a few months from lodging your second tax return, waiting can open up the major banks — our check shows how many more lenders that would unlock.'],
        },
      ],
      sources: [
        { label: 'Westpac — self-employed: how to apply', url: 'https://www.westpac.com.au/home-loans/self-employed/how-to-apply' },
        { label: 'Westpac — self-employed ideas hub (1-year assessment)', url: 'https://www.westpac.com.au/brokers/ideas-hub/self-employed/' },
        { label: 'ANZ — home loans for business owners', url: 'https://www.anz.com.au/personal/home-loans/buying-home/home-loans-business-owners/' },
        { label: 'Bankwest — product disclosure (BWE-8017, PDF)', url: 'https://www.bankwest.com.au/content/dam/bankwest/documents/legal-library/PDS_BWE-8017.pdf' },
        { label: 'NAB — self-employed home loans', url: 'https://www.nab.com.au/personal/home-loans/self-employed-home-loan' },
        { label: 'Macquarie broker credit guidelines (PDF)', url: MQ },
        { label: 'AMP distributor policies', url: 'https://distributor.amp.com.au/policies' },
        { label: 'Pepper Money — low doc vs alt doc', url: 'https://www.peppermoney.com.au/home-loans/low-doc-vs-alt-doc' },
        { label: 'Liberty — low doc home loans', url: 'https://www.liberty.com.au/home-loans/low-doc-home-loans' },
        { label: 'La Trobe Financial — self-employed loans', url: 'https://www.latrobefinancial.com.au/lending/self-employed-loan/' },
      ],
    },
    {
      slug: 'self-employed-add-backs',
      title: 'Add-backs: what lenders add back to your business profit',
      description: 'Which expenses lenders add back to self-employed income for a home loan — depreciation, super, one-off costs — using Macquarie’s and AMP’s published rules.',
      updated: '2026-10-27',
      intro: 'Lenders start from your taxable business profit, then “add back” some expenses that don’t reflect your real ability to repay. The rules differ by lender, and they can change your borrowing power a lot.',
      sections: [
        {
          heading: 'Published add-back rules',
          body: ['As published by each lender on the date above.'],
          table: {
            head: ['Lender', 'What it adds back'],
            rows: [
              ['Macquarie', 'Director or partner salaries; super above the compulsory minimum; interest on loans being refinanced; depreciation up to 20% of net profit; non-recurring expenses; trust distributions to children under 18. Rising income capped at 120% of the prior year.'],
              ['AMP', 'Super above the legislated amount; non-recurring expenses; 50% of depreciation.'],
              ['Westpac', 'Business profits and add-backs under its standard two-year assessment (details in broker policy).'],
            ],
          },
        },
      ],
      sources: [
        { label: 'Macquarie broker credit guidelines (PDF)', url: MQ },
        { label: 'AMP distributor policies', url: 'https://distributor.amp.com.au/policies' },
        { label: 'Westpac — self-employed ideas hub', url: 'https://www.westpac.com.au/brokers/ideas-hub/self-employed/' },
      ],
    },
  ],
  wizard: {
    lowDoc: true,
    defaults: p => ({ ...p, applicants: p.applicants.map((a, i) => (i === 0 ? { ...a, employment: 'self_employed' } : a)) }),
  },
  sample: () => ({
    ...emptyProfile(),
    applicants: [{ ...newApplicant(), age: 38, employment: 'self_employed', tenureMonths: 20, baseIncome: 165_000 }],
    firstHome: false,
    savings: 230_000,
    state: 'NSW',
    price: 900_000,
    loan: 720_000,
    creditScore: 740,
  }),
};
