import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, CountUp, Logo } from '../components/ui';
import { fmtShortMoney, lvr } from '../engine/finance';
import { assess } from '../engine/match';
import type { Profile } from '../engine/types';
import { LENDER_COUNT } from '../lib/lenderDisplay';
import { useSavedProfile } from '../lib/store';
import { buildSteps, SECTIONS, type Step } from '../wizard/steps';

export default function Check() {
  const nav = useNavigate();
  const s = useSavedProfile();
  const { profile: p } = s;
  const steps = useMemo(() => buildSteps(p).filter(st => !st.skip?.(p)), [p]);
  const idx = Math.max(0, steps.findIndex(st => st.id === s.stepId));
  const step = steps[idx];
  const [dir, setDir] = useState(1);
  const [showError, setShowError] = useState(false);
  const [pendingNext, setPendingNext] = useState(false);
  const [crunching, setCrunching] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the new question so screen-reader and keyboard users land in the right place.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setShowError(false);
  }, [step?.id]);

  const finish = useCallback(() => {
    setCrunching(true);
    s.complete();
    setTimeout(() => nav('/report'), 2600);
  }, [nav, s]);

  const goNext = useCallback(() => {
    if (step.error?.(p)) {
      setShowError(true);
      return;
    }
    s.markAnswered(step.id);
    setDir(1);
    if (idx >= steps.length - 1) finish();
    else s.setStep(steps[idx + 1].id);
  }, [step, p, idx, steps, s, finish]);

  // Auto-advance runs after the choice has been committed so branching (e.g. joint → extra questions) uses fresh answers.
  useEffect(() => {
    if (!pendingNext) return;
    const t = setTimeout(() => {
      setPendingNext(false);
      goNext();
    }, 260);
    return () => clearTimeout(t);
  }, [pendingNext, goNext]);

  const goBack = () => {
    if (idx === 0) return nav('/');
    setDir(-1);
    s.setStep(steps[idx - 1].id);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !(e.target as HTMLElement)?.closest('button')) {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [goNext]);

  const answered = s.answered.includes(step.id);
  const error = showError ? step.error?.(p) : null;
  const sectionIdx = SECTIONS.findIndex(x => x.id === step.section);
  // Endowed progress: the bar starts with a little already filled — people persist more when they feel they've begun.
  const progress = 0.06 + 0.94 * (idx / steps.length);

  if (crunching) return <Crunching />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <span className="flex items-center gap-1.5 text-xs font-semibold text-muted">
            <span className="h-2 w-2 rounded-full bg-mint" aria-hidden /> Saved on this device
          </span>
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-3">
          <ol className="mb-2 hidden grid-cols-5 gap-2 text-xs font-semibold sm:grid" aria-label="Sections">
            {SECTIONS.map((sec, i) => (
              <li key={sec.id} className={i < sectionIdx ? 'text-go' : i === sectionIdx ? 'text-ink' : 'text-muted'} aria-current={i === sectionIdx ? 'step' : undefined}>
                {i < sectionIdx ? '✓ ' : ''}{sec.label}
              </li>
            ))}
          </ol>
          <div className="h-2 overflow-hidden rounded-full bg-black/8" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100} aria-label="Progress">
            <motion.div className="h-2 rounded-full bg-gradient-to-r from-ink to-go" initial={false} animate={{ width: `${progress * 100}%` }} transition={{ type: 'spring', stiffness: 90, damping: 20 }} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-[1fr_340px] lg:py-12">
        <section className="min-w-0 max-w-2xl">
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <motion.div
              key={step.id}
              custom={dir}
              initial={{ opacity: 0, x: 28 * dir }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -28 * dir }}
              transition={{ duration: 0.22, ease: 'easeOut' }}
            >
              <p className="text-sm font-bold uppercase tracking-wider text-go">
                {SECTIONS[sectionIdx].label} · {idx + 1} of {steps.length}
              </p>
              <h1 ref={headingRef} tabIndex={-1} className="mt-2 text-3xl font-extrabold leading-tight tracking-tight outline-none sm:text-4xl">
                {step.title}
              </h1>
              {step.sub && <p className="mt-2 text-lg text-ink-soft">{step.sub}</p>}

              <details className="group mt-4 lg:hidden">
                <summary className="cursor-pointer list-none text-sm font-semibold text-ink-soft">
                  <span className="underline decoration-dotted underline-offset-4">Why do we ask?</span>
                </summary>
                <p className="mt-2 rounded-xl bg-mint-soft p-3 text-sm">{step.why}</p>
              </details>

              <div className="mt-7">
                {step.render({ p, set: s.update, choose: () => setPendingNext(true), answered })}
              </div>
              {error && (
                <p role="alert" className="mt-4 rounded-xl bg-rose-soft px-4 py-3 font-semibold text-rose">
                  {error}
                </p>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button variant="ghost" onClick={goBack}>← Back</Button>
            {(!step.auto || answered) && (
              <Button onClick={goNext} size="lg" className="min-w-40">
                {idx === steps.length - 1 ? 'See my results' : 'Continue'} <span aria-hidden>→</span>
              </Button>
            )}
            {step.skippable && (
              <Button variant="ghost" onClick={goNext}>{step.skippable}</Button>
            )}
            {!step.auto && <span className="hidden text-xs text-muted sm:inline">or press Enter ↵</span>}
            {step.auto && !answered && <span className="hidden text-xs text-muted sm:inline">Tip: press 1–9 to choose</span>}
          </div>
        </section>

        <Sidebar step={step} p={p} answered={s.answered} onEdit={id => { setDir(-1); s.setStep(id); }} />
      </main>
    </div>
  );
}

function Sidebar({ step, p, answered, onEdit }: { step: Step; p: Profile; answered: string[]; onEdit: (id: string) => void }) {
  const hasIncome = p.applicants.some(a => a.baseIncome > 0);
  const a = useMemo(() => (hasIncome ? assess({ ...p, loan: p.loan || 1, price: p.price || 1 }) : null), [hasIncome, p]);
  const facts = buildSteps(p)
    .filter(st => answered.includes(st.id) && !st.skip?.(p))
    .flatMap(st => (st.summary?.(p) ?? []).map(([k, v]) => ({ k, v, id: st.id })));
  return (
    <aside className="space-y-4 lg:sticky lg:top-36 lg:self-start" aria-label="Your progress">
      <div className={`rounded-3xl bg-ink p-6 text-white shadow-xl ${a ? '' : 'hidden lg:block'}`}>
        <p className="text-sm font-semibold text-mint">Live estimate</p>
        {a ? (
          <>
            <p className="mt-1 text-sm text-white/70">You could borrow up to</p>
            <p className="text-4xl font-extrabold tabular-nums">
              <CountUp value={a.borrowingPower.best} format={fmtShortMoney} />
            </p>
            {p.price > 0 && p.loan > 0 && <p className="mt-2 text-sm text-white/70">LVR {lvr(p).toFixed(1)}%</p>}
            <p className="mt-3 text-xs text-white/50">Updates as you answer. Your full lender match comes at the end.</p>
          </>
        ) : (
          <p className="mt-2 text-white/80">Your borrowing power appears here once we know your income.</p>
        )}
      </div>
      <div className="hidden rounded-3xl bg-mint-soft p-5 lg:block">
        <p className="text-sm font-bold">Why we ask</p>
        <p className="mt-1 text-sm text-ink-soft">{step.why}</p>
      </div>
      {facts.length > 0 && (
        <div className="hidden rounded-3xl bg-card p-5 ring-1 ring-line lg:block">
          <p className="text-sm font-bold">What you’ve told us</p>
          <ul className="mt-3 space-y-1">
            {facts.map(f => (
              <li key={f.k}>
                <button onClick={() => onEdit(f.id)} className="flex w-full justify-between gap-3 rounded-lg px-2 py-1 text-left text-sm hover:bg-black/5" title="Edit">
                  <span className="text-muted">{f.k}</span>
                  <span className="truncate font-semibold">{f.v}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted">Tap any answer to change it.</p>
        </div>
      )}
    </aside>
  );
}

function Crunching() {
  const lines = ['Loading live rates from Open Banking', 'Checking residency & employment rules', 'Applying each lender’s income shading', 'Stress-testing at +3% (APRA buffer)', 'Calculating your state’s stamp duty & grants', 'Ranking your fastest wins'];
  return (
    <div className="grid min-h-dvh place-items-center bg-ink px-6 text-white" role="status" aria-live="polite">
      <div className="w-full max-w-md">
        <motion.div className="mx-auto mb-8 h-16 w-16 rounded-2xl border-4 border-mint border-t-transparent" animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} />
        <h1 className="text-center text-2xl font-extrabold">Matching you against {LENDER_COUNT} lenders…</h1>
        <ul className="mt-8 space-y-3">
          {lines.map((l, i) => (
            <motion.li key={l} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + i * 0.45 }} className="flex items-center gap-3">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-mint text-sm font-bold text-ink">✓</span> {l}
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
