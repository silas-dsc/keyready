// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emptyProfile, newApplicant } from '../engine/profile';
import type { Applicant, Profile } from '../engine/types';
import { SITE } from '../sites';
import { buildSteps, PROFESSION_LABEL, SECTIONS, type Step } from './steps';

const baseWizard = SITE.wizard;
afterEach(() => {
  SITE.wizard = baseWizard;
});

const prof = (over: Partial<Profile> = {}, a: Partial<Applicant>[] = [{}]): Profile => ({
  ...emptyProfile(),
  ...over,
  applicants: a.map(x => ({ ...newApplicant(), ...x })),
});
const joint = (over: Partial<Profile> = {}, a: Partial<Applicant>[] = [{}, {}]) => prof({ mode: 'joint', household: 'couple', ...over }, a);

const step = (p: Profile, id: string): Step => {
  const s = buildSteps(p).find(x => x.id === id);
  if (!s) throw new Error(`no step ${id}`);
  return s;
};
const ids = (p: Profile) => buildSteps(p).filter(s => !s.skip?.(p)).map(s => s.id);
const summary = (p: Profile, id: string) => step(p, id).summary?.(p);

/** Renders one step's UI against live profile state, the way the Check page does. */
function mount(id: string, initial: Profile, answered = false) {
  const choose = vi.fn();
  let latest = initial;
  function Harness() {
    const [p, setP] = useState(initial);
    latest = p;
    return <>{step(p, id).render({ p, set: fn => setP(fn), choose, answered })}</>;
  }
  const r = render(<Harness />);
  return { ...r, choose, profile: () => latest };
}

describe('buildSteps: flow', () => {
  it('has the five sections in order', () => {
    expect(SECTIONS.map(s => s.label)).toEqual(['You', 'Work', 'Money', 'Home', 'Credit']);
  });

  it('builds the solo core flow', () => {
    expect(ids(prof())).toEqual([
      'mode', 'firstHome', 'age-0', 'residency-0', 'employment-0', 'tenure-0', 'income-0', 'extras-0',
      'savings', 'debts', 'household', 'otherIncome', 'purpose', 'dwelling', 'where', 'price', 'defaults', 'score',
    ]);
  });

  it('adds co-borrower questions for joint applications', () => {
    const list = ids(joint());
    expect(list.slice(0, 6)).toEqual(['mode', 'firstHome', 'age-0', 'residency-0', 'age-1', 'residency-1']);
    expect(list).toContain('income-1');
    expect(list).toContain('extras-1');
  });

  it('skips income questions for people not working, retired or self-employed', () => {
    expect(ids(prof({}, [{ employment: 'not_working' }]))).not.toEqual(expect.arrayContaining(['tenure-0']));
    const nw = ids(prof({}, [{ employment: 'not_working' }]));
    expect(nw).not.toContain('income-0');
    expect(nw).not.toContain('extras-0');
    const ret = ids(prof({}, [{ employment: 'retired' }]));
    expect(ret).not.toContain('tenure-0');
    expect(ret).toContain('income-0');
    expect(ret).not.toContain('extras-0');
    const se = ids(prof({}, [{ employment: 'self_employed' }]));
    expect(se).toContain('tenure-0');
    expect(se).not.toContain('extras-0');
  });

  it('adds the expat questions when the site asks for them', () => {
    SITE.wizard = { expat: true };
    const list = ids(prof());
    expect(list.indexOf('overseas')).toBe(list.indexOf('residency-0') + 1);
    expect(list).toContain('currency');
    expect(step(joint(), 'overseas').title).toBe('Where do you live right now?');
    expect(step(prof(), 'overseas').title).toBe('Where do you live right now?');
  });

  it('asks about tax returns only for a self-employed main borrower on the low-doc site', () => {
    SITE.wizard = { lowDoc: true };
    expect(ids(prof())).not.toContain('lowdoc');
    expect(ids(prof({}, [{ employment: 'self_employed' }]))).toContain('lowdoc');
    SITE.wizard = {};
    expect(ids(prof({}, [{ employment: 'self_employed' }]))).not.toContain('lowdoc');
  });

  it('asks for a profession when the site lists them', () => {
    SITE.wizard = { profession: { prompt: 'What’s your role?', options: ['nurse', 'other'] } };
    expect(step(prof(), 'profession').title).toBe('What’s your role?');
  });
});

describe('titles that depend on who is buying', () => {
  it('words the first-home and savings questions for one or two people', () => {
    expect(step(prof(), 'firstHome').title).toBe('Is this your first home?');
    expect(step(joint(), 'firstHome').title).toBe('Will this be your first home?');
    expect(step(prof(), 'savings').title).toBe('How much have you saved?');
    expect(step(joint(), 'savings').title).toBe('How much have you saved between you?');
  });

  it('words applicant questions for the co-borrower', () => {
    const p = joint();
    expect(step(p, 'age-0').title).toBe('How old are you?');
    expect(step(p, 'age-1').title).toBe('How old is your co-borrower?');
    expect(step(p, 'residency-0').title).toBe("What's your residency status?");
    expect(step(p, 'residency-1').title).toBe("What's their residency status?");
    expect(step(p, 'employment-0').title).toBe('How do you earn your income?');
    expect(step(p, 'employment-1').title).toBe('How does your co-borrower earn?');
    expect(step(p, 'income-0').title).toBe('What do you earn?');
    expect(step(p, 'income-1').title).toBe('What does your co-borrower earn?');
  });

  it('words the time-in-role question by employment and borrower', () => {
    expect(step(prof(), 'tenure-0').title).toBe('How long have you been with your current employer?');
    const j = joint({}, [{}, {}]);
    expect(step(j, 'tenure-0').title).toBe('How long have you been with your current employer?');
    expect(step(j, 'tenure-1').title).toBe('How long have they been with their current employer?');
    const se = joint({}, [{ employment: 'self_employed' }, { employment: 'self_employed' }]);
    expect(step(se, 'tenure-0').title).toBe('How long have you had the business (ABN)?');
    expect(step(se, 'tenure-1').title).toBe('How long has your co-borrower had the business (ABN)?');
  });
});

describe('validation', () => {
  it('checks age', () => {
    const err = (age: number) => step(prof({}, [{ age }]), 'age-0').error!(prof({}, [{ age }]));
    expect(err(17)).toBe('Borrowers need to be 18 or over.');
    expect(err(91)).toBe('Please check the age.');
    expect(err(40)).toBeNull();
  });

  it('checks income', () => {
    const s = step(prof(), 'income-0');
    expect(s.error!(prof({}, [{ baseIncome: 500 }]))).toBe('Add your income before tax. A rough figure is fine.');
    expect(s.error!(prof({}, [{ baseIncome: 80_000 }]))).toBeNull();
  });

  it('checks the price and loan', () => {
    const s = step(prof(), 'price');
    expect(s.error!(prof({ price: 10_000 }))).toBe('Add a rough purchase price.');
    expect(s.error!(prof({ price: 600_000 }))).toBe('Add how much you want to borrow.');
    expect(s.error!(prof({ price: 600_000, loan: 700_000 }))).toBe('The loan is more than the price. Check the numbers.');
    expect(s.error!(prof({ price: 600_000, loan: 480_000 }))).toBeNull();
  });
});

describe('summaries', () => {
  it('summarises each answer for the sidebar', () => {
    const p = prof({ savings: 50_000, price: 600_000, loan: 480_000, state: 'VIC', purpose: 'investment', dwelling: 'house_land', defaults: 'unsure', creditScore: 800 },
      [{ age: 30, residency: 'nz_citizen', employment: 'casual', tenureMonths: 18, baseIncome: 90_000, bonus: 5_000, overtime: 1_000 }]);
    expect(summary(p, 'mode')).toEqual([['Buying', 'On my own']]);
    expect(summary(p, 'firstHome')).toEqual([['First home', 'Yes']]);
    expect(summary(p, 'age-0')).toEqual([['Age', '30']]);
    expect(summary(p, 'residency-0')).toEqual([['Residency', 'New Zealand citizen']]);
    expect(summary(p, 'employment-0')).toEqual([['Work', 'Casual']]);
    expect(summary(p, 'tenure-0')).toEqual([['Time in role', '1 to 2 years']]);
    expect(summary(p, 'income-0')).toEqual([['Income', '$90,000']]);
    expect(summary(p, 'extras-0')).toEqual([['Extra pay', '$6,000']]);
    expect(summary(p, 'savings')).toEqual([['Savings', '$50,000']]);
    expect(summary(p, 'debts')).toEqual([['Debts & limits', 'None']]);
    expect(summary(p, 'household')).toEqual([['Household', 'Single']]);
    expect(summary(p, 'otherIncome')).toBeUndefined();
    expect(summary(p, 'purpose')).toEqual([['Plan', 'Investment']]);
    expect(summary(p, 'dwelling')).toEqual([['Property', 'House & land']]);
    expect(summary(p, 'where')).toEqual([['Buying in', 'VIC']]);
    expect(summary(p, 'price')).toEqual([['Price', '$600,000'], ['Loan', '$480,000']]);
    expect(summary(p, 'defaults')).toEqual([['Defaults', 'Not sure']]);
    expect(summary(p, 'score')).toEqual([['Credit score', '800']]);
  });

  it('covers the alternative wordings', () => {
    const j = joint({ firstHome: false, gift: 20_000, cardLimits: 5_000, hecs: 10_000, household: 'family', dependants: 1, creditScore: null },
      [{}, { age: 29, residency: 'citizen', employment: 'part_time', tenureMonths: 0, baseIncome: 40_000 }]);
    expect(summary(j, 'mode')).toEqual([['Buying', 'Together']]);
    expect(summary(j, 'firstHome')).toEqual([['First home', 'No']]);
    expect(summary(j, 'age-1')).toEqual([['Co-borrower age', '29']]);
    expect(summary(j, 'residency-1')).toEqual([['Co-borrower residency', 'Australian citizen']]);
    expect(summary(j, 'employment-1')).toEqual([['Co-borrower work', 'Part-time']]);
    expect(summary(j, 'tenure-1')).toEqual([['Time in role', '']]);
    expect(summary(j, 'income-1')).toEqual([['Co-borrower income', '$40,000']]);
    expect(summary(j, 'extras-1')).toEqual([]);
    expect(summary(j, 'savings')).toEqual([['Savings', '$0'], ['Gift', '$20,000']]);
    expect(summary(j, 'debts')).toEqual([['Debts & limits', '$15,000']]);
    expect(summary(j, 'household')).toEqual([['Household', 'Family, 1 dependant']]);
    expect(summary({ ...j, dependants: 3 }, 'household')).toEqual([['Household', 'Family, 3 dependants']]);
    expect(summary(j, 'score')).toEqual([]);
    expect(summary({ ...j, purpose: 'owner', dwelling: 'apartment', defaults: 'yes' }, 'purpose')).toEqual([['Plan', 'Live in it']]);
    expect(summary({ ...j, purpose: 'construction' }, 'purpose')).toEqual([['Plan', 'Build']]);
    expect(summary({ ...j, dwelling: 'apartment' }, 'dwelling')).toEqual([['Property', 'Apartment']]);
    expect(summary({ ...j, dwelling: 'house' }, 'dwelling')).toEqual([['Property', 'House']]);
    expect(summary({ ...j, dwelling: 'land' }, 'dwelling')).toEqual([['Property', 'Land']]);
    expect(summary({ ...j, dwelling: 'other' as Profile['dwelling'] }, 'dwelling')).toEqual([['Property', 'Other']]);
    expect(summary({ ...j, defaults: 'yes' }, 'defaults')).toEqual([['Defaults', 'Yes']]);
    expect(summary({ ...j, defaults: 'no' }, 'defaults')).toEqual([['Defaults', 'None']]);
  });

  it('summarises the site-specific questions', () => {
    SITE.wizard = { expat: true, lowDoc: true, profession: { prompt: 'Job?', options: ['doctor', 'other'] } };
    const p = prof({ livesOverseas: true, incomeCurrency: 'USD', lowDoc: true, profession: 'doctor' }, [{ employment: 'self_employed' }]);
    expect(summary(p, 'overseas')).toEqual([['Living', 'Overseas']]);
    expect(summary(p, 'currency')).toEqual([['Paid in', 'USD']]);
    expect(summary(p, 'lowdoc')).toEqual([['Documents', 'Alt-doc (no 2 yrs returns)']]);
    expect(summary(p, 'profession')).toEqual([['Profession', PROFESSION_LABEL.doctor]]);
    const q = { ...p, livesOverseas: false, lowDoc: false, profession: null };
    expect(summary(q, 'overseas')).toEqual([['Living', 'In Australia']]);
    expect(summary(q, 'lowdoc')).toEqual([['Documents', 'Full-doc']]);
    expect(summary(q, 'profession')).toEqual([['Profession', 'Not listed']]);
  });
});

const radio = (name: RegExp | string) => screen.getByRole('radio', { name });

describe('single-choice steps', () => {
  it('mode: choosing joint adds a co-borrower and a couple household, then advances', async () => {
    const m = mount('mode', prof());
    expect(radio(/Just me/)).toHaveAttribute('aria-checked', 'false');
    expect(radio(/With someone/)).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(radio(/With someone/));
    expect(m.choose).toHaveBeenCalledOnce();
    expect(m.profile().mode).toBe('joint');
    expect(m.profile().applicants).toHaveLength(2);
    expect(m.profile().household).toBe('couple');
  });

  it('mode: keeps an existing co-borrower and household; going solo drops them', async () => {
    const co = { ...newApplicant(), age: 44 };
    const p = { ...joint({ household: 'family', dependants: 2 }), applicants: [newApplicant(), co] };
    const m = mount('mode', p, true);
    expect(radio(/With someone/)).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(radio(/With someone/));
    expect(m.profile().applicants[1]).toBe(co);
    expect(m.profile().household).toBe('family');
    await userEvent.click(radio(/Just me/));
    expect(m.profile().mode).toBe('solo');
    expect(m.profile().applicants).toHaveLength(1);
  });

  it('firstHome: yes clears ownsProperty, no keeps it', async () => {
    const m = mount('firstHome', prof({ firstHome: false, ownsProperty: true }), true);
    expect(radio(/No, I’ve owned before/)).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(radio(/No, I’ve owned/));
    expect(m.profile()).toMatchObject({ firstHome: false, ownsProperty: true });
    await userEvent.click(radio(/Yes, first home/));
    expect(m.profile()).toMatchObject({ firstHome: true, ownsProperty: false });
    expect(radio(/Yes, first home/)).toHaveAttribute('aria-checked', 'true');
    expect(m.choose).toHaveBeenCalledTimes(2);
  });

  it('firstHome: unanswered shows nothing selected', () => {
    mount('firstHome', prof(), false);
    expect(screen.getAllByRole('radio').map(r => r.getAttribute('aria-checked'))).toEqual(['false', 'false']);
  });

  it('residency: picks for the right applicant, with the number keys', async () => {
    const m = mount('residency-1', joint(), false);
    expect(screen.getAllByRole('radio').every(r => r.getAttribute('aria-checked') === 'false')).toBe(true);
    await userEvent.keyboard('5');
    expect(m.profile().applicants[1].residency).toBe('temporary_visa');
    expect(m.profile().applicants[0].residency).toBe('citizen');
    expect(m.choose).toHaveBeenCalled();
  });

  it('residency: shows the saved answer once answered', () => {
    mount('residency-0', prof({}, [{ residency: 'permanent_resident' }]), true);
    expect(radio(/Permanent resident/)).toHaveAttribute('aria-checked', 'true');
  });

  it('employment: not working clears income and tenure; other types keep them', async () => {
    const m = mount('employment-0', prof({}, [{ baseIncome: 90_000, tenureMonths: 30 }]), true);
    expect(radio(/Full-time/)).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(radio(/Contractor/));
    expect(m.profile().applicants[0]).toMatchObject({ employment: 'contractor', baseIncome: 90_000, tenureMonths: 30 });
    await userEvent.click(radio(/Not working right now/));
    expect(m.profile().applicants[0]).toMatchObject({ employment: 'not_working', baseIncome: 0, tenureMonths: 0 });
  });

  it('employment: unanswered shows nothing selected', () => {
    mount('employment-0', prof(), false);
    expect(radio(/Full-time/)).toHaveAttribute('aria-checked', 'false');
  });

  it('tenure: stores months for the chosen band', async () => {
    const m = mount('tenure-0', prof({}, [{ tenureMonths: 8 }]), true);
    expect(radio(/6 to 11 months/)).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(radio(/More than 3 years/));
    expect(m.profile().applicants[0].tenureMonths).toBe(48);
    expect(m.choose).toHaveBeenCalled();
  });

  it('tenure: unanswered shows nothing selected', () => {
    mount('tenure-0', prof({}, [{ tenureMonths: 8 }]), false);
    expect(radio(/6 to 11 months/)).toHaveAttribute('aria-checked', 'false');
  });

  it('purpose: construction forces a new build; others keep the condition', async () => {
    const m = mount('purpose', prof({ condition: 'existing' }), false);
    expect(radio(/Live in it/)).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(radio(/Rent it out/));
    expect(m.profile()).toMatchObject({ purpose: 'investment', condition: 'existing' });
    await userEvent.click(radio(/Build a new home/));
    expect(m.profile()).toMatchObject({ purpose: 'construction', condition: 'new' });
  });

  it('purpose: shows the saved answer once answered', () => {
    mount('purpose', prof({ purpose: 'investment' }), true);
    expect(radio(/Rent it out/)).toHaveAttribute('aria-checked', 'true');
  });
});

describe('site-specific single-choice steps', () => {
  it('overseas: records where the borrower lives', async () => {
    SITE.wizard = { expat: true };
    const m = mount('overseas', prof(), false);
    expect(radio(/In Australia/)).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(radio(/Overseas/));
    expect(m.profile().livesOverseas).toBe(true);
    await userEvent.click(radio(/In Australia/));
    expect(m.profile().livesOverseas).toBe(false);
    expect(m.choose).toHaveBeenCalledTimes(2);
  });

  it('overseas: shows the saved answer either way', () => {
    SITE.wizard = { expat: true };
    const { unmount } = mount('overseas', prof({ livesOverseas: true }), true);
    expect(radio(/Overseas/)).toHaveAttribute('aria-checked', 'true');
    unmount();
    mount('overseas', prof({ livesOverseas: false }), true);
    expect(radio(/In Australia/)).toHaveAttribute('aria-checked', 'true');
  });

  it('currency: lists currencies and records the choice', async () => {
    SITE.wizard = { expat: true };
    const m = mount('currency', prof(), true);
    expect(radio(/^AUD/)).toHaveAttribute('aria-checked', 'true');
    expect(radio(/Other/)).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(12);
    await userEvent.click(radio(/GBP/));
    expect(m.profile().incomeCurrency).toBe('GBP');
    expect(m.choose).toHaveBeenCalled();
  });

  it('currency: unanswered shows nothing selected', () => {
    SITE.wizard = { expat: true };
    mount('currency', prof(), false);
    expect(radio(/AUD/)).toHaveAttribute('aria-checked', 'false');
  });

  it('lowdoc: records whether returns are lodged', async () => {
    SITE.wizard = { lowDoc: true };
    const p = prof({}, [{ employment: 'self_employed' }]);
    const m = mount('lowdoc', p, false);
    expect(radio(/Yes, two years lodged/)).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(radio(/Not yet/));
    expect(m.profile().lowDoc).toBe(true);
    expect(m.choose).toHaveBeenCalled();
  });

  it('lowdoc: shows the saved answer either way', () => {
    SITE.wizard = { lowDoc: true };
    const { unmount } = mount('lowdoc', prof({ lowDoc: true }, [{ employment: 'self_employed' }]), true);
    expect(radio(/Not yet/)).toHaveAttribute('aria-checked', 'true');
    unmount();
    const m = mount('lowdoc', prof({ lowDoc: true }, [{ employment: 'self_employed' }]), true);
    fireEvent.click(radio(/Yes, two years lodged/));
    expect(m.profile().lowDoc).toBe(false);
    expect(radio(/Yes, two years lodged/)).toHaveAttribute('aria-checked', 'true');
  });

  it('profession: "something else" is stored as no profession', async () => {
    SITE.wizard = { profession: { prompt: 'Job?', options: ['doctor', 'dentist', 'other'] } };
    const m = mount('profession', prof({ profession: 'dentist' }), true);
    expect(radio(/Dentist/)).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(radio(/Doctor/));
    expect(m.profile().profession).toBe('doctor');
    await userEvent.click(radio(/Something else/));
    expect(m.profile().profession).toBeNull();
    expect(radio(/Something else/)).toHaveAttribute('aria-checked', 'true');
  });

  it('profession: unanswered shows nothing selected', () => {
    SITE.wizard = { profession: { prompt: 'Job?', options: ['doctor', 'other'] } };
    mount('profession', prof(), false);
    expect(radio(/Something else/)).toHaveAttribute('aria-checked', 'false');
  });
});

describe('form steps', () => {
  it('age: typing sets the age for the right applicant, capped at 120', async () => {
    const m = mount('age-1', joint({}, [{ age: 40 }, {}]));
    const input = screen.getByLabelText('Age in years');
    expect(input).toHaveValue(null);
    await userEvent.type(input, '35');
    expect(m.profile().applicants[1].age).toBe(35);
    expect(m.profile().applicants[0].age).toBe(40);
    fireEvent.change(input, { target: { value: '1500' } });
    expect(m.profile().applicants[1].age).toBe(120);
  });

  it('income: converts pay frequencies to a yearly figure', async () => {
    const m = mount('income-0', prof());
    const input = screen.getByLabelText('Base pay before tax, per year');
    expect(input).toHaveAttribute('placeholder', '95,000');
    expect(screen.getByText('Leave out super. Overtime and bonuses come next.')).toBeInTheDocument();
    await userEvent.click(radio('Per fortnight'));
    const fn = screen.getByLabelText('Base pay before tax, per fortnight');
    expect(fn).toHaveAttribute('placeholder', '');
    // No income yet, so still the generic hint.
    expect(screen.getByText('Leave out super. Overtime and bonuses come next.')).toBeInTheDocument();
    await userEvent.type(fn, '3000');
    expect(m.profile().applicants[0].baseIncome).toBe(78_000);
    expect(screen.getByText('That’s about $78,000 a year.'.replace('’', "'"))).toBeInTheDocument();
    await userEvent.click(radio('Per week'));
    expect(screen.getByLabelText('Base pay before tax, per week')).toHaveValue('1,500');
    await userEvent.click(radio('Per month'));
    expect(screen.getByLabelText('Base pay before tax, per month')).toHaveValue('6,500');
    await userEvent.click(radio('Per year'));
    expect(screen.getByLabelText('Base pay before tax, per year')).toHaveValue('78,000');
    expect(screen.getByText('Leave out super. Overtime and bonuses come next.')).toBeInTheDocument();
  });

  it('extras: each variable pay field updates its own amount', async () => {
    const m = mount('extras-0', prof());
    for (const [label, key, v] of [['Overtime', 'overtime', '1000'], ['Allowances', 'allowances', '2000'], ['Bonus', 'bonus', '3000'], ['Commission', 'commission', '4000']] as const) {
      await userEvent.type(screen.getByLabelText(label), v);
      expect(m.profile().applicants[0][key]).toBe(Number(v));
    }
  });

  it('savings: savings and gift', async () => {
    const m = mount('savings', prof());
    await userEvent.type(screen.getByLabelText(/^Savings/), '80000');
    await userEvent.type(screen.getByLabelText(/Gift from family/), '15000');
    expect(m.profile()).toMatchObject({ savings: 80_000, gift: 15_000 });
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });

  it('debts: card limits, loans and HECS', async () => {
    const m = mount('debts', prof());
    await userEvent.type(screen.getByLabelText('Credit card limits (total)'), '5000');
    await userEvent.type(screen.getByLabelText('Personal & car loans (balance)'), '7000');
    await userEvent.type(screen.getByLabelText('HECS/HELP balance'), '9000');
    expect(m.profile()).toMatchObject({ cardLimits: 5_000, personalLoans: 7_000, hecs: 9_000 });
  });

  it('otherIncome: benefits, child support and rent', async () => {
    const m = mount('otherIncome', prof());
    await userEvent.type(screen.getByLabelText('Family Tax Benefit'), '1000');
    await userEvent.type(screen.getByLabelText('Child support'), '2000');
    await userEvent.type(screen.getByLabelText('Rental income'), '3000');
    expect(m.profile()).toMatchObject({ ftb: 1_000, childSupport: 2_000, rentalIncome: 3_000 });
  });

  it('household: family asks for dependants, others reset them', async () => {
    const m = mount('household', prof());
    expect(radio(/Just me/)).toHaveAttribute('aria-checked', 'true');
    expect(screen.queryByText('How many dependants?')).not.toBeInTheDocument();
    await userEvent.click(radio(/Family with kids/));
    expect(m.profile()).toMatchObject({ household: 'family', dependants: 1 });
    expect(screen.getByText('How many dependants?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'More dependants' }));
    expect(m.profile().dependants).toBe(2);
    await userEvent.click(radio(/Family with kids/));
    expect(m.profile().dependants).toBe(2);
    await userEvent.click(screen.getByRole('button', { name: 'Fewer dependants' }));
    await userEvent.click(screen.getByRole('button', { name: 'Fewer dependants' }));
    expect(m.profile().dependants).toBe(1);
    await userEvent.click(radio(/Sharing with others/));
    expect(m.profile()).toMatchObject({ household: 'sharing', dependants: 0 });
  });

  it('dwelling: picks a type and condition; construction hides the condition', async () => {
    const m = mount('dwelling', prof());
    await userEvent.click(radio(/Apartment/));
    await userEvent.click(radio('Brand new'));
    expect(m.profile()).toMatchObject({ dwelling: 'apartment', condition: 'new' });
    expect(radio('Brand new')).toHaveAttribute('aria-checked', 'true');
    const { unmount } = m;
    unmount();
    mount('dwelling', prof({ purpose: 'construction' }));
    expect(screen.queryByText('New or established?')).not.toBeInTheDocument();
  });

  it('where: picks a state and region', async () => {
    const m = mount('where', prof());
    expect(screen.getAllByRole('radiogroup')[0]).toHaveAccessibleName('State');
    await userEvent.click(radio(/^QLD/));
    await userEvent.click(radio('Elsewhere'));
    expect(m.profile()).toMatchObject({ state: 'QLD', location: 'regional' });
  });

  it('defaults: records defaults and bankruptcy years', async () => {
    const m = mount('defaults', prof());
    expect(radio(/No, all clear/)).toHaveAttribute('aria-checked', 'true');
    await userEvent.click(radio(/Yes/));
    expect(m.profile().defaults).toBe('yes');
    expect(screen.queryByText('Years since discharge')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('checkbox', { name: 'I’ve been bankrupt before' }));
    expect(m.profile().bankruptcyYears).toBe(3);
    expect(screen.getByRole('group', { name: 'years' })).toHaveTextContent('3');
    await userEvent.click(screen.getByRole('button', { name: 'More years' }));
    expect(m.profile().bankruptcyYears).toBe(4);
    await userEvent.click(screen.getByRole('checkbox'));
    expect(m.profile().bankruptcyYears).toBeNull();
    expect(screen.queryByText('Years since discharge')).not.toBeInTheDocument();
  });

  it('score: slider starts at 750 with no score shown, then records it', () => {
    const m = mount('score', prof());
    expect(screen.getByText('—')).toBeInTheDocument();
    const slider = screen.getByRole('slider', { name: 'Credit score' });
    expect(slider).toHaveValue('750');
    fireEvent.change(slider, { target: { value: '900' } });
    expect(m.profile().creditScore).toBe(900);
    expect(screen.getByText('900')).toBeInTheDocument();
  });
});

describe('price step', () => {
  it('without savings asks for the loan directly and shows no breakdown', () => {
    mount('price', prof());
    expect(screen.getByText('The price less your deposit.')).toBeInTheDocument();
    expect(screen.getByText('Add a price and loan to see your LVR.')).toBeInTheDocument();
    expect(screen.queryByText('Deposit')).not.toBeInTheDocument();
  });

  it('works the loan out from savings and shows a first-home breakdown with a grant and $0 duty', async () => {
    const m = mount('price', prof({ savings: 60_000, gift: 10_000, state: 'NSW', condition: 'new' }, [{ age: 30 }]));
    await userEvent.type(screen.getByLabelText('Roughly what price are you looking at?'), '500000');
    expect(m.profile().price).toBe(500_000);
    const fill = screen.getByRole('button', { name: /Work it out from my savings \(\$70,000 less ~\$3,000 costs\)/ });
    await userEvent.click(fill);
    // 500k − (70k + 10k grant − 3k costs)
    expect(m.profile().loan).toBe(423_000);
    expect(screen.getByLabelText('How much do you want to borrow?')).toHaveValue('423,000');
    expect(screen.getByText('Deposit')).toBeInTheDocument();
    expect(screen.getByText('$77,000')).toBeInTheDocument();
    expect(screen.getByText('+ $10,000 first home grant')).toBeInTheDocument();
    expect(screen.getByText('$0 🎉')).toBeInTheDocument();
    expect(screen.getByText('First Home Buyers Assistance Scheme')).toBeInTheDocument();
    expect(screen.getByText('84.6%')).toBeInTheDocument();
  });

  it('shows full stamp duty with no grant or concession on a dearer established home', async () => {
    const m = mount('price', prof({ state: 'NSW', condition: 'existing' }));
    await userEvent.type(screen.getByLabelText('Roughly what price are you looking at?'), '1200000');
    await userEvent.type(screen.getByLabelText('How much do you want to borrow?'), '960000');
    expect(m.profile()).toMatchObject({ price: 1_200_000, loan: 960_000 });
    expect(screen.getByText('$48,187')).toBeInTheDocument();
    expect(screen.queryByText(/first home grant/)).not.toBeInTheDocument();
    expect(screen.queryByText('First Home Buyers Assistance Scheme')).not.toBeInTheDocument();
  });

  it('passes scheme eligibility to the LVR meter', async () => {
    mount('price', prof({ state: 'NSW', price: 700_000, loan: 650_000 }, [{ age: 30 }]));
    expect(screen.getByText('Above 80%, but the 5% Deposit Scheme could remove LMI for you.')).toBeInTheDocument();
  });
});
