import { emptyProfile, newApplicant } from '../engine/profile';
import type { SiteConfig } from './types';

const WBC_HC = 'https://www.westpac.com.au/home-loans/healthcare-lmi';
const ANZ_MED = 'https://www.anz.com.au/content/dam/anzcomau/documents/pdf/lmi-waiver-medical-and-dental-practitioners-and-specialists.pdf';

/** Doctors, dentists, vets, lawyers, accountants, actuaries: the profession LMI-waiver market. */
export const professionals: SiteConfig = {
  id: 'professionals',
  segment: 'professionals',
  name: 'LMI Waiver Check',
  plannedDomain: 'lmiwaivercheck.com.au',
  theme: { ink: '#1c2a4a', inkSoft: '#46557a', go: '#1f7a8c', mint: '#7fd8e6', mintSoft: '#e1f4f7', paper: '#f6f7fb' },
  seo: {
    title: 'LMI Waiver Check: do you qualify for no-LMI lending as a doctor, dentist, lawyer or accountant?',
    description: 'Free check of which lenders publish LMI waivers for your profession, up to what LVR, and what it saves, using live Open Banking rates. No credit check.',
  },
  hero: {
    pill: 'For doctors, dentists, vets, lawyers & accountants',
    title: ['Skip ', 'mortgage insurance', ' with a 5–10% deposit.'],
    sub: 'Several lenders publish LMI waivers for particular professions, up to 95% LVR for some medical professionals. See which ones your profession and numbers fit, and what it saves you.',
    ticks: ['Profession-specific rules', 'Live lender rates', 'No credit check', 'Free'],
  },
  pitch: {
    title: ['LMI on a $1m home can cost ', 'more than a new car.'],
    points: [
      ['🩺', 'Your profession, their list', 'Each lender’s waiver covers a different list of professions, registrations and income tests. We check yours against each one.'],
      ['💸', 'What it saves', 'See the mortgage insurance you’d otherwise pay at your LVR, and which lenders waive it.'],
      ['🎛️', 'What if', 'Try a 5%, 10% or 20% deposit and watch which lenders still fit.'],
    ],
  },
  faq: [
    ['Is it really free?', 'Yes. The check, the report and the what-if tools are free, with no sign-up. If you choose to talk to us about a loan and go ahead, the lender pays us commission (set out in our Credit Guide). You never pay us a fee.'],
    ['Will this affect my credit score?', 'No. We don’t run a credit check.'],
    ['Do interns and registrars qualify?', 'It depends on the lender. Westpac’s published waiver includes hospital-employed doctors from intern level; ANZ’s requires AHPRA General or Specialist registration and excludes provisional and limited registration. The check asks the questions that decide it.'],
    ['Is an LMI waiver guaranteed?', 'No. Waivers are at each lender’s discretion and their conditions change. Treat the result as “may qualify” and confirm with the broker or lender.'],
    ['What happens to my answers?', 'They stay in your browser until you choose to share them with the broker.'],
  ],
  guides: [
    {
      slug: 'lmi-waiver-doctors-dentists',
      title: 'LMI waivers for doctors and dentists (2026): which lenders, what LVR',
      description: 'Which Australian lenders publish LMI waivers for doctors, specialists and dentists, the maximum LVR, and who is excluded, with sources.',
      updated: '2026-10-27',
      intro: 'Lenders Mortgage Insurance usually applies when you borrow more than 80% of a property’s value. Several lenders waive it for medical professionals (some up to 95% LVR), but each has its own list of eligible registrations and conditions.',
      sections: [
        {
          heading: 'Published medical LMI waivers',
          body: ['These are the waivers the lenders publish on their own sites, as checked on the date above. Lenders can change or withdraw them at any time.'],
          table: {
            head: ['Lender', 'Max LVR without LMI', 'Who qualifies', 'Notable conditions'],
            rows: [
              ['Westpac (and St.George)', '95%', 'GPs, dentists, medical specialists, hospital-employed doctors (intern, resident, registrar, staff specialist)', 'No minimum income; loan up to $5m; qualifications verified'],
              ['ANZ', '95%', 'Medical practitioners, specialists and dentists with AHPRA General or Specialist registration', 'Not provisional, limited or non-practising registration; loan up to $4.75m; equal or majority share of the property'],
              ['BOQ Specialist', '90% (up to 100% in some circumstances)', 'Doctors, dentists, vets and accountants (banking package)', 'Criteria for 100% not published'],
              ['CommBank', '90% (from a 10% deposit)', 'Doctors, lawyers and accountants; eligibility checked case by case', 'Profession list not published'],
              ['NAB', 'Not published', 'AHPRA-registered GPs, specialists, dental practitioners, pharmacists, physiotherapists, optometrists, vets and others', 'LVR limit not stated on its site'],
            ],
          },
        },
        {
          heading: 'What a waiver is worth',
          body: [
            'LMI premiums rise steeply above 90% LVR. On an $855,000 loan at 95% LVR, an indicative premium is around $29,000. It’s often added to the loan, so you’d pay interest on it for decades. Our check shows the indicative LMI for your numbers and which lenders publish a waiver for your profession.',
            'Premiums vary by insurer, lender, loan size and state; the figure above is our estimate, not a quote.',
          ],
        },
        {
          heading: 'Registration matters more than job title',
          body: [
            'The biggest difference between lenders is the registration they accept. ANZ excludes provisional and limited AHPRA registration, which affects many interns and international medical graduates; Westpac’s published list includes interns employed by hospitals. If you’re early in your career, check the registration rules before you choose a lender.',
          ],
        },
      ],
      faq: [
        ['Can I get an LMI waiver on an investment property?', 'Some lenders apply waivers to investment loans and others only to owner-occupied loans. Check the conditions for each lender with the broker.'],
        ['Do I need to be a first home buyer?', 'No. Profession waivers are not first-home-buyer schemes. First home buyers can also look at the government’s 5% Deposit Scheme, which removes LMI with a 5% deposit.'],
      ],
      sources: [
        { label: 'Westpac: Healthcare professionals LMI waiver', url: WBC_HC },
        { label: 'Westpac broker niche booklet (loan caps)', url: 'https://www.westpac.com.au/content/dam/public/brokers/documents/other-resources/Broker_Niche_Booklet.pdf' },
        { label: 'St.George broker policy', url: 'https://www.stgeorge.com.au/broker/policy' },
        { label: 'ANZ: LMI waiver for medical and dental practitioners (PDF)', url: ANZ_MED },
        { label: 'BOQ Specialist home loans', url: 'https://www.boqspecialist.com.au/personal-banking/home-loans/' },
        { label: 'CommBank: low deposit home loan options', url: 'https://www.commbank.com.au/home-loans/low-deposit-home-loan-options.html' },
        { label: 'NAB: LMI waiver', url: 'https://www.nab.com.au/personal/home-loans/lmi/lmi-waiver' },
      ],
    },
    {
      slug: 'lmi-waiver-lawyers-accountants',
      title: 'LMI waivers for lawyers, accountants and actuaries (2026)',
      description: 'Which lenders publish no-LMI lending for lawyers, accountants and actuaries, the LVR, and the memberships or practising certificates required.',
      updated: '2026-10-27',
      intro: 'Legal and finance professionals can often borrow up to 90% of a property’s value without paying Lenders Mortgage Insurance. The deciding factor is usually a current practising certificate or professional-body membership.',
      sections: [
        {
          heading: 'Published waivers',
          body: ['As published on the lenders’ own sites on the date above.'],
          table: {
            head: ['Lender', 'Max LVR without LMI', 'Who qualifies'],
            rows: [
              ['ANZ', '90%', 'Accountants and actuaries with current CA ANZ, CPA, CFA Institute or FIAA membership (no minimum income); lawyers, solicitors, barristers, judges and magistrates with a current practising certificate. Loans up to $4.5m.'],
              ['Westpac (and St.George)', '90%', 'Accounting and legal professionals meeting its approved industry accreditation and income criteria'],
              ['CommBank', '90% (from a 10% deposit)', 'Lawyers and accountants; eligibility checked case by case'],
              ['BOQ Specialist', '90%', 'Accountants (banking package)'],
              ['NAB', 'Not published', 'Accountants (CA ANZ, CPA, IPA), actuaries (FIAA), financial analysts (CFA), barristers, lawyers and solicitors with a current certificate'],
            ],
          },
        },
        {
          heading: 'One thing to check',
          body: ['ANZ’s broker documents state 90% LVR for legal and accounting professionals, while one of its consumer pages mentions “up to 95%” for legal, medical or accounting professions. Until that’s resolved, plan on 90% and confirm with the broker.'],
        },
      ],
      sources: [
        { label: 'ANZ: LMI waiver for accountants (PDF)', url: 'https://www.anz.com.au/content/dam/anzcomau/documents/pdf/broker-lmi-waiver-accountants.pdf' },
        { label: 'ANZ: LMI waiver for legal professionals (PDF)', url: 'https://www.anz.com.au/content/dam/anzcomau/documents/pdf/broker-lmi-waiver-legal.pdf' },
        { label: 'ANZ: home loans for business owners', url: 'https://www.anz.com.au/personal/home-loans/buying-home/home-loans-business-owners/' },
        { label: 'Westpac broker policy', url: 'https://westpac.com.au/brokers/policy' },
        { label: 'CommBank: low deposit home loan options', url: 'https://www.commbank.com.au/home-loans/low-deposit-home-loan-options.html' },
        { label: 'NAB: LMI waiver', url: 'https://www.nab.com.au/personal/home-loans/lmi/lmi-waiver' },
      ],
    },
  ],
  wizard: {
    profession: {
      prompt: 'What’s your profession?',
      options: ['doctor', 'specialist', 'dentist', 'vet', 'pharmacist', 'physio', 'optometrist', 'lawyer', 'accountant', 'actuary', 'other'],
    },
  },
  sample: () => ({
    ...emptyProfile(),
    applicants: [{ ...newApplicant(), age: 33, tenureMonths: 30, baseIncome: 210_000 }],
    firstHome: false,
    profession: 'doctor',
    savings: 115_000,
    state: 'VIC',
    price: 1_000_000,
    loan: 950_000,
    creditScore: 820,
  }),
};
