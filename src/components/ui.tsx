import { motion } from 'framer-motion';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';

export function Logo({ light = false }: { light?: boolean }) {
  return (
    <Link to="/" className={`flex items-center gap-2 font-extrabold tracking-tight ${light ? 'text-white' : 'text-ink'}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <rect width="32" height="32" rx="8" fill={light ? '#ffffff' : '#0e3b3a'} />
        <path d="M9 17l5 5 9-11" stroke="#50e3a4" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-lg">KeyReady</span>
    </Link>
  );
}

type BtnProps = React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'soft'; size?: 'md' | 'lg' };

export function Button({ variant = 'primary', size = 'md', className = '', ...rest }: BtnProps) {
  const v = {
    primary: 'bg-ink text-white hover:bg-[#0a2f2e] shadow-[0_6px_20px_-8px_rgba(14,59,58,.6)]',
    soft: 'bg-mint-soft text-ink hover:bg-[#c8f3dd]',
    ghost: 'text-ink-soft hover:text-ink hover:bg-black/5',
  }[variant];
  const s = size === 'lg' ? 'px-7 py-4 text-lg' : 'px-5 py-3 text-base';
  return (
    <button
      {...rest}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-semibold transition active:scale-[.98] disabled:opacity-40 disabled:pointer-events-none ${v} ${s} ${className}`}
    />
  );
}

export interface Choice<T extends string> {
  value: T;
  label: string;
  hint?: string;
  icon?: string;
}

/** Big tappable answer cards. Number keys pick an option (shown as a key hint). */
export function ChoiceGrid<T extends string>({
  options, value, onChange, cols = 2, label,
}: { options: Choice<T>[]; value: T | null | undefined; onChange: (v: T) => void; cols?: 1 | 2 | 3 | 4; label: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || e.metaKey || e.ctrlKey || e.altKey) return;
      const i = Number(e.key) - 1;
      if (i >= 0 && i < options.length) onChange(options[i].value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options, onChange]);

  const grid = { 1: 'grid-cols-1', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[cols];
  return (
    <div role="radiogroup" aria-label={label} className={`grid gap-3 ${grid}`}>
      {options.map((o, i) => {
        const on = value === o.value;
        return (
          <motion.button
            type="button"
            role="radio"
            aria-checked={on}
            key={o.value}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(o.value)}
            className={`group relative flex items-center gap-3 rounded-2xl border-2 bg-card p-4 text-left transition ${
              on ? 'border-ink shadow-[0_0_0_4px_rgba(80,227,164,.35)]' : 'border-line hover:border-ink/40 hover:-translate-y-0.5'
            }`}
          >
            {o.icon && <span className="text-2xl" aria-hidden>{o.icon}</span>}
            <span className="flex-1">
              <span className="block font-semibold">{o.label}</span>
              {o.hint && <span className="mt-0.5 block text-sm text-muted">{o.hint}</span>}
            </span>
            <span
              className={`hidden h-6 min-w-6 items-center justify-center rounded-md border text-xs font-semibold sm:flex ${
                on ? 'border-ink bg-ink text-white' : 'border-line text-muted'
              }`}
              aria-hidden
            >
              {on ? '✓' : i + 1}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, label }: { options: Choice<T>[]; value: T; onChange: (v: T) => void; label: string }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-2xl bg-black/5 p-1">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${value === o.value ? 'bg-card text-ink shadow' : 'text-ink-soft hover:text-ink'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Field({ label, hint, error, children, optional }: { label: string; hint?: ReactNode; error?: string; children: (id: string) => ReactNode; optional?: boolean }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-semibold">
        {label} {optional && <span className="font-normal text-muted">(optional)</span>}
      </label>
      {children(id)}
      {error ? <p className="text-sm font-medium text-rose" role="alert">{error}</p> : hint ? <p className="text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

const fmt = (n: number) => (n ? n.toLocaleString('en-AU') : '');

/** Currency input: numeric keypad on mobile, live thousands separators, never loses the caret to reformatting. */
export function MoneyInput({ id, value, onChange, placeholder, autoFocus, big }: { id?: string; value: number; onChange: (n: number) => void; placeholder?: string; autoFocus?: boolean; big?: boolean }) {
  const [text, setText] = useState(fmt(value));
  const focused = useRef(false);
  useEffect(() => {
    if (!focused.current) setText(fmt(value));
  }, [value]);
  return (
    <div className={`flex items-center rounded-2xl border-2 border-line bg-card px-4 transition focus-within:border-ink ${big ? 'py-3' : 'py-2.5'}`}>
      <span className={`mr-1 font-semibold text-muted ${big ? 'text-2xl' : ''}`}>$</span>
      <input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        placeholder={placeholder ?? '0'}
        value={text}
        onFocus={() => (focused.current = true)}
        onBlur={() => {
          focused.current = false;
          setText(fmt(value));
        }}
        onChange={e => {
          const digits = e.target.value.replace(/[^\d]/g, '').slice(0, 9);
          const n = Number(digits || 0);
          setText(digits ? n.toLocaleString('en-AU') : '');
          onChange(n);
        }}
        className={`w-full bg-transparent font-semibold outline-none focus-visible:outline-none placeholder:text-black/25 ${big ? 'text-3xl' : 'text-lg'}`}
      />
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 10, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="inline-flex items-center gap-3 rounded-2xl border-2 border-line bg-card p-1.5" role="group" aria-label={label}>
      <button type="button" aria-label={`Fewer ${label}`} onClick={() => onChange(Math.max(min, value - 1))} className="h-11 w-11 rounded-xl bg-black/5 text-xl font-bold hover:bg-black/10">−</button>
      <span className="w-8 text-center text-xl font-bold" aria-live="polite">{value}</span>
      <button type="button" aria-label={`More ${label}`} onClick={() => onChange(Math.min(max, value + 1))} className="h-11 w-11 rounded-xl bg-black/5 text-xl font-bold hover:bg-black/10">+</button>
    </div>
  );
}

/** Animated number that eases toward its target — makes live estimates feel alive without being jumpy. */
export function CountUp({ value, format }: { value: number; format: (n: number) => string }) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / 600);
      const eased = 1 - Math.pow(1 - k, 3);
      const v = a + (value - a) * eased;
      setShown(v);
      from.current = v;
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return <>{format(shown)}</>;
}

export function Pill({ tone, children }: { tone: 'go' | 'amber' | 'rose' | 'ink'; children: ReactNode }) {
  const t = {
    go: 'bg-mint-soft text-go',
    amber: 'bg-amber-soft text-amber',
    rose: 'bg-rose-soft text-rose',
    ink: 'bg-ink/10 text-ink',
  }[tone];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide ${t}`}>{children}</span>;
}
