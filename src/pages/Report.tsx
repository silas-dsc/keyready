import confetti from 'canvas-confetti';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import LvrMeter from '../components/LvrMeter';
import { Button, CountUp, Logo, Pill } from '../components/ui';
import { fixActions, type FixAction } from '../engine/actions';
import { stampDuty } from '../engine/duty';
import { deposit, depositScheme, fmtMoney, fmtShortMoney, lmiEstimate, lvr, upfrontCosts } from '../engine/finance';
import { assess, type Assessment } from '../engine/match';
import { decodeProfile } from '../engine/share';
import { summarise } from '../engine/summary';
import type { LenderResult, MatchStatus, Profile } from '../engine/types';
import { backendMode, submitLead } from '../lib/leads';
import { DATA_DATE, lenderName } from '../lib/lenderDisplay';
import { loadSaved, useSavedProfile } from '../lib/store';
import { SITE } from '../sites';
import { BROKER, BROKER_DISCLOSURE } from '../sites/broker';

const STATUS: Record<MatchStatus, { label: string; tone: 'go' | 'amber' | 'rose'; color: string }> = {
  ready: { label: 'Fits', tone: 'go', color: '#12805c' },
  close: { label: 'Close', tone: 'amber', color: '#e2a336' },
  not_yet: { label: 'Not yet', tone: 'rose', color: '#d98c84' },
};

export default function Report() {
  const [params] = useSearchParams();
  const sample = params.has('sample');
  const nav = useNavigate();
  const saved = useSavedProfile();
  const base = useMemo(() => (sample ? SITE.sample() : saved.profile), [sample, saved.profile]);
  const [sim, setSim] = useState<Profile>(base);
  const [connectOpen, setConnectOpen] = useState(false);
  useEffect(() => setSim(base), [base]);

  // A report handed over from an AI assistant (MCP): #/report?profile=<encoded answers>.
  const shared = params.get('profile');
  const { replace: replaceProfile, complete } = saved;
  useEffect(() => {
    if (shared) {
      const p = decodeProfile(shared);
      if (p) {
        replaceProfile(p);
        complete();
      }
      nav('/report', { replace: true });
      return;
    }
    if (!sample && !loadSaved()?.completed) nav('/check', { replace: true });
  }, [sample, shared, nav, replaceProfile, complete]);

  const a = useMemo(() => assess(sim), [sim]);
  const original = useMemo(() => assess(base), [base]);
  const fixes = useMemo(() => fixActions(base, original), [base, original]);
  const isWhatIf = JSON.stringify(sim) !== JSON.stringify(base);

  const celebrated = useRef(false);
  useEffect(() => {
    if (celebrated.current || sample || original.ready === 0) return;
    celebrated.current = true;
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      confetti({ particleCount: 90, spread: 70, origin: { y: 0.3 }, colors: ['#50e3a4', '#0e3b3a', '#f7c548'] });
  }, [original.ready, sample]);

  return (
    <div className="min-h-dvh pb-24">
      <header className="no-print border-b border-line bg-paper/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Logo />
          <div className="flex items-center gap-2">
            {!sample && <Link to="/check" className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-black/5">Edit answers</Link>}
            <button onClick={() => window.print()} className="rounded-xl px-3 py-2 text-sm font-semibold text-ink-soft hover:bg-black/5">Save as PDF</button>
          </div>
        </div>
      </header>

      {sample && (
        <div className="bg-amber-soft px-4 py-3 text-center text-sm font-semibold text-amber">
          This is an example report for a sample buyer. <Link to="/check" className="underline">Get your own in 5 minutes →</Link>
        </div>
      )}

      <main className="mx-auto max-w-6xl space-y-8 px-4 pt-8">
        <Hero a={a} p={sim} whatIf={isWhatIf} onConnect={() => setConnectOpen(true)} />

        <AnimatePresence>
          {isWhatIf && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border-2 border-dashed border-amber bg-amber-soft px-5 py-3">
              <p className="font-semibold text-amber">You’re viewing a what-if. Your real answers haven’t changed.</p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={() => setSim(base)}>Reset</Button>
                {!sample && <Button variant="soft" onClick={() => saved.replace(sim)}>Keep these numbers</Button>}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <KeyNumbers a={a} p={sim} />

        <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="space-y-8">
            {fixes.length > 0 && <Fixes fixes={fixes} onTry={f => { setSim(f.profile); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />}
            <Lenders results={a.results} />
          </div>
          <div className="space-y-6">
            <WhatIf p={sim} base={base} onChange={setSim} />
            <Duty p={sim} />
            <Scheme p={sim} />
          </div>
        </div>

        <section className="no-print rounded-3xl bg-ink p-8 text-white sm:p-10">
          <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to take it to a broker?</h2>
              <p className="mt-2 max-w-xl text-white/75">
                {BROKER.name} gets this report and calls you at a time that suits. One conversation instead of five — and no credit check until you choose a lender.
              </p>
            </div>
            <Button variant="soft" size="lg" onClick={() => setConnectOpen(true)}>Connect me with a broker</Button>
          </div>
        </section>

        <p className="text-xs leading-relaxed text-muted">
          {SITE.name} provides general information only — not credit assistance or financial advice — and doesn’t consider your full objectives or circumstances.
          Rates, maximum LVRs and residency rules come from each lender’s public Open Banking product data (updated {DATA_DATE}); other policy rules (time in job, income
          shading, debt-to-income caps) are typical settings for that type of lender, not its own policy. Stamp duty and grants use 2026–27 state rules. Estimates use a 3%
          serviceability buffer and an expense benchmark in the style of HEM; LMI is approximate. Always confirm with a licensed broker or lender.
        </p>
      </main>

      <AnimatePresence>{connectOpen && <Connect p={base} a={original} sample={sample} onClose={() => setConnectOpen(false)} />}</AnimatePresence>
    </div>
  );
}

function Hero({ a, p, whatIf, onConnect }: { a: Assessment; p: Profile; whatIf: boolean; onConnect: () => void }) {
  const total = a.results.length;
  const headline =
    a.ready > 0 ? (
      <>
        You fit the published rules of <span className="text-go">{a.ready} of {total} lenders</span>{whatIf ? '' : ' today'}.
      </>
    ) : a.close > 0 ? (
      <>You’re close — <span className="text-amber">{a.close} lenders</span> are within reach.</>
    ) : (
      <>Not yet — but there’s a clear path from here.</>
    );
  const sub =
    a.ready > 0
      ? `${a.close ? `${a.close} more ${a.close === 1 ? 'is' : 'are'} close. ` : ''}Your strongest match is ${lenderName(a.results[0].lender)} at ${a.results[0].score}% policy fit.`
      : a.close > 0
        ? 'Small, specific changes would get you over the line. Your fastest wins are below.'
        : 'Use the what-if tools to find a price and deposit that work, or talk to a broker about specialist options.';
  const waived = a.results.filter(r => r.lmiWaived && r.status !== 'not_yet');
  return (
    <section className="grid items-center gap-8 rounded-3xl bg-card p-6 ring-1 ring-line sm:p-10 md:grid-cols-[1fr_auto]">
      <div>
        <p className="text-sm font-bold uppercase tracking-wider text-muted">Your readiness report</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl" aria-live="polite">{headline}</h1>
        {waived.length > 0 && (
          <p className="mt-4 inline-flex flex-wrap items-center gap-2 rounded-2xl bg-mint-soft px-4 py-2 font-semibold text-go">
            ✓ {waived.length} lender{waived.length > 1 ? 's' : ''} publish an LMI waiver for your profession at this LVR — about {fmtMoney(lmiEstimate(p.loan, a.lvr))} saved
          </p>
        )}
        <p className="mt-3 max-w-xl text-lg text-ink-soft">{sub}</p>
        <div className="no-print mt-6 flex flex-wrap gap-3">
          <Button onClick={onConnect}>Connect with a broker</Button>
          <a href="#lenders" className="inline-flex items-center rounded-2xl px-5 py-3 font-semibold text-ink-soft hover:bg-black/5">See every lender ↓</a>
        </div>
        <p className="sr-only">Loan of {fmtMoney(p.loan)} on a {fmtMoney(p.price)} property.</p>
      </div>
      <Dial a={a} />
    </section>
  );
}

function Dial({ a }: { a: Assessment }) {
  const total = a.results.length;
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segs = (['ready', 'close', 'not_yet'] as MatchStatus[]).map(s => {
    const n = s === 'ready' ? a.ready : s === 'close' ? a.close : a.notYet;
    const len = (n / total) * c;
    const seg = { s, n, len, offset };
    offset += len;
    return seg;
  });
  return (
    <div className="mx-auto flex flex-col items-center">
      <svg width="190" height="190" viewBox="0 0 190 190" role="img" aria-label={`${a.ready} ready, ${a.close} close, ${a.notYet} not yet`}>
        <circle cx="95" cy="95" r={r} fill="none" stroke="#eee9dd" strokeWidth="22" />
        {segs.map(sg => (
          <motion.circle
            key={sg.s}
            cx="95" cy="95" r={r} fill="none" stroke={STATUS[sg.s].color} strokeWidth="22"
            strokeDasharray={`${Math.max(0, sg.len - 2)} ${c}`}
            initial={false}
            animate={{ strokeDasharray: `${Math.max(0, sg.len - (sg.n ? 2 : 0))} ${c}`, strokeDashoffset: -sg.offset }}
            transform="rotate(-90 95 95)"
            transition={{ duration: 0.6 }}
          />
        ))}
        <text x="95" y="92" textAnchor="middle" className="fill-ink" style={{ fontSize: 44, fontWeight: 800 }}>{a.ready}</text>
        <text x="95" y="118" textAnchor="middle" className="fill-muted" style={{ fontSize: 13, fontWeight: 600 }}>of {total} ready</text>
      </svg>
      <div className="mt-2 flex gap-3 text-xs font-semibold">
        {segs.map(sg => (
          <span key={sg.s} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STATUS[sg.s].color }} />
            {sg.n} {STATUS[sg.s].label.toLowerCase()}
          </span>
        ))}
      </div>
    </div>
  );
}

function KeyNumbers({ a, p }: { a: Assessment; p: Profile }) {
  const costs = upfrontCosts(p);
  const need = deposit(p) + costs.total;
  const have = p.savings + p.gift + costs.fhog;
  const best = a.results.find(r => r.status === 'ready') ?? a.results[0];
  const scheme = depositScheme(p);
  const theLvr = lvr(p);
  const lmi = best.usesScheme || best.lmiWaived ? 0 : lmiEstimate(p.loan, theLvr);
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Key numbers">
      <Card title="Borrowing power">
        <p className="text-3xl font-extrabold tabular-nums"><CountUp value={a.borrowingPower.typical} format={fmtShortMoney} /></p>
        <p className="text-sm text-muted">typical · up to {fmtShortMoney(a.borrowingPower.best)}</p>
        <Bar value={p.loan} max={Math.max(a.borrowingPower.best, p.loan)} tone={p.loan <= a.borrowingPower.typical ? 'bg-go' : 'bg-amber'} />
        <p className="mt-1 text-xs text-muted">You want {fmtShortMoney(p.loan)}</p>
      </Card>
      <Card title="Loan-to-value">
        <LvrMeter compact lvr={theLvr} schemeEligible={scheme.eligible} />
      </Card>
      <Card title="Cash to complete">
        <p className="text-3xl font-extrabold tabular-nums">{fmtShortMoney(need)}</p>
        <p className="text-sm text-muted">deposit {fmtShortMoney(deposit(p))} + costs {fmtShortMoney(costs.total)}</p>
        <Bar value={Math.min(have, need)} max={need || 1} tone={have >= need ? 'bg-go' : 'bg-amber'} />
        <p className="mt-1 text-xs text-muted">{have >= need ? `✓ Covered, ${fmtShortMoney(have - need)} spare` : `${fmtShortMoney(need - have)} short`}{costs.fhog ? ` · incl. ${fmtShortMoney(costs.fhog)} grant` : ''}</p>
      </Card>
      <Card title="Repayments">
        <p className="text-3xl font-extrabold tabular-nums"><CountUp value={best.monthlyRepayment} format={fmtMoney} /></p>
        <p className="text-sm text-muted">per month at {best.rate.toFixed(2)}%, 30 yrs</p>
        <p className="mt-3 text-xs text-muted">{lmi ? `Plus ~${fmtMoney(lmi)} mortgage insurance` : best.lmiWaived ? `No LMI — profession waiver (saves ~${fmtMoney(lmiEstimate(p.loan, theLvr))})` : best.usesScheme ? 'No LMI via the 5% Deposit Scheme' : 'No mortgage insurance'}</p>
      </Card>
    </section>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card p-5 ring-1 ring-line">
      <p className="mb-2 text-sm font-semibold text-ink-soft">{title}</p>
      {children}
    </div>
  );
}

function Bar({ value, max, tone }: { value: number; max: number; tone: string }) {
  return (
    <div className="mt-3 h-2 rounded-full bg-black/8">
      <motion.div className={`h-2 rounded-full ${tone}`} initial={false} animate={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </div>
  );
}

function Fixes({ fixes, onTry }: { fixes: FixAction[]; onTry: (f: FixAction) => void }) {
  return (
    <section>
      <h2 className="text-2xl font-extrabold">Your fastest wins</h2>
      <p className="mt-1 text-ink-soft">Ranked by how many lenders each change unlocks. Tap “Try it” to see the effect.</p>
      <ol className="mt-4 space-y-3">
        {fixes.map((f, i) => (
          <motion.li key={f.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} className="flex flex-wrap items-center gap-4 rounded-2xl bg-card p-5 ring-1 ring-line">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint-soft text-lg font-extrabold text-go">{i + 1}</span>
            <div className="min-w-0 flex-1">
              <p className="font-bold">{f.title}</p>
              <p className="text-sm text-ink-soft">{f.detail}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {f.unlocks > 0 && <Pill tone="go">+{f.unlocks} lender{f.unlocks > 1 ? 's' : ''} ready</Pill>}
                {f.powerGain >= 5_000 && <Pill tone="ink">+{fmtShortMoney(f.powerGain)} borrowing power</Pill>}
              </div>
            </div>
            <Button variant="soft" className="no-print" onClick={() => onTry(f)}>Try it</Button>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}

function Lenders({ results }: { results: LenderResult[] }) {
  const [filter, setFilter] = useState<MatchStatus | 'all'>('all');
  const [all, setAll] = useState(false);
  const matching = results.filter(r => filter === 'all' || r.status === filter);
  const shown = all ? matching : matching.slice(0, 12);
  const count = (s: MatchStatus) => results.filter(r => r.status === s).length;
  return (
    <section id="lenders" className="scroll-mt-6">
      <h2 className="text-2xl font-extrabold">Where you stand with each lender</h2>
      <p className="mt-1 text-ink-soft">Names are masked so nobody chases you. A broker can take your case to them directly.</p>
      <div className="no-print mt-4 flex flex-wrap gap-2" role="tablist">
        {(['all', 'ready', 'close', 'not_yet'] as const).map(f => (
          <button
            key={f}
            role="tab"
            aria-selected={filter === f}
            onClick={() => { setFilter(f); setAll(false); }}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${filter === f ? 'bg-ink text-white' : 'bg-card text-ink-soft ring-1 ring-line hover:ring-ink/40'}`}
          >
            {f === 'all' ? `All ${results.length}` : `${STATUS[f].label} ${count(f)}`}
          </button>
        ))}
      </div>
      <ul className="mt-4 space-y-3">
        <AnimatePresence initial={false}>
          {shown.map(r => (
            <motion.li key={r.lender.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <LenderRow r={r} />
            </motion.li>
          ))}
        </AnimatePresence>
        {shown.length === 0 && <li className="rounded-2xl bg-card p-6 text-center text-muted ring-1 ring-line">No lenders in this group.</li>}
      </ul>
      {matching.length > shown.length && (
        <button onClick={() => setAll(true)} className="no-print mt-3 w-full rounded-2xl bg-card py-3 font-semibold text-ink-soft ring-1 ring-line hover:ring-ink/40">
          Show all {matching.length} lenders
        </button>
      )}
    </section>
  );
}

function LenderRow({ r }: { r: LenderResult }) {
  const [open, setOpen] = useState(false);
  const st = STATUS[r.status];
  const issues = r.checks.filter(c => c.status === 'fail');
  const notes = r.checks.filter(c => c.status === 'warn');
  const lead = issues[0]?.detail ?? (r.usesScheme ? 'No blockers — and you can use the 5% Deposit Scheme here.' : 'No blockers found. A broker can start here.');
  return (
    <div className="rounded-2xl bg-card ring-1 ring-line">
      <button onClick={() => setOpen(o => !o)} aria-expanded={open} className="flex w-full items-center gap-4 p-5 text-left">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold">{lenderName(r.lender)}</span>
            <span className="text-sm text-muted">{r.lender.kind} · {r.rate.toFixed(2)}%</span>
            <Pill tone={st.tone}>{st.label}</Pill>
          </div>
          <p className="mt-1 text-sm text-ink-soft">{lead}{issues.length > 1 ? ` (+${issues.length - 1} more)` : ''}</p>
        </div>
        <div className="w-20 text-right">
          <p className="text-2xl font-extrabold tabular-nums">{r.score}%</p>
          <p className="text-xs text-muted">policy fit</p>
        </div>
        <span className={`text-muted transition ${open ? 'rotate-180' : ''}`} aria-hidden>⌄</span>
      </button>
      <div className="h-1.5 bg-black/5">
        <div className="h-1.5" style={{ width: `${r.score}%`, background: st.color }} />
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <ul className="space-y-2 p-5 pt-4">
              {[...issues, ...notes, ...r.checks.filter(c => c.status === 'pass')].map(c => (
                <li key={c.id} className="flex gap-3 text-sm">
                  <span className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-xs font-bold ${c.status === 'pass' ? 'bg-mint-soft text-go' : c.status === 'warn' ? 'bg-amber-soft text-amber' : 'bg-rose-soft text-rose'}`} aria-label={c.status}>
                    {c.status === 'pass' ? '✓' : c.status === 'warn' ? '!' : '✕'}
                  </span>
                  <span><span className="font-semibold">{c.label}.</span> {c.detail}</span>
                </li>
              ))}
              <li className="pt-2 text-xs text-muted">
                {r.lender.source === 'open-banking' ? `Live rate ${r.rate.toFixed(2)}% at your LVR (Open Banking, ${DATA_DATE})` : `Modelled rate ${r.rate.toFixed(2)}%`} · assessed at {r.assessmentRate.toFixed(2)}% · serviceable up to {fmtMoney(r.maxBorrow)}
                {r.lender.policySources ? ` · some rules confirmed from the lender’s website (${r.lender.policySources[0].retrieved})` : ''}
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WhatIf({ p, base, onChange }: { p: Profile; base: Profile; onChange: (p: Profile) => void }) {
  const dep = p.price - p.loan;
  const cash = base.savings + base.gift;
  const income = p.applicants[0].baseIncome;
  const rows = [
    { label: 'Purchase price', value: p.price, min: Math.round(base.price * 0.5 / 5000) * 5000, max: Math.round(base.price * 1.5 / 5000) * 5000, step: 5000,
      set: (v: number) => onChange({ ...p, price: v, loan: Math.max(0, v - dep) }) },
    { label: 'Deposit you put in', value: dep, min: 0, max: Math.max(cash * 1.5, dep, 50_000), step: 1000,
      set: (v: number) => onChange({ ...p, loan: Math.max(0, p.price - v), savings: Math.max(p.savings, v + upfrontCosts(p).total - p.gift) }) },
    { label: 'Credit card limits', value: p.cardLimits, min: 0, max: Math.max(30_000, base.cardLimits), step: 500,
      set: (v: number) => onChange({ ...p, cardLimits: v }) },
    { label: p.mode === 'joint' ? 'Your base income' : 'Base income', value: income, min: 0, max: Math.max(300_000, income * 1.5), step: 1000,
      set: (v: number) => onChange({ ...p, applicants: p.applicants.map((a, i) => (i ? a : { ...a, baseIncome: v })) }) },
  ];
  return (
    <section className="no-print rounded-3xl bg-card p-6 ring-1 ring-line lg:sticky lg:top-6">
      <h2 className="text-xl font-extrabold">What if…?</h2>
      <p className="mt-1 text-sm text-ink-soft">Drag to see how lenders react, instantly.</p>
      <div className="mt-5 space-y-5">
        {rows.map(r => (
          <label key={r.label} className="block">
            <span className="flex justify-between text-sm">
              <span className="font-semibold">{r.label}</span>
              <span className="font-bold tabular-nums">{fmtMoney(r.value)}</span>
            </span>
            <input type="range" min={r.min} max={r.max} step={r.step} value={r.value} onChange={e => r.set(Number(e.target.value))} className="mt-2 w-full" />
          </label>
        ))}
      </div>
    </section>
  );
}

function Duty({ p }: { p: Profile }) {
  const d = stampDuty(p);
  const saving = d.generalDuty - d.duty;
  return (
    <section className="rounded-3xl bg-card p-6 ring-1 ring-line">
      <p className="text-sm font-bold uppercase tracking-wider text-go">{p.state} stamp duty & grants</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums">{d.duty === 0 ? '$0 🎉' : fmtMoney(d.duty)}</p>
      <ul className="mt-3 space-y-1.5 text-sm">
        {d.concession && saving > 0 && <li className="text-go">✓ {d.concession} saves you {fmtMoney(saving)}</li>}
        {!d.concession && p.firstHome && <li className="text-ink-soft">No first home buyer concession applies to this purchase in {p.state}.</li>}
        {d.fhog > 0 && <li className="text-go">✓ First Home Owner Grant: {fmtMoney(d.fhog)}</li>}
        {d.foreignSurcharge > 0 && <li className="text-rose">Foreign purchaser surcharge: {fmtMoney(d.foreignSurcharge)}</li>}
      </ul>
      <p className="mt-3 text-xs text-muted">
        2026–27 rules. <a className="underline" href={d.source} target="_blank" rel="noreferrer">Official source</a>. Conditions apply — e.g. moving in within 12 months.
      </p>
    </section>
  );
}

function Scheme({ p }: { p: Profile }) {
  const s = depositScheme(p);
  return (
    <section className={`rounded-3xl p-6 ${s.eligible ? 'bg-mint-soft' : 'bg-card ring-1 ring-line'}`}>
      <p className="text-sm font-bold uppercase tracking-wider text-go">Government scheme</p>
      <h2 className="mt-1 text-xl font-extrabold">{s.variant === 'family' ? 'Family Home Guarantee' : '5% Deposit Scheme'}</h2>
      {s.eligible ? (
        <p className="mt-2 text-sm">
          Looks like you qualify: buy with as little as {s.minDepositPct}% deposit and <strong>no mortgage insurance</strong>, up to a {fmtMoney(s.cap)} price in your area.
          Only participating lenders offer it — we’ve factored that in.
        </p>
      ) : (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink-soft">
          {s.reasons.map(r => <li key={r}>{r}</li>)}
        </ul>
      )}
    </section>
  );
}

function Connect({ p, a, sample, onClose }: { p: Profile; a: Assessment; sample: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', preferred_time: 'Anytime', consent: false });
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [err, setErr] = useState('');
  const [touched, setTouched] = useState(false);
  const firstRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    firstRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const problems = {
    name: !form.name.trim() ? 'Add your name.' : '',
    email: !/^\S+@\S+\.\S+$/.test(form.email) ? 'Add a valid email.' : '',
    phone: form.phone.replace(/\D/g, '').length < 8 ? 'Add a phone number so the broker can call.' : '',
    consent: !form.consent ? 'Please confirm you’re happy to share your report.' : '',
  };
  const valid = !Object.values(problems).some(Boolean);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) return;
    setState('sending');
    try {
      await submitLead({
        ...form,
        profile: p,
        summary: summarise(p, a),
      });
      setState('done');
    } catch (ex) {
      setErr((ex as Error).message);
      setState('error');
    }
  };

  const input = 'w-full rounded-2xl border-2 border-line bg-card px-4 py-3 text-lg outline-none focus:border-ink';
  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-end bg-ink/50 p-0 sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="connect-title"
        className="w-full max-w-lg rounded-t-3xl bg-paper p-6 shadow-2xl sm:rounded-3xl sm:p-8"
        initial={{ y: 40 }}
        animate={{ y: 0 }}
        exit={{ y: 40 }}
        onClick={e => e.stopPropagation()}
      >
        {state === 'done' ? (
          <div className="text-center">
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-mint text-3xl">✓</div>
            <h2 id="connect-title" className="mt-4 text-2xl font-extrabold">You’re all set, {form.name.split(' ')[0]}.</h2>
            <p className="mt-2 text-ink-soft">A broker will be in touch {form.preferred_time === 'Anytime' ? 'soon' : `in the ${form.preferred_time.toLowerCase()}`} with your report already in hand.</p>
            {backendMode === 'local' && <p className="mt-3 text-xs text-muted">Demo mode: the lead was saved in this browser — see it on the <Link className="underline" to="/broker">broker dashboard</Link>.</p>}
            <Button className="mt-6" onClick={onClose}>Back to my report</Button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate className="space-y-4">
            <div>
              <h2 id="connect-title" className="text-2xl font-extrabold">Connect with a broker</h2>
              <p className="mt-1 text-ink-soft">We share your report with one broker: {BROKER.name}. No spam, no call centres.</p>
              <p className="mt-2 text-xs text-muted">{BROKER_DISCLOSURE}</p>
              {sample && <p className="mt-2 rounded-xl bg-amber-soft p-2 text-sm text-amber">You’re on the example report — this will share the sample buyer’s details.</p>}
            </div>
            <label className="block">
              <span className="font-semibold">Name</span>
              <input ref={firstRef} autoComplete="name" className={input} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              {touched && problems.name && <span className="text-sm text-rose">{problems.name}</span>}
            </label>
            <label className="block">
              <span className="font-semibold">Email</span>
              <input type="email" autoComplete="email" inputMode="email" className={input} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              {touched && problems.email && <span className="text-sm text-rose">{problems.email}</span>}
            </label>
            <label className="block">
              <span className="font-semibold">Mobile</span>
              <input type="tel" autoComplete="tel" inputMode="tel" className={input} value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="04xx xxx xxx" />
              {touched && problems.phone && <span className="text-sm text-rose">{problems.phone}</span>}
            </label>
            <fieldset>
              <legend className="font-semibold">Best time to call</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {['Morning', 'Afternoon', 'Evening', 'Anytime'].map(t => (
                  <button type="button" key={t} aria-pressed={form.preferred_time === t} onClick={() => setForm({ ...form, preferred_time: t })} className={`rounded-full px-4 py-2 text-sm font-semibold ${form.preferred_time === t ? 'bg-ink text-white' : 'bg-card ring-1 ring-line'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </fieldset>
            <label className="flex gap-3 rounded-2xl bg-card p-4 ring-1 ring-line">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[#0e3b3a]" checked={form.consent} onChange={e => setForm({ ...form, consent: e.target.checked })} />
              <span className="text-sm">I agree to share my answers and this report with {BROKER.name} so they can contact me about a home loan, as described in the <a href={`${import.meta.env.BASE_URL}privacy/`} target="_blank" rel="noreferrer" className="underline">privacy policy</a>.</span>
            </label>
            {touched && problems.consent && <p className="text-sm text-rose">{problems.consent}</p>}
            {state === 'error' && <p role="alert" className="rounded-xl bg-rose-soft p-3 text-sm text-rose">Couldn’t send: {err}</p>}
            <div className="flex gap-3 pt-2">
              <Button type="submit" size="lg" className="flex-1" disabled={state === 'sending'}>{state === 'sending' ? 'Sending…' : 'Send my report'}</Button>
              <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            </div>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
