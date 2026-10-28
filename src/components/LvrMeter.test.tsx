// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import LvrMeter from './LvrMeter';

const bar = (c: HTMLElement) => c.querySelector('.relative > div') as HTMLElement;
const marks = (c: HTMLElement) => [...c.querySelectorAll('[aria-hidden] > span')].map(s => s.textContent);

describe('LvrMeter', () => {
  it('prompts for numbers when there is no LVR yet', () => {
    const { container } = render(<LvrMeter lvr={0} />);
    expect(screen.getByText('Loan-to-value ratio')).toBeInTheDocument();
    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.getByText('Add a price and loan to see your LVR.')).toBeInTheDocument();
    expect(marks(container)).toEqual(['60', '80', '90', '95']);
    expect(bar(container)).toHaveClass('bg-go');
  });

  it.each([
    [55, '55.0%', 'bg-go', 'Excellent. The sharpest rates are often reserved for 60% and under.'],
    [72.34, '72.3%', 'bg-go', 'Under 80%, so no Lenders Mortgage Insurance needed.'],
    [85, '85.0%', 'bg-amber', 'Above 80%, most lenders will add Lenders Mortgage Insurance.'],
    [93, '93.0%', 'bg-[#d4671f]', 'Above 80%, most lenders will add Lenders Mortgage Insurance.'],
    [97, '97.0%', 'bg-rose', 'Above 95%, very few lenders go this high.'],
  ])('at %s%% shows %s with the right tone and message', (lvr, shown, tone, msg) => {
    const { container } = render(<LvrMeter lvr={lvr} />);
    expect(screen.getByText(shown)).toBeInTheDocument();
    expect(screen.getByText(msg)).toBeInTheDocument();
    expect(bar(container)).toHaveClass(tone);
  });

  it('mentions the 5% Deposit Scheme above 80% when eligible', () => {
    render(<LvrMeter lvr={90} schemeEligible />);
    expect(screen.getByText('Above 80%, but the 5% Deposit Scheme could remove LMI for you.')).toBeInTheDocument();
  });

  it('clamps the bar width to 0–100%', () => {
    expect(bar(render(<LvrMeter lvr={140} />).container).style.width).toBe('100%');
    expect(bar(render(<LvrMeter lvr={-5} />).container).style.width).toBe('0%');
    expect(bar(render(<LvrMeter lvr={42} />).container).style.width).toBe('42%');
  });

  it('has a compact layout with fewer marks and no heading', () => {
    const { container } = render(<LvrMeter lvr={70} compact />);
    expect(screen.queryByText('Loan-to-value ratio')).not.toBeInTheDocument();
    expect(screen.getByText('70.0%')).toHaveClass('text-3xl');
    expect(marks(container)).toEqual(['80', '95']);
    expect(screen.getByText(/Under 80%/)).toHaveClass('text-xs');
  });
});
