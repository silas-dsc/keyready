// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SITE } from '../sites';
import { Button, ChoiceGrid, CountUp, Field, Logo, MoneyInput, Pill, Segmented, Stepper, type Choice } from './ui';

describe('Logo', () => {
  it('links home with the site name, dark by default', () => {
    render(<MemoryRouter><Logo /></MemoryRouter>);
    const link = screen.getByRole('link', { name: SITE.name });
    expect(link).toHaveAttribute('href', '/');
    expect(link).toHaveClass('text-ink');
    expect(link.querySelector('rect')).toHaveAttribute('fill', '#0e3b3a');
  });
  it('renders a light variant', () => {
    render(<MemoryRouter><Logo light /></MemoryRouter>);
    const link = screen.getByRole('link');
    expect(link).toHaveClass('text-white');
    expect(link.querySelector('rect')).toHaveAttribute('fill', '#ffffff');
  });
});

describe('Button', () => {
  it('defaults to primary, medium and forwards props', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick} className="extra">Go</Button>);
    const b = screen.getByRole('button', { name: 'Go' });
    expect(b).toHaveClass('bg-ink', 'px-5', 'extra');
    await userEvent.click(b);
    expect(onClick).toHaveBeenCalledOnce();
  });
  it.each([
    ['soft', 'bg-mint-soft'],
    ['ghost', 'text-ink-soft'],
  ] as const)('supports the %s variant', (variant, cls) => {
    render(<Button variant={variant} size="lg">X</Button>);
    expect(screen.getByRole('button')).toHaveClass(cls, 'px-7', 'text-lg');
  });
  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(<Button disabled onClick={onClick}>X</Button>);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});

const OPTS: Choice<'a' | 'b' | 'c'>[] = [
  { value: 'a', label: 'Alpha', hint: 'First', icon: '🅰️' },
  { value: 'b', label: 'Bravo' },
  { value: 'c', label: 'Charlie' },
];

function Grid({ cols, onPick }: { cols?: 1 | 2 | 3 | 4; onPick?: (v: string) => void }) {
  const [v, setV] = useState<'a' | 'b' | 'c' | null>(null);
  return (
    <>
      <input aria-label="free text" />
      <ChoiceGrid label="Pick" options={OPTS} value={v} cols={cols} onChange={x => { setV(x); onPick?.(x); }} />
    </>
  );
}

describe('ChoiceGrid', () => {
  it('shows labels, hints, icons and number hints; click selects', async () => {
    render(<Grid />);
    const group = screen.getByRole('radiogroup', { name: 'Pick' });
    expect(group).toHaveClass('sm:grid-cols-2');
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('🅰️')).toBeInTheDocument();
    expect(radios[1]).toHaveTextContent('2');
    await userEvent.click(screen.getByRole('radio', { name: /Bravo/ }));
    expect(screen.getByRole('radio', { name: /Bravo/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: /Bravo/ })).toHaveTextContent('✓');
    expect(screen.getByRole('radio', { name: /Alpha/ })).toHaveAttribute('aria-checked', 'false');
  });

  it('number keys pick an option; out-of-range, modifiers and typing in inputs are ignored', async () => {
    const onPick = vi.fn();
    render(<Grid onPick={onPick} />);
    const user = userEvent.setup();
    await user.keyboard('3');
    expect(onPick).toHaveBeenLastCalledWith('c');
    expect(screen.getByRole('radio', { name: /Charlie/ })).toHaveAttribute('aria-checked', 'true');
    onPick.mockClear();
    await user.keyboard('0');
    await user.keyboard('9');
    await user.keyboard('x');
    await user.keyboard('{Meta>}1{/Meta}');
    await user.keyboard('{Control>}1{/Control}');
    await user.keyboard('{Alt>}1{/Alt}');
    await user.click(screen.getByLabelText('free text'));
    await user.keyboard('1');
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.getByLabelText('free text')).toHaveValue('1');
  });

  it('stops listening once unmounted', () => {
    const onPick = vi.fn();
    const { unmount } = render(<Grid onPick={onPick} />);
    unmount();
    fireEvent.keyDown(window, { key: '1' });
    expect(onPick).not.toHaveBeenCalled();
  });

  it.each([
    [1, 'grid-cols-1'],
    [3, 'sm:grid-cols-3'],
    [4, 'grid-cols-2'],
  ] as const)('lays out %i columns', (cols, cls) => {
    render(<Grid cols={cols} />);
    expect(screen.getByRole('radiogroup')).toHaveClass(cls);
  });
});

describe('Segmented', () => {
  it('marks the current value and reports changes', async () => {
    const onChange = vi.fn();
    render(<Segmented label="Freq" value="b" onChange={onChange} options={OPTS} />);
    expect(screen.getByRole('radiogroup', { name: 'Freq' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'Bravo' })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radio', { name: 'Alpha' })).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(screen.getByRole('radio', { name: 'Charlie' }));
    expect(onChange).toHaveBeenCalledWith('c');
  });
});

describe('Field', () => {
  it('labels its control and shows a hint', () => {
    render(<Field label="Name" hint="Your full name">{id => <input id={id} />}</Field>);
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByText('Your full name')).toBeInTheDocument();
    expect(screen.queryByText('(optional)')).not.toBeInTheDocument();
  });
  it('shows an error instead of the hint, and an optional tag', () => {
    render(<Field label="Name" optional hint="Hint" error="Required">{id => <input id={id} />}</Field>);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
    expect(screen.queryByText('Hint')).not.toBeInTheDocument();
    expect(screen.getByText('(optional)')).toBeInTheDocument();
  });
  it('renders nothing under the control without hint or error', () => {
    const { container } = render(<Field label="Name">{id => <input id={id} />}</Field>);
    expect(container.querySelectorAll('p')).toHaveLength(0);
  });
});

function Money({ initial = 0, big }: { initial?: number; big?: boolean }) {
  const [v, setV] = useState(initial);
  return (
    <>
      <MoneyInput id="m" value={v} onChange={setV} big={big} />
      <output data-testid="val">{v}</output>
      <button onClick={() => setV(1234567)}>external</button>
    </>
  );
}

describe('MoneyInput', () => {
  it('formats thousands as you type, strips junk and caps at 9 digits', async () => {
    render(<Money />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveAttribute('placeholder', '0');
    expect(input).toHaveValue('');
    await userEvent.type(input, '12a345');
    expect(input).toHaveValue('12,345');
    expect(screen.getByTestId('val')).toHaveTextContent('12345');
    await userEvent.clear(input);
    expect(input).toHaveValue('');
    expect(screen.getByTestId('val')).toHaveTextContent('0');
    await userEvent.type(input, '12345678901');
    expect(screen.getByTestId('val')).toHaveTextContent('123456789');
  });

  it('shows an initial value, uses a custom placeholder and big styling', () => {
    render(<MoneyInput value={5000} onChange={() => {}} placeholder="650,000" big />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('5,000');
    expect(input).toHaveAttribute('placeholder', '650,000');
    expect(input).toHaveClass('text-3xl');
  });

  it('syncs outside changes only when not focused, and reformats on blur', async () => {
    render(<Money initial={10} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('text-lg');
    // Not focused: external change shows straight away.
    fireEvent.click(screen.getByText('external'));
    expect(input).toHaveValue('1,234,567');
    // Focused: typing wins until blur.
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: '99' } });
    expect(input).toHaveValue('99');
    fireEvent.click(screen.getByText('external'));
    expect(input).toHaveValue('99');
    fireEvent.blur(input);
    expect(input).toHaveValue('1,234,567');
  });
});

describe('Stepper', () => {
  it('steps within the default 0–10 bounds', async () => {
    function S() {
      const [v, setV] = useState(0);
      return <Stepper label="kids" value={v} onChange={setV} />;
    }
    render(<S />);
    expect(screen.getByRole('group', { name: 'kids' })).toHaveTextContent('0');
    await userEvent.click(screen.getByRole('button', { name: 'Fewer kids' }));
    expect(screen.getByRole('group')).toHaveTextContent('0');
    for (let i = 0; i < 12; i++) await userEvent.click(screen.getByRole('button', { name: 'More kids' }));
    expect(screen.getByRole('group')).toHaveTextContent('10');
  });
  it('respects custom min and max', async () => {
    const onChange = vi.fn();
    render(<Stepper label="years" value={2} min={2} max={3} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fewer years' }));
    expect(onChange).toHaveBeenLastCalledWith(2);
    await userEvent.click(screen.getByRole('button', { name: 'More years' }));
    expect(onChange).toHaveBeenLastCalledWith(3);
  });
});

describe('CountUp', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('eases from the old value to the new one, then stops', () => {
    const frames: FrameRequestCallback[] = [];
    const cancel = vi.fn();
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', cancel);
    vi.spyOn(performance, 'now').mockReturnValue(0);
    const fmt = (n: number) => `$${Math.round(n)}`;
    const { container, rerender, unmount } = render(<CountUp value={100} format={fmt} />);
    expect(container).toHaveTextContent('$100');
    rerender(<CountUp value={200} format={fmt} />);
    const run = (t: number) => act(() => frames.shift()!(t));
    // Drain the frame from the first effect (it lands on the start value).
    run(600);
    expect(container).toHaveTextContent('$100');
    run(300); // halfway in time, eased past half
    expect(container).toHaveTextContent('$188');
    expect(frames).toHaveLength(1);
    run(600);
    expect(container).toHaveTextContent('$200');
    expect(frames).toHaveLength(0);
    unmount();
    expect(cancel).toHaveBeenCalled();
  });
});

describe('Pill', () => {
  it.each([
    ['go', 'text-go'],
    ['amber', 'text-amber'],
    ['rose', 'text-rose'],
    ['ink', 'text-ink'],
  ] as const)('renders the %s tone', (tone, cls) => {
    render(<Pill tone={tone}>Ready</Pill>);
    expect(screen.getByText('Ready')).toHaveClass(cls);
  });
});
