import { emptyProfile, newApplicant } from '../engine/profile';
import type { SiteConfig } from './types';

const MQ = 'https://www.macquarie.com.au/assets/bfs/documents/broker/mortgages/macquarie_broker-credit-guidelines.pdf';

/** Australians living overseas, and anyone paid in a foreign currency. */
export const expats: SiteConfig = {
  id: 'expats',
  segment: 'expats',
  name: 'Expat Loan Check',
  plannedDomain: 'expatloancheck.com.au',
  theme: { ink: '#123047', inkSoft: '#43607a', go: '#0f766e', mint: '#5eead4', mintSoft: '#dcf7f3', paper: '#f5f8fa' },
  seo: {
    title: 'Expat Loan Check — buying in Australia while living overseas or earning foreign income',
    description: 'Free check for Australian expats: which lenders exclude overseas residents, how foreign income is haircut by currency, LVR caps and borrowing power.',
  },
  hero: {
    pill: 'For Australians abroad & foreign-income earners',
    title: ['Buying back home? ', 'Most banks say no.', ' Find the ones that don’t.'],
    sub: 'Several major banks exclude borrowers who live overseas, and those that accept foreign income only count part of it. See how your situation lines up with each lender’s published rules.',
    ticks: ['Overseas-resident rules', 'Currency haircuts', 'No credit check', 'Free'],
  },
  pitch: {
    title: ['The hardest part of an expat loan is ', 'finding a lender that will look at it.'],
    points: [
      ['🌏', 'Who lends abroad', 'NAB, Westpac and St.George publish that they don’t lend to overseas residents. We check every lender’s published position.'],
      ['💱', 'Currency haircut', 'Lenders count around 80% of foreign income in major currencies — less, or nothing, for others.'],
      ['📉', 'LVR caps', 'Foreign-income loans often cap at 70–80% LVR. See what deposit you’d need.'],
    ],
  },
  faq: [
    ['Is it really free?', 'Yes. The check, the report and the what-if tools are free, with no sign-up. If you choose to talk to us about a loan and go ahead, the lender pays us commission (set out in our Credit Guide). You never pay us a fee.'],
    ['Why do so few lenders show up for me?', 'Because most mainstream lenders publish that they don’t lend to borrowers living overseas, or don’t publish expat lending at all. Specialist lenders that do lend to expats often don’t publish their rules online — a broker can access them.'],
    ['Will this affect my credit score?', 'No. We don’t run a credit check.'],
  ],
  guides: [
    {
      slug: 'expat-home-loan-australia',
      title: 'Expat home loans: which Australian lenders say no, and how foreign income is counted (2026)',
      description: 'Which Australian lenders exclude overseas residents, how much foreign income they count by currency, and the LVR caps — from lenders’ own published policies.',
      updated: '2026-10-27',
      intro: 'Australians living abroad often assume their bank will lend to them. Several major lenders publish that they won’t, and those that accept foreign income count only part of it.',
      sections: [
        {
          heading: 'Lenders that publish they don’t lend to overseas residents',
          body: ['As published on the lenders’ own sites on the date above.'],
          table: {
            head: ['Lender', 'Published position'],
            rows: [
              ['NAB', 'Home loan products are not available to applicants who reside overseas, regardless of citizenship'],
              ['Westpac, St.George', 'Residential lending is not available for non-Australian-resident borrowers'],
              ['Macquarie', 'Applicants without a current Australian residential address are outside guidelines'],
              ['AMP', 'New customers must live and work in Australia'],
              ['HSBC', 'Closing its Australian retail banking business'],
            ],
          },
        },
        {
          heading: 'How foreign income is counted (if you live in Australia)',
          body: ['Lenders convert foreign income and then count only part of it, to allow for currency swings.'],
          table: {
            head: ['Lender', 'Share counted', 'Currencies', 'LVR cap'],
            rows: [
              ['Macquarie', '80% (PAYG only)', 'GBP, EUR, HKD, NZD, SGD, USD, CAD, JPY, CHF', 'Not stated'],
              ['AMP (tier 1)', '80%', 'CAD, EUR, GBP, HKD, JPY, NZD, SGD, USD', '70%'],
              ['AMP (tier 2)', '50% (capped at USD 50k)', 'CNY', '50%'],
            ],
          },
        },
      ],
      sources: [
        { label: 'NAB — variable rate offset home loan (eligibility)', url: 'https://www.nab.com.au/personal/home-loans/nab-variable-rate-offset-home-loan' },
        { label: 'Westpac broker policy', url: 'https://westpac.com.au/brokers/policy' },
        { label: 'St.George broker policy', url: 'https://www.stgeorge.com.au/broker/policy' },
        { label: 'Macquarie broker credit guidelines (PDF)', url: MQ },
        { label: 'AMP distributor policies', url: 'https://distributor.amp.com.au/policies' },
        { label: 'HSBC Australia — international mortgages', url: 'https://www.hsbc.com.au/international/mortgages/' },
      ],
    },
  ],
  wizard: { expat: true },
  sample: () => ({
    ...emptyProfile(),
    applicants: [{ ...newApplicant(), age: 36, tenureMonths: 48, baseIncome: 190_000 }],
    firstHome: false,
    livesOverseas: false,
    incomeCurrency: 'USD',
    savings: 360_000,
    state: 'NSW',
    price: 1_000_000,
    loan: 700_000,
    creditScore: 800,
  }),
};
