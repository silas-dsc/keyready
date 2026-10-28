import { useState, type ReactNode } from 'react';
import LvrMeter from '../components/LvrMeter';
import { ChoiceGrid, Field, MoneyInput, Segmented, Stepper, type Choice } from '../components/ui';
import { STATES } from '../engine/enums';
import { deposit, depositScheme, derivedLoan, fmtMoney, lvr, upfrontCosts } from '../engine/finance';
import { newApplicant } from '../engine/profile';
import type { Applicant, AuState, Currency, Employment, Profession, Profile, Residency } from '../engine/types';
import { SITE } from '../sites';

export type SectionId = 'you' | 'work' | 'money' | 'home' | 'credit';

export const SECTIONS: { id: SectionId; label: string }[] = [
  { id: 'you', label: 'You' },
  { id: 'work', label: 'Work' },
  { id: 'money', label: 'Money' },
  { id: 'home', label: 'Home' },
  { id: 'credit', label: 'Credit' },
];

export interface StepCtx {
  p: Profile;
  set: (fn: (p: Profile) => Profile) => void;
  /** Mark answered and move on — used by single-choice questions. */
  choose: () => void;
  answered: boolean;
}

export interface Step {
  id: string;
  section: SectionId;
  title: string;
  sub?: string;
  why: string;
  /** Single-choice questions advance on tap, so there's no Continue button to hunt for. */
  auto?: boolean;
  skippable?: string;
  skip?: (p: Profile) => boolean;
  error?: (p: Profile) => string | null;
  render: (ctx: StepCtx) => ReactNode;
  summary?: (p: Profile) => [string, string][];
}

const setA = (i: number, patch: Partial<Applicant>) => (p: Profile): Profile => ({
  ...p,
  applicants: p.applicants.map((a, j) => (j === i ? { ...a, ...patch } : a)),
});

const RESIDENCY: Choice<Residency>[] = [
  { value: 'citizen', label: 'Australian citizen', icon: '🇦🇺' },
  { value: 'permanent_resident', label: 'Permanent resident', icon: '🏡' },
  { value: 'nz_citizen', label: 'New Zealand citizen', icon: '🇳🇿' },
  { value: 'awaiting_pr', label: 'Applied for permanent residency', icon: '⏳' },
  { value: 'temporary_visa', label: 'Temporary visa holder', icon: '🛂' },
  { value: 'other', label: 'Something else', icon: '🌏' },
];

const EMPLOYMENT: Choice<Employment>[] = [
  { value: 'full_time', label: 'Full-time', hint: 'Permanent, salary or wages', icon: '💼' },
  { value: 'part_time', label: 'Part-time', hint: 'Permanent, fewer hours', icon: '🕒' },
  { value: 'casual', label: 'Casual', icon: '📅' },
  { value: 'contractor', label: 'Contractor', hint: 'Fixed-term or day rate', icon: '📝' },
  { value: 'self_employed', label: 'Self-employed', hint: 'Sole trader, company or trust', icon: '🧰' },
  { value: 'not_working', label: 'Not working right now', icon: '🌱' },
  { value: 'retired', label: 'Retired', icon: '⛱️' },
];

const TENURE: Choice<string>[] = [
  { value: '1', label: 'Less than 3 months' },
  { value: '4', label: '3 to 5 months' },
  { value: '8', label: '6 to 11 months' },
  { value: '18', label: '1 to 2 years' },
  { value: '30', label: '2 to 3 years' },
  { value: '48', label: 'More than 3 years' },
];

export const PROFESSION_LABEL: Record<Profession, string> = {
  doctor: 'Doctor (GP or hospital)', specialist: 'Medical specialist', dentist: 'Dentist', vet: 'Veterinarian',
  pharmacist: 'Pharmacist', physio: 'Physiotherapist', optometrist: 'Optometrist', psychologist: 'Psychologist',
  nurse: 'Nurse', midwife: 'Midwife', allied_health: 'Other allied health',
  lawyer: 'Lawyer', accountant: 'Accountant', actuary: 'Actuary', engineer: 'Engineer', other: 'Something else',
};

const STATE_CHOICES: Choice<AuState>[] = STATES.map(s => ({ value: s, label: s }));

const who = (p: Profile, i: number) => (p.mode === 'joint' ? (i === 0 ? 'you' : 'your co-borrower') : 'you');
const Who = (p: Profile, i: number) => (p.mode === 'joint' && i === 1 ? 'Your co-borrower' : 'You');
const lbl = <T extends string>(opts: Choice<T>[], v: T) => opts.find(o => o.value === v)?.label ?? '';

const noIncome = (a: Applicant) => a.employment === 'not_working';

function IncomeStep({ ctx, i }: { ctx: StepCtx; i: number }) {
  const a = ctx.p.applicants[i];
  const [freq, setFreq] = useState<'year' | 'month' | 'fortnight' | 'week'>('year');
  const per = { year: 1, month: 12, fortnight: 26, week: 52 }[freq];
  const shown = Math.round(a.baseIncome / per);
  return (
    <div className="space-y-5">
      <Segmented
        label="Pay frequency"
        value={freq}
        onChange={setFreq}
        options={[{ value: 'year', label: 'Per year' }, { value: 'month', label: 'Per month' }, { value: 'fortnight', label: 'Per fortnight' }, { value: 'week', label: 'Per week' }]}
      />
      <Field label={`Base pay before tax, ${freq === 'year' ? 'per year' : `per ${freq}`}`} hint={freq !== 'year' && a.baseIncome ? `That's about ${fmtMoney(a.baseIncome)} a year.` : 'Leave out super. Overtime and bonuses come next.'}>
        {id => <MoneyInput id={id} big autoFocus value={shown} onChange={n => ctx.set(setA(i, { baseIncome: n * per }))} placeholder={freq === 'year' ? '95,000' : ''} />}
      </Field>
    </div>
  );
}

function PriceStep({ ctx }: { ctx: StepCtx }) {
  const { p, set } = ctx;
  const scheme = depositScheme(p);
  const costs = upfrontCosts(p);
  const funds = p.savings + p.gift;
  const fill = () => set(q => ({ ...q, loan: derivedLoan(q) }));
  return (
    <div className="space-y-5">
      <Field label="Roughly what price are you looking at?" hint="A ballpark is fine. You can play with this on your report.">
        {id => <MoneyInput id={id} big autoFocus value={p.price} onChange={n => set(q => ({ ...q, price: n }))} placeholder="650,000" />}
      </Field>
      <Field
        label="How much do you want to borrow?"
        hint={
          p.price > 0 && funds > 0 ? (
            <button type="button" onClick={fill} className="font-semibold text-go underline underline-offset-2">
              Work it out from my savings ({fmtMoney(funds)} less ~{fmtMoney(costs.total)} costs)
            </button>
          ) : 'The price less your deposit.'
        }
      >
        {id => <MoneyInput id={id} big value={p.loan} onChange={n => set(q => ({ ...q, loan: n }))} placeholder="520,000" />}
      </Field>
      <div className="rounded-2xl bg-card p-5 ring-1 ring-line">
        <LvrMeter lvr={lvr(p)} schemeEligible={scheme.eligible} />
        {p.price > 0 && p.loan > 0 && (
          <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <div><dt className="text-muted">Deposit</dt><dd className="font-bold">{fmtMoney(deposit(p))}</dd>{costs.fhog > 0 && <dd className="text-xs text-go">+ {fmtMoney(costs.fhog)} first home grant</dd>}</div>
            <div>
              <dt className="text-muted">Stamp duty (est.)</dt>
              <dd className="font-bold">{costs.stampDuty === 0 ? '$0 🎉' : fmtMoney(costs.stampDuty)}</dd>
              {costs.concession && costs.fhbConcession && <dd className="text-xs text-go">{costs.concession}</dd>}
            </div>
          </dl>
        )}
      </div>
    </div>
  );
}

function applicantSteps(i: number): Step[] {
  const sfx = `-${i}`;
  return [
    {
      id: `age${sfx}`,
      section: 'you',
      title: i === 0 ? 'How old are you?' : 'How old is your co-borrower?',
      why: 'Age sets how long a loan term a lender will offer, since they want it repaid around retirement.',
      error: p => (p.applicants[i].age < 18 ? 'Borrowers need to be 18 or over.' : p.applicants[i].age > 90 ? 'Please check the age.' : null),
      render: ({ p, set }) => (
        <Field label="Age in years">
          {id => (
            <input
              id={id}
              type="number"
              inputMode="numeric"
              autoFocus
              min={18}
              max={90}
              value={p.applicants[i].age || ''}
              onChange={e => set(setA(i, { age: Math.min(120, Number(e.target.value.slice(0, 3))) }))}
              placeholder="32"
              className="w-40 rounded-2xl border-2 border-line bg-card px-4 py-3 text-3xl font-semibold outline-none focus:border-ink"
            />
          )}
        </Field>
      ),
      summary: p => [[i ? 'Co-borrower age' : 'Age', String(p.applicants[i].age)]],
    },
    {
      id: `residency${sfx}`,
      section: 'you',
      title: i === 0 ? "What's your residency status?" : "What's their residency status?",
      why: "It's lender policy, not ours: many banks limit or decline temporary visa holders, and government schemes need citizenship or PR.",
      auto: true,
      render: ({ p, set, choose, answered }) => (
        <ChoiceGrid label="Residency" options={RESIDENCY} value={answered ? p.applicants[i].residency : null} onChange={v => { set(setA(i, { residency: v })); choose(); }} />
      ),
      summary: p => [[i ? 'Co-borrower residency' : 'Residency', lbl(RESIDENCY, p.applicants[i].residency)]],
    },
    {
      id: `employment${sfx}`,
      section: 'work',
      title: i === 0 ? 'How do you earn your income?' : 'How does your co-borrower earn?',
      sub: 'More than one job? Pick the one that pays most.',
      why: 'Lenders treat a salaried employee, a casual and a business owner very differently, mostly in how long they want to see you doing it.',
      auto: true,
      render: ({ p, set, choose, answered }) => (
        <ChoiceGrid label="Employment type" options={EMPLOYMENT} value={answered ? p.applicants[i].employment : null} onChange={v => { set(setA(i, { employment: v, ...(v === 'not_working' ? { baseIncome: 0, tenureMonths: 0 } : {}) })); choose(); }} />
      ),
      summary: p => [[i ? 'Co-borrower work' : 'Work', lbl(EMPLOYMENT, p.applicants[i].employment)]],
    },
    {
      id: `tenure${sfx}`,
      section: 'work',
      title: '',
      why: 'Most lenders want 3–6 months in a permanent role, 6–12 months for casuals, and 1–2 years of tax returns for the self-employed.',
      auto: true,
      skip: p => ['not_working', 'retired'].includes(p.applicants[i].employment),
      render: ({ p, set, choose, answered }) => (
        <ChoiceGrid label="Time in role" options={TENURE} value={answered ? String(p.applicants[i].tenureMonths) : null} onChange={v => { set(setA(i, { tenureMonths: Number(v) })); choose(); }} />
      ),
      summary: p => [['Time in role', lbl(TENURE, String(p.applicants[i].tenureMonths))]],
    },
    {
      id: `income${sfx}`,
      section: 'work',
      title: i === 0 ? 'What do you earn?' : 'What does your co-borrower earn?',
      sub: 'Use whatever pay cycle is easiest and we’ll convert it.',
      why: 'Your income is the single biggest driver of how much a lender will let you borrow.',
      skip: p => noIncome(p.applicants[i]),
      error: p => (p.applicants[i].baseIncome < 1_000 ? 'Add your income before tax. A rough figure is fine.' : null),
      render: ctx => <IncomeStep ctx={ctx} i={i} />,
      summary: p => [[i ? 'Co-borrower income' : 'Income', fmtMoney(p.applicants[i].baseIncome)]],
    },
    {
      id: `extras${sfx}`,
      section: 'work',
      title: 'Any overtime, bonuses or allowances?',
      sub: 'Yearly amounts. Skip if none.',
      why: 'Lenders usually count only 50–100% of variable pay, so we keep it separate to match each lender accurately.',
      skippable: 'None of these',
      skip: p => noIncome(p.applicants[i]) || ['self_employed', 'retired'].includes(p.applicants[i].employment),
      render: ({ p, set }) => {
        const a = p.applicants[i];
        return (
          <div className="grid gap-4 sm:grid-cols-2">
            {(['overtime', 'allowances', 'bonus', 'commission'] as const).map(k => (
              <Field key={k} label={k[0].toUpperCase() + k.slice(1)}>
                {id => <MoneyInput id={id} value={a[k]} onChange={n => set(setA(i, { [k]: n }))} />}
              </Field>
            ))}
          </div>
        );
      },
      summary: p => {
        const a = p.applicants[i];
        const t = a.overtime + a.allowances + a.bonus + a.commission;
        return t ? [['Extra pay', fmtMoney(t)]] : [];
      },
    },
  ];
}

export function buildSteps(p: Profile): Step[] {
  const steps: Step[] = [
    {
      id: 'mode',
      section: 'you',
      title: 'Are you buying on your own, or with someone?',
      why: 'Banks combine incomes and living costs for joint borrowers, and two incomes usually means more borrowing power.',
      auto: true,
      render: ({ p, set, choose, answered }) => (
        <ChoiceGrid
          label="Applicants"
          options={[
            { value: 'solo', label: 'Just me', hint: 'Single borrower', icon: '🙋' },
            { value: 'joint', label: 'With someone', hint: 'Partner, friend or family', icon: '👫' },
          ]}
          value={answered ? p.mode : null}
          onChange={v => {
            set(q => ({
              ...q,
              mode: v,
              applicants: v === 'joint' ? [q.applicants[0], q.applicants[1] ?? newApplicant()] : [q.applicants[0]],
              household: v === 'joint' && q.household === 'single' ? 'couple' : q.household,
            }));
            choose();
          }}
        />
      ),
      summary: p => [['Buying', p.mode === 'joint' ? 'Together' : 'On my own']],
    },
    {
      id: 'firstHome',
      section: 'you',
      title: p.mode === 'joint' ? 'Will this be your first home?' : 'Is this your first home?',
      sub: 'You haven’t owned property in Australia before.',
      why: 'First home buyers can get stamp duty concessions and the government’s 5% Deposit Scheme, which removes mortgage insurance.',
      auto: true,
      render: ({ p, set, choose, answered }) => (
        <ChoiceGrid
          label="First home"
          options={[
            { value: 'yes', label: 'Yes, first home', icon: '🔑' },
            { value: 'no', label: 'No, I’ve owned before', icon: '🏘️' },
          ]}
          value={answered ? (p.firstHome ? 'yes' : 'no') : null}
          onChange={v => { set(q => ({ ...q, firstHome: v === 'yes', ownsProperty: v === 'yes' ? false : q.ownsProperty })); choose(); }}
        />
      ),
      summary: p => [['First home', p.firstHome ? 'Yes' : 'No']],
    },
    ...p.applicants.flatMap((_, i) => applicantSteps(i).filter(s => s.section === 'you')),
    ...(SITE.wizard.expat
      ? ([
          {
            id: 'overseas',
            section: 'you',
            title: p.mode === 'joint' ? 'Where do you live right now?' : 'Where do you live right now?',
            sub: 'Most big banks won’t lend to borrowers who live overseas. This is the single biggest filter.',
            why: 'Lenders treat Australians living abroad very differently: many decline outright, and the rest cap the LVR and haircut foreign income.',
            auto: true,
            render: ({ p, set, choose, answered }) => (
              <ChoiceGrid
                label="Where you live"
                options={[{ value: 'au', label: 'In Australia', icon: '🇦🇺' }, { value: 'overseas', label: 'Overseas', hint: 'Buying back home', icon: '✈️' }]}
                value={answered ? (p.livesOverseas ? 'overseas' : 'au') : null}
                onChange={v => { set(q => ({ ...q, livesOverseas: v === 'overseas' })); choose(); }}
              />
            ),
            summary: p => [['Living', p.livesOverseas ? 'Overseas' : 'In Australia']],
          },
          {
            id: 'currency',
            section: 'you',
            title: 'What currency are you paid in?',
            why: 'Lenders count only part of foreign-currency income (often 80%) and some only accept certain currencies.',
            auto: true,
            render: ({ p, set, choose, answered }) => (
              <ChoiceGrid
                label="Income currency"
                cols={4}
                options={(['AUD', 'USD', 'GBP', 'EUR', 'SGD', 'HKD', 'NZD', 'AED', 'CAD', 'JPY', 'CNY', 'other'] as Currency[]).map(c => ({ value: c, label: c === 'other' ? 'Other' : c }))}
                value={answered ? p.incomeCurrency : null}
                onChange={v => { set(q => ({ ...q, incomeCurrency: v })); choose(); }}
              />
            ),
            summary: p => [['Paid in', p.incomeCurrency]],
          },
        ] satisfies Step[])
      : []),
    ...p.applicants.flatMap((_, i) =>
      applicantSteps(i)
        .filter(s => s.section === 'work')
        .map(s => (s.id.startsWith('tenure') ? { ...s, title: tenureTitle(p, i) } : s)),
    ),
    ...(SITE.wizard.lowDoc && p.applicants[0]?.employment === 'self_employed'
      ? [{
          id: 'lowdoc',
          section: 'work' as const,
          title: 'Have you lodged tax returns for the last two years?',
          sub: 'For the business income you’d use to borrow.',
          why: 'Banks want two years of tax returns from the self-employed. Without them, specialist lenders offer alt-doc (low-doc) loans using BAS, business bank statements or an accountant’s letter, usually at a lower LVR and a higher rate.',
          auto: true,
          render: ({ p, set, choose, answered }: StepCtx) => (
            <ChoiceGrid
              label="Tax returns"
              options={[
                { value: 'full', label: 'Yes, two years lodged', icon: '📑' },
                { value: 'alt', label: 'Not yet', hint: 'I have BAS or an accountant’s letter', icon: '🧾' },
              ]}
              value={answered ? (p.lowDoc ? 'alt' : 'full') : null}
              onChange={v => { set(q => ({ ...q, lowDoc: v === 'alt' })); choose(); }}
            />
          ),
          summary: (p: Profile) => [['Documents', p.lowDoc ? 'Alt-doc (no 2 yrs returns)' : 'Full-doc'] as [string, string]],
        } satisfies Step]
      : []),
    ...(SITE.wizard.profession
      ? [{
          id: 'profession',
          section: 'work' as const,
          title: SITE.wizard.profession.prompt,
          sub: 'Some lenders waive mortgage insurance or offer special terms for particular professions.',
          why: 'Profession-specific policies, like LMI waivers for medical professionals, can save tens of thousands, but each lender’s list of eligible professions is different.',
          auto: true,
          render: ({ p, set, choose, answered }: StepCtx) => (
            <ChoiceGrid
              label="Profession"
              options={SITE.wizard.profession!.options.map(v => ({ value: v, label: PROFESSION_LABEL[v] }))}
              value={answered ? (p.profession ?? 'other') : null}
              onChange={v => { set(q => ({ ...q, profession: v === 'other' ? null : v })); choose(); }}
            />
          ),
          summary: (p: Profile) => [['Profession', p.profession ? PROFESSION_LABEL[p.profession] : 'Not listed'] as [string, string]],
        } satisfies Step]
      : []),
    {
      id: 'savings',
      section: 'money',
      title: p.mode === 'joint' ? 'How much have you saved between you?' : 'How much have you saved?',
      sub: 'Cash and offset balances you could put toward the purchase.',
      why: 'Your savings cover the deposit plus stamp duty and fees. Lenders also like to see some of it saved by you over time.',
      render: ({ p, set }) => (
        <div className="space-y-5">
          <Field label="Savings">{id => <MoneyInput id={id} big autoFocus value={p.savings} onChange={n => set(q => ({ ...q, savings: n }))} placeholder="80,000" />}</Field>
          <Field label="Gift from family" optional hint="If the Bank of Mum and Dad is helping. Lenders count it differently to savings.">
            {id => <MoneyInput id={id} value={p.gift} onChange={n => set(q => ({ ...q, gift: n }))} />}
          </Field>
        </div>
      ),
      summary: p => [['Savings', fmtMoney(p.savings)], ...(p.gift ? [['Gift', fmtMoney(p.gift)] as [string, string]] : [])],
    },
    {
      id: 'debts',
      section: 'money',
      title: 'Any debts lenders will count?',
      sub: 'Leave blank whatever doesn’t apply.',
      why: 'Lenders count your full credit card limit as debt, even if you pay it off every month. It’s one of the most common surprises.',
      skippable: 'No debts',
      render: ({ p, set }) => (
        <div className="grid gap-4">
          <Field label="Credit card limits (total)" hint="The limit, not the balance.">{id => <MoneyInput id={id} value={p.cardLimits} onChange={n => set(q => ({ ...q, cardLimits: n }))} />}</Field>
          <Field label="Personal & car loans (balance)">{id => <MoneyInput id={id} value={p.personalLoans} onChange={n => set(q => ({ ...q, personalLoans: n }))} />}</Field>
          <Field label="HECS/HELP balance">{id => <MoneyInput id={id} value={p.hecs} onChange={n => set(q => ({ ...q, hecs: n }))} />}</Field>
        </div>
      ),
      summary: p => {
        const t = p.cardLimits + p.personalLoans + p.hecs;
        return [['Debts & limits', t ? fmtMoney(t) : 'None']];
      },
    },
    {
      id: 'household',
      section: 'money',
      title: 'Who’s in your household?',
      why: 'Lenders estimate your living costs from household size using a benchmark (HEM), so dependants matter more than your actual spending.',
      render: ({ p, set }) => (
        <div className="space-y-6">
          <ChoiceGrid
            label="Household"
            cols={2}
            options={[
              { value: 'single', label: 'Just me', icon: '🧍' },
              { value: 'couple', label: 'Couple', icon: '🧑‍🤝‍🧑' },
              { value: 'family', label: 'Family with kids', icon: '👨‍👩‍👧' },
              { value: 'sharing', label: 'Sharing with others', icon: '🏠' },
            ]}
            value={p.household}
            onChange={v => set(q => ({ ...q, household: v, dependants: v === 'family' && q.dependants === 0 ? 1 : v === 'family' ? q.dependants : 0 }))}
          />
          {p.household === 'family' && (
            <Field label="How many dependants?" hint="Kids or anyone else you financially support.">
              {() => <Stepper label="dependants" value={p.dependants} min={1} onChange={n => set(q => ({ ...q, dependants: n }))} />}
            </Field>
          )}
        </div>
      ),
      summary: p => [['Household', p.household === 'family' ? `Family, ${p.dependants} dependant${p.dependants > 1 ? 's' : ''}` : p.household[0].toUpperCase() + p.household.slice(1)]],
    },
    {
      id: 'otherIncome',
      section: 'money',
      title: 'Any other regular income?',
      sub: 'Yearly amounts. Optional, but it can lift your borrowing power.',
      why: 'Family Tax Benefit, child support and rent from a property you own can all count toward serviceability.',
      skippable: 'Skip, I have none',
      render: ({ p, set }) => (
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Family Tax Benefit">{id => <MoneyInput id={id} value={p.ftb} onChange={n => set(q => ({ ...q, ftb: n }))} />}</Field>
          <Field label="Child support">{id => <MoneyInput id={id} value={p.childSupport} onChange={n => set(q => ({ ...q, childSupport: n }))} />}</Field>
          <Field label="Rental income">{id => <MoneyInput id={id} value={p.rentalIncome} onChange={n => set(q => ({ ...q, rentalIncome: n }))} />}</Field>
        </div>
      ),
    },
    {
      id: 'purpose',
      section: 'home',
      title: 'What’s the plan for the property?',
      why: 'Investment loans have tighter limits and higher rates; construction loans are offered by fewer lenders.',
      auto: true,
      render: ({ p, set, choose, answered }) => (
        <ChoiceGrid
          label="Purpose"
          options={[
            { value: 'owner', label: 'Live in it', hint: 'Owner-occupied', icon: '🏡' },
            { value: 'investment', label: 'Rent it out', hint: 'Investment', icon: '📈' },
            { value: 'construction', label: 'Build a new home', hint: 'Construction loan', icon: '🏗️' },
          ]}
          value={answered ? p.purpose : null}
          onChange={v => { set(q => ({ ...q, purpose: v, condition: v === 'construction' ? 'new' : q.condition })); choose(); }}
        />
      ),
      summary: p => [['Plan', { owner: 'Live in it', investment: 'Investment', construction: 'Build' }[p.purpose]]],
    },
    {
      id: 'dwelling',
      section: 'home',
      title: 'What kind of place?',
      sub: 'Still looking? Pick the most likely.',
      why: 'Some lenders cap the LVR on apartments and vacant land, and new homes can unlock stamp duty concessions.',
      render: ({ p, set }) => (
        <div className="space-y-6">
          <ChoiceGrid
            label="Property type"
            cols={2}
            options={[
              { value: 'house', label: 'House or townhouse', icon: '🏠' },
              { value: 'apartment', label: 'Apartment', icon: '🏢' },
              { value: 'house_land', label: 'House & land package', icon: '🧱' },
              { value: 'land', label: 'Vacant land', icon: '🌾' },
            ]}
            value={p.dwelling}
            onChange={v => set(q => ({ ...q, dwelling: v }))}
          />
          {p.purpose !== 'construction' && (
            <Field label="New or established?">
              {() => (
                <Segmented
                  label="New or established"
                  value={p.condition}
                  onChange={v => set(q => ({ ...q, condition: v }))}
                  options={[{ value: 'existing', label: 'Established' }, { value: 'new', label: 'Brand new' }, { value: 'unsure', label: 'Not sure yet' }]}
                />
              )}
            </Field>
          )}
        </div>
      ),
      summary: p => [['Property', { house: 'House', apartment: 'Apartment', house_land: 'House & land', land: 'Land', other: 'Other' }[p.dwelling]]],
    },
    {
      id: 'where',
      section: 'home',
      title: 'Where are you buying?',
      why: 'Stamp duty, first home concessions and the 5% Deposit Scheme price caps are all set by state and region.',
      render: ({ p, set }) => (
        <div className="space-y-6">
          <ChoiceGrid label="State" cols={4} options={STATE_CHOICES} value={p.state} onChange={v => set(q => ({ ...q, state: v }))} />
          <Field label="Which part of the state?" hint="Regional centres include places like Newcastle, Geelong and the Gold Coast.">
            {() => (
              <Segmented
                label="Location"
                value={p.location}
                onChange={v => set(q => ({ ...q, location: v }))}
                options={[{ value: 'capital', label: 'Capital or regional centre' }, { value: 'regional', label: 'Elsewhere' }, { value: 'unsure', label: 'Not sure' }]}
              />
            )}
          </Field>
        </div>
      ),
      summary: p => [['Buying in', p.state]],
    },
    {
      id: 'price',
      section: 'home',
      title: 'Let’s talk numbers.',
      why: 'Your loan-to-value ratio (LVR) decides which lenders can say yes, and whether you’ll pay mortgage insurance.',
      error: p => (p.price < 50_000 ? 'Add a rough purchase price.' : p.loan <= 0 ? 'Add how much you want to borrow.' : p.loan > p.price * 1.05 ? 'The loan is more than the price. Check the numbers.' : null),
      render: ctx => <PriceStep ctx={ctx} />,
      summary: p => [['Price', fmtMoney(p.price)], ['Loan', fmtMoney(p.loan)]],
    },
    {
      id: 'defaults',
      section: 'credit',
      title: 'Any defaults on your credit file in the last few years?',
      sub: 'No judgement. Being upfront means we only point you to lenders who can say yes.',
      why: 'A default is a debt a lender has listed as unpaid. Mainstream banks usually decline them, but specialist lenders can help.',
      render: ({ p, set }) => (
        <div className="space-y-6">
          <ChoiceGrid
            label="Defaults"
            cols={3}
            options={[
              { value: 'no', label: 'No, all clear', icon: '✅' },
              { value: 'yes', label: 'Yes', icon: '⚠️' },
              { value: 'unsure', label: 'Not sure', icon: '🤔' },
            ]}
            value={p.defaults}
            onChange={v => set(q => ({ ...q, defaults: v }))}
          />
          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-line bg-card p-4">
            <input
              type="checkbox"
              className="h-5 w-5 accent-[#0e3b3a]"
              checked={p.bankruptcyYears !== null}
              onChange={e => set(q => ({ ...q, bankruptcyYears: e.target.checked ? 3 : null }))}
            />
            <span className="font-semibold">I’ve been bankrupt before</span>
          </label>
          {p.bankruptcyYears !== null && (
            <Field label="Years since discharge">
              {() => <Stepper label="years" value={p.bankruptcyYears!} max={20} onChange={n => set(q => ({ ...q, bankruptcyYears: n }))} />}
            </Field>
          )}
        </div>
      ),
      summary: p => [['Defaults', { no: 'None', yes: 'Yes', unsure: 'Not sure' }[p.defaults]]],
    },
    {
      id: 'score',
      section: 'credit',
      title: 'Do you know your credit score?',
      sub: 'You can get it free from Equifax, Experian or illion. Totally optional.',
      why: 'Many lenders have a minimum score. Without it, we’ll flag where your score could matter.',
      skippable: 'I don’t know it',
      render: ({ p, set }) => (
        <div className="space-y-4">
          <div className="flex items-end gap-4">
            <span className="text-5xl font-extrabold tabular-nums">{p.creditScore ?? '—'}</span>
            <span className="pb-2 text-muted">out of 1,200</span>
          </div>
          <input
            type="range"
            min={300}
            max={1200}
            step={10}
            aria-label="Credit score"
            value={p.creditScore ?? 750}
            onChange={e => set(q => ({ ...q, creditScore: Number(e.target.value) }))}
            className="w-full"
          />
          <div className="flex justify-between text-xs font-semibold text-muted"><span>Below average</span><span>Good</span><span>Excellent</span></div>
        </div>
      ),
      summary: p => (p.creditScore ? [['Credit score', String(p.creditScore)]] : []),
    },
  ];
  return steps;
}

function tenureTitle(p: Profile, i: number) {
  const a = p.applicants[i];
  if (a.employment === 'self_employed') return `How long ${i && p.mode === 'joint' ? 'has your co-borrower' : 'have you'} had the business (ABN)?`;
  return `How long ${Who(p, i) === 'You' ? 'have you' : 'have they'} been with ${who(p, i) === 'you' ? 'your' : 'their'} current employer?`;
}
