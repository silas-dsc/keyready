import { emptyProfile, newApplicant } from '../engine/profile';
import type { SiteConfig } from './types';

const WBC_HC = 'https://www.westpac.com.au/home-loans/healthcare-lmi';

/** Nurses, midwives and allied health: the $90k LMI-waiver market. */
export const nurses: SiteConfig = {
  id: 'nurses',
  segment: 'nurses-allied',
  name: 'Nurse Home Loan Check',
  plannedDomain: 'nursehomeloan.com.au',
  theme: { ink: '#3b1f4a', inkSoft: '#6a4b7a', go: '#2e8b6e', mint: '#9be3c8', mintSoft: '#e3f6ef', paper: '#faf7fb' },
  seo: {
    title: 'Nurse Home Loan Check — LMI waivers, overtime and borrowing power for nurses & midwives',
    description: 'Free check for nurses, midwives and allied health: which lenders publish no-LMI lending, the $90k income test, and your borrowing power with shift penalties.',
  },
  hero: {
    pill: 'For nurses, midwives & allied health',
    title: ['Your shifts count. ', 'So should your income.', ''],
    sub: 'Some lenders waive mortgage insurance for nurses and allied health earning $90k+, and count penalty rates and overtime differently. See which lenders’ published rules you fit.',
    ticks: ['Penalty rates & overtime', 'LMI waiver check', 'No credit check', 'Free'],
  },
  pitch: {
    title: ['Not every bank’s waiver includes nurses. ', 'We check which do.'],
    points: [
      ['🩺', 'The $90k test', 'Westpac and St.George publish a 90% no-LMI waiver for nurses, midwives and many allied health roles earning $90k or more.'],
      ['⏱️', 'Shift income', 'Overtime and allowances are shaded differently by each lender. We apply each one’s rules to your pay.'],
      ['🏡', 'First home?', 'The 5% Deposit Scheme can remove LMI too — we check that as well.'],
    ],
  },
  faq: [
    ['Is it really free?', 'Yes. The check, the report and the what-if tools are free, with no sign-up. If you choose to talk to us about a loan and go ahead, the lender pays us commission (set out in our Credit Guide). You never pay us a fee.'],
    ['Does overtime count toward the $90k?', 'Westpac says casual income is annualised over 52 weeks, and it may assess overtime and allowances at 100% for hospital-employed nurses and midwives (conditions apply). Other lenders count less. The broker will confirm how your payslips are assessed.'],
    ['Will this affect my credit score?', 'No. We don’t run a credit check.'],
    ['What happens to my answers?', 'They stay in your browser until you choose to share them with the broker.'],
  ],
  guides: [
    {
      slug: 'nurse-midwife-lmi-waiver',
      title: 'LMI waivers for nurses and midwives (2026): who offers them, and the $90k test',
      description: 'Which lenders publish no-LMI home loans for nurses, midwives and allied health, the 90% LVR limit and $90k income test — and which major banks exclude nurses.',
      updated: '2026-10-27',
      intro: 'Most profession LMI waivers were built for doctors. A few lenders now include nurses, midwives and allied health — usually up to 90% LVR, with a minimum income.',
      sections: [
        {
          heading: 'Lenders that publish a waiver including nurses',
          body: ['As published on the lenders’ own sites on the date above.'],
          table: {
            head: ['Lender', 'Max LVR without LMI', 'Income test', 'Who qualifies'],
            rows: [
              ['Westpac', '90%', '$90k+ (casual annualised over 52 weeks)', 'Registered nurses, midwives, pharmacists, physiotherapists, psychologists, radiographers, sonographers, OTs, podiatrists, speech pathologists, vets and other listed allied health'],
              ['St.George', '90%', '$90k+', 'Registered nurses, midwives and allied health professionals'],
              ['RAMS', '90%', '$90k+', 'Nurses (offer page on RAMS’s site)'],
            ],
          },
        },
        {
          heading: 'Banks whose published lists exclude nurses',
          body: [
            'ANZ’s LMI waiver fact sheet lists nurses, midwives, pharmacists and psychologists among ineligible medical professionals. NAB’s published waiver list includes pharmacists and physiotherapists but not nurses or midwives.',
          ],
        },
        {
          heading: 'Overtime and penalty rates',
          body: [
            'Westpac states it could assess overtime and allowances at 100% for front-line healthcare and emergency services staff, including hospital-employed nurses and midwives (conditions apply). Many lenders count only part of overtime, so the same payslip can mean very different borrowing power.',
          ],
        },
        {
          heading: 'First home buyer? Compare with the 5% Deposit Scheme',
          body: [
            'Since October 2025 the government’s 5% Deposit Scheme has had no income caps and unlimited places. For a first home under the price cap it removes LMI with a 5% deposit — so the profession waiver matters most for repeat buyers and investors.',
          ],
        },
      ],
      sources: [
        { label: 'Westpac — Healthcare professionals LMI waiver', url: WBC_HC },
        { label: 'Westpac broker niche booklet (overtime at 100%)', url: 'https://www.westpac.com.au/content/dam/public/brokers/documents/other-resources/Broker_Niche_Booklet.pdf' },
        { label: 'St.George — profession home loans', url: 'https://www.stgeorge.com.au/personal/home-loans/profession-home-loans' },
        { label: 'RAMS — nurses offer', url: 'https://rams.com.au/all-offers/nursesoffer/' },
        { label: 'ANZ — LMI waiver fact sheet (PDF)', url: 'https://www.anz.com.au/content/dam/anzcomau/documents/pdf/lmi-waier-fact-sheet.pdf' },
        { label: 'NAB — LMI waiver', url: 'https://www.nab.com.au/personal/home-loans/lmi/lmi-waiver' },
        { label: 'First Home Buyers — 5% Deposit Scheme', url: 'https://firsthomebuyers.gov.au/' },
      ],
    },
  ],
  wizard: {
    profession: {
      prompt: 'What’s your role?',
      options: ['nurse', 'midwife', 'pharmacist', 'physio', 'psychologist', 'optometrist', 'allied_health', 'other'],
    },
  },
  sample: () => ({
    ...emptyProfile(),
    applicants: [{ ...newApplicant(), age: 30, tenureMonths: 40, baseIncome: 92_000, overtime: 12_000, allowances: 4_000 }],
    firstHome: false,
    profession: 'nurse',
    savings: 78_000,
    state: 'QLD',
    price: 640_000,
    loan: 576_000,
    creditScore: 760,
  }),
};
