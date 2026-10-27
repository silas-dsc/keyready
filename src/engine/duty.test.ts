import { describe, expect, it } from 'vitest';
import { stampDuty } from './duty';
import { emptyProfile, newApplicant } from './profile';
import type { AuState, Profile } from './types';

// Expected figures are the official worked examples / calculator outputs published by each
// revenue office (or, where marked "computed", derived from the official schedule).
const mk = (state: AuState, price: number, o: Partial<Profile> & { foreign?: boolean } = {}): Profile => ({
  ...emptyProfile(),
  applicants: [{ ...newApplicant(), age: 35, residency: o.foreign ? 'temporary_visa' : 'citizen' }],
  state,
  price,
  firstHome: false,
  purpose: 'investment',
  ...o,
});
const fhb = (state: AuState, price: number, o: Partial<Profile> = {}) => mk(state, price, { firstHome: true, purpose: 'owner', ...o });
const owner = (state: AuState, price: number) => mk(state, price, { purpose: 'owner' });
const duty = (p: Profile) => stampDuty(p).duty;

describe('NSW', () => {
  it('general rates', () => {
    expect(duty(mk('NSW', 1_350_000))).toBe(55_537);
    expect(duty(mk('NSW', 4_000_000))).toBe(203_237);
    expect(duty(mk('NSW', 450_000))).toBe(14_437);
  });
  it('rounds the excess up per $100 or part (official calculator, retrieved 2026-10-27)', () => {
    expect(duty(mk('NSW', 450_050))).toBe(14_441.5);
    expect(duty(mk('NSW', 1_290_050))).toBe(52_242.5);
    expect(duty(fhb('NSW', 850_050))).toBe(9_808.8);
  });
  it('First Home Buyers Assistance Scheme', () => {
    expect(duty(fhb('NSW', 800_000))).toBe(0);
    expect(duty(fhb('NSW', 850_000))).toBe(9_796.75);
    expect(duty(fhb('NSW', 900_000))).toBe(19_593.5);
    expect(duty(fhb('NSW', 990_000))).toBe(37_227.65);
    expect(duty(fhb('NSW', 410_000, { dwelling: 'land' }))).toBe(8_514.2);
  });
});

describe('VIC', () => {
  it('general rates (official calculator)', () => {
    expect(duty(mk('VIC', 750_000))).toBe(40_070);
    expect(duty(mk('VIC', 650_000))).toBe(34_070);
    expect(duty(mk('VIC', 1_500_000))).toBe(82_500);
    expect(duty(mk('VIC', 2_500_000))).toBe(142_500);
    expect(duty(mk('VIC', 123_456))).toBe(2_713);
  });
  it('principal place of residence concession', () => {
    expect(duty(owner('VIC', 400_000))).toBe(16_370);
    expect(duty(owner('VIC', 550_000))).toBe(24_970);
  });
  it('first home buyer exemption and concession', () => {
    expect(duty(fhb('VIC', 600_000))).toBe(0);
    expect(duty(fhb('VIC', 640_000))).toBe(8_925);
    expect(duty(fhb('VIC', 650_000))).toBe(11_356);
    expect(duty(fhb('VIC', 700_000))).toBe(24_713);
    expect(duty(fhb('VIC', 745_000))).toBe(38_444);
    expect(duty(fhb('VIC', 750_000))).toBe(40_070);
  });
});

describe('QLD', () => {
  it('general and home concession rates', () => {
    expect(duty(mk('QLD', 850_000))).toBe(31_275);
    expect(duty(mk('QLD', 750_000))).toBe(26_775);
    expect(duty(owner('QLD', 950_000))).toBe(28_600);
    expect(duty(owner('QLD', 550_000))).toBe(10_600);
  });
  it('rounds the excess up per $100 or part (official calculator, retrieved 2026-10-27)', () => {
    expect(duty(mk('QLD', 540_050))).toBe(17_329.5);
  });
  it('first home concession (established) and new homes', () => {
    expect(duty(fhb('QLD', 650_000))).toBe(0);
    expect(duty(fhb('QLD', 730_000))).toBe(6_555);
    expect(duty(fhb('QLD', 795_000))).toBe(19_890);
    expect(duty(fhb('QLD', 850_000))).toBe(24_100);
    expect(duty(fhb('QLD', 1_230_000, { condition: 'new' }))).toBe(0);
  });
});

describe('WA', () => {
  it('general and concessional rates (computed from official schedule)', () => {
    expect(duty(mk('WA', 500_000))).toBe(17_765);
    expect(duty(mk('WA', 750_000))).toBe(29_740.5);
    expect(duty(owner('WA', 180_000))).toBe(4_224);
  });
  it('first home owner rate from 7 May 2026', () => {
    expect(duty(fhb('WA', 600_000))).toBe(0);
    expect(duty(fhb('WA', 650_000))).toBe(8_075);
    expect(duty(fhb('WA', 700_000))).toBe(16_150);
    expect(duty(fhb('WA', 500_000, { dwelling: 'land' }))).toBe(10_070);
  });
  it('rounds the excess up per $100 or part (official calculator, retrieved 2026-10-27)', () => {
    expect(duty(mk('WA', 725_050))).toBe(28_458.15);
    expect(duty(fhb('WA', 650_050))).toBe(8_091.15);
  });
  it('foreign transfer duty (official example: $400k, one of two buyers foreign)', () => {
    const p = fhb('WA', 400_000);
    p.applicants = [{ ...newApplicant(), age: 30 }, { ...newApplicant(), age: 30, residency: 'temporary_visa' }];
    expect(stampDuty(p).foreignSurcharge).toBe(14_000);
  });
});

describe('SA', () => {
  it('general rates (official examples)', () => {
    expect(duty(mk('SA', 600_000))).toBe(26_830);
    expect(duty(mk('SA', 675_000))).toBe(30_955);
    expect(stampDuty(mk('SA', 600_000, { foreign: true })).foreignSurcharge).toBe(42_000);
  });
  it('first home buyers pay nothing on new homes, full duty on established', () => {
    expect(duty(fhb('SA', 900_000, { condition: 'new' }))).toBe(0);
    expect(duty(fhb('SA', 500_000))).toBe(21_330);
  });
  it('relief needs only one citizen/PR applicant; the 7% surcharge is not relieved (RevenueSA, retrieved 2026-10-27)', () => {
    const p = fhb('SA', 600_000, { condition: 'new' });
    p.applicants = [{ ...newApplicant(), age: 30 }, { ...newApplicant(), age: 30, residency: 'temporary_visa' }];
    const r = stampDuty(p);
    expect(r.duty).toBe(0);
    expect(r.foreignSurcharge).toBe(21_000);
  });
});

describe('TAS', () => {
  it('general rates; FHB exemption on established homes ended 30 Jun 2026', () => {
    expect(duty(mk('TAS', 350_000))).toBe(11_935);
    expect(duty(mk('TAS', 600_000))).toBe(22_497.5);
    expect(duty(mk('TAS', 750_000))).toBe(28_935);
    expect(duty(fhb('TAS', 650_000))).toBe(24_622.5);
  });
});

describe('ACT', () => {
  it('owner-occupier and investor schedules', () => {
    expect(duty(mk('ACT', 580_000))).toBe(14_856);
    expect(duty(owner('ACT', 750_000))).toBe(19_208);
    expect(duty(owner('ACT', 1_000_000))).toBe(33_958);
    expect(duty(mk('ACT', 1_500_000))).toBe(68_100);
  });
  it('Home Buyer Concession Scheme: nil duty, no cap', () => {
    expect(duty(fhb('ACT', 1_200_000))).toBe(0);
  });
});

describe('NT', () => {
  it('formula and flat rates', () => {
    expect(duty(mk('NT', 300_000))).toBe(10_414.3);
    expect(duty(mk('NT', 500_000))).toBe(23_928.6);
    expect(duty(mk('NT', 650_000))).toBe(32_175);
  });
  it('house and land package exemption', () => {
    expect(duty(owner('NT', 650_000))).toBe(32_175);
    expect(duty({ ...owner('NT', 650_000), dwelling: 'house_land' })).toBe(0);
  });
});

describe('First Home Owner Grant', () => {
  const grant = (p: Profile) => stampDuty(p).fhog;
  it('new homes only, with state caps', () => {
    expect(grant(fhb('NT', 700_000, { condition: 'new' }))).toBe(50_000);
    expect(grant(fhb('QLD', 700_000, { condition: 'new' }))).toBe(30_000);
    expect(grant(fhb('QLD', 800_000, { condition: 'new' }))).toBe(0);
    expect(grant(fhb('NSW', 650_000, { condition: 'new' }))).toBe(0);
    expect(grant(fhb('NSW', 700_000, { purpose: 'construction' }))).toBe(10_000);
    expect(grant(fhb('TAS', 700_000, { condition: 'new' }))).toBe(20_000);
    expect(grant(fhb('ACT', 700_000, { condition: 'new' }))).toBe(0);
    expect(grant(fhb('VIC', 700_000))).toBe(0);
  });
});
