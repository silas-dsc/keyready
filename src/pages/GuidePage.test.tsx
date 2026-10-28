// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SITE } from '../sites';
import type { Guide } from '../sites/types';
import GuidePage from './GuidePage';

const base: Guide = {
  slug: 'test-guide',
  title: 'How deposits work',
  description: 'd',
  updated: '2026-03-05',
  intro: 'Everything about deposits.',
  sections: [
    { heading: 'Plain section', body: ['First para.', 'Second para.'] },
    { heading: 'Lender table', body: ['See below.'], table: { head: ['Lender', 'Max LVR'], rows: [['Bank A', '95%'], ['Bank B', '90%']] } },
    { heading: 'Other table', body: [], table: { head: ['State', 'Duty'], rows: [['NSW', '$0']] } },
  ],
  faq: [['Is it free?', 'Yes.']],
  sources: [{ label: 'ASIC', url: 'https://asic.gov.au/' }],
};

const APP = 'https://keyready.au/';

describe('GuidePage', () => {
  it('renders the guide with plain links back into the app', () => {
    render(<GuidePage guide={base} appUrl={APP} />);
    expect(screen.getByRole('heading', { level: 1, name: 'How deposits work' })).toBeInTheDocument();
    expect(screen.getByText('Facts checked 5 March 2026')).toBeInTheDocument();
    expect(screen.getByText('Everything about deposits.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Check my readiness' })).toHaveAttribute('href', `${APP}#/check`);
    expect(screen.getByRole('link', { name: /See where you stand/ })).toHaveAttribute('href', `${APP}#/check`);
    expect(screen.getByRole('link', { name: 'Privacy policy' })).toHaveAttribute('href', `${APP}privacy/`);
    const crumb = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumb).getByRole('link', { name: SITE.name })).toHaveAttribute('href', APP);
    expect(screen.getByText('Second para.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'ASIC' })).toHaveAttribute('href', 'https://asic.gov.au/');
  });

  it('renders tables, with the criteria caveat only under lender tables', () => {
    render(<GuidePage guide={base} appUrl={APP} />);
    const tables = screen.getAllByRole('table');
    expect(tables).toHaveLength(2);
    expect(within(tables[0]).getByRole('cell', { name: 'Bank B' })).toBeInTheDocument();
    expect(within(tables[1]).getByRole('columnheader', { name: 'Duty' })).toBeInTheDocument();
    expect(screen.getAllByText(/Each lender’s published criteria as at 5 March 2026/)).toHaveLength(1);
  });

  it('shows FAQs when present', () => {
    render(<GuidePage guide={base} appUrl={APP} />);
    expect(screen.getByRole('heading', { name: 'Common questions' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Is it free?' })).toBeInTheDocument();
  });

  it('omits the FAQ section when there are none', () => {
    const { rerender } = render(<GuidePage guide={{ ...base, faq: undefined }} appUrl={APP} />);
    expect(screen.queryByRole('heading', { name: 'Common questions' })).not.toBeInTheDocument();
    rerender(<GuidePage guide={{ ...base, faq: [] }} appUrl={APP} />);
    expect(screen.queryByRole('heading', { name: 'Common questions' })).not.toBeInTheDocument();
  });
});
