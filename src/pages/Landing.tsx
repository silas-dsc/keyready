import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo, Pill } from '../components/ui';
import { fmtShortMoney } from '../engine/finance';
import { assess } from '../engine/match';
import { sampleProfile } from '../engine/profile';
import { DATA_DATE, LENDER_COUNT, LIVE_COUNT, lenderName } from '../lib/lenderDisplay';
import { clearSaved, loadSaved } from '../lib/store';

const FAQ: [string, string][] = [
  ['Is it really free?', 'Yes. You can answer the questions, see your report and play with the what-if tools without paying or signing up. If you choose to talk to a broker, they pay us — you never do.'],
  ['Will this affect my credit score?', 'No. We don’t run a credit check. Your score is only touched when you formally apply with a lender — and a broker helps you apply once, to the right one, instead of collecting enquiries.'],
  ['How does the matching work?', 'We model each lender’s policy rules — residency, time in job, how they shade overtime and bonuses, LVR limits, genuine savings, debt-to-income caps — and stress-test your repayments at 3% above the rate, as APRA requires.'],
  ['Which lenders do you check?', `${LIVE_COUNT} Australian banks and lenders — majors, customer-owned banks, online lenders and more — using the rates, LVR limits and residency rules they publish through Open Banking (updated ${DATA_DATE}), plus two modelled specialist lenders. Rules banks don’t publish, like time in job, are typical settings for each type of lender.`],
  ['What happens to my answers?', 'They stay in your browser until you choose to share them with a broker. You can clear them at any time.'],
  ['How is this different from a broker?', 'Think of it as preparation. You walk in knowing where you stand and what to fix, so the conversation starts at “let’s apply” instead of “let’s see”.'],
];

export default function Landing() {
  const nav = useNavigate();
  const saved = loadSaved();
  const inProgress = saved && saved.answered.length > 0;
  const sample = useMemo(() => assess(sampleProfile()), []);

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo />
        <nav className="flex items-center gap-1 text-sm font-semibold">
          <a href="#how" className="hidden rounded-xl px-3 py-2 text-ink-soft hover:bg-black/5 sm:block">How it works</a>
          <a href="#faq" className="hidden rounded-xl px-3 py-2 text-ink-soft hover:bg-black/5 sm:block">FAQ</a>
          <Link to="/broker" className="rounded-xl px-3 py-2 text-ink-soft hover:bg-black/5">For brokers</Link>
          <Link to="/check" className="rounded-xl bg-ink px-4 py-2 text-white">Start</Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 pt-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <Pill tone="go">Free · 5 minutes · no credit check</Pill>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              Know which lenders will say <span className="relative whitespace-nowrap text-go">yes<svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden><path d="M2 7 Q 50 1 98 6" stroke="#50e3a4" strokeWidth="4" fill="none" strokeLinecap="round" /></svg></span> — before you apply.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
              Answer a few easy questions. We check your situation against {LENDER_COUNT} lenders’ rules and show who’d say yes, who’s close, and exactly what to fix.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/check" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-ink px-7 py-4 text-lg font-semibold text-white shadow-[0_10px_30px_-10px_rgba(14,59,58,.7)] transition hover:-translate-y-0.5">
                Check my readiness <span aria-hidden>→</span>
              </Link>
              <Link to="/report?sample" className="inline-flex items-center justify-center whitespace-nowrap rounded-2xl px-7 py-4 text-lg font-semibold text-ink ring-2 ring-line transition hover:ring-ink/40">
                See an example report
              </Link>
            </div>
            {inProgress && (
              <div className="mt-6 flex flex-wrap items-center gap-3 rounded-2xl bg-mint-soft px-4 py-3 text-sm">
                <span className="font-semibold">{saved.completed ? 'Your report is ready.' : `Welcome back — you’re ${saved.answered.length} answers in.`}</span>
                <button onClick={() => nav(saved.completed ? '/report' : '/check')} className="font-bold text-go underline underline-offset-2">
                  {saved.completed ? 'View my report' : 'Pick up where I left off'}
                </button>
                <button onClick={() => { clearSaved(); nav(0); }} className="text-muted underline underline-offset-2">Start over</button>
              </div>
            )}
            <ul className="mt-8 grid grid-cols-2 gap-x-6 gap-y-2 text-sm font-semibold text-ink-soft sm:grid-cols-4">
              {['No sign-up', 'No payslips', 'No credit check', 'Your data stays yours'].map(t => (
                <li key={t} className="flex items-center gap-2"><span className="text-go">✓</span>{t}</li>
              ))}
            </ul>
          </div>

          <motion.div initial={{ opacity: 0, y: 20, rotate: 1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.6 }} className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-mint/40 to-transparent blur-2xl" aria-hidden />
            <div className="rounded-3xl bg-card p-6 shadow-2xl ring-1 ring-line">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Example readiness report</p>
              <p className="mt-2 text-2xl font-extrabold leading-snug">
                <span className="text-go">{sample.ready} of {LENDER_COUNT} lenders</span> would likely say yes.
              </p>
              <p className="text-sm text-ink-soft">Borrowing power ~{fmtShortMoney(sample.borrowingPower.typical)} · LVR {sample.lvr.toFixed(0)}%</p>
              <ul className="mt-5 space-y-2">
                {sample.results.slice(0, 2).concat(sample.results.filter(r => r.status !== 'ready').slice(0, 2)).map(r => (
                  <li key={r.lender.id} className="rounded-2xl bg-paper p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{lenderName(r.lender)}</span>
                      <span className="flex items-center gap-2">
                        <Pill tone={r.status === 'ready' ? 'go' : r.status === 'close' ? 'amber' : 'rose'}>{r.status === 'ready' ? 'Likely yes' : r.status === 'close' ? 'Close' : 'Not yet'}</Pill>
                        <span className="font-extrabold tabular-nums">{r.score}%</span>
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-ink-soft">{r.checks.find(c => c.status === 'fail')?.detail ?? 'No blockers found.'}</p>
                  </li>
                ))}
              </ul>
              <Link to="/report?sample" className="mt-4 block text-center text-sm font-bold text-go underline underline-offset-2">Explore the full example →</Link>
            </div>
          </motion.div>
        </section>

        <section className="bg-ink py-20 text-white">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">
              You shouldn’t need to call five brokers to find out <span className="text-mint">if you qualify.</span>
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {[
                ['🎯', 'Who says yes', 'Every lender scored against its own rules, with a plain-English reason for each result.'],
                ['🧭', 'What to fix', 'Your fastest wins, ranked by how many lenders each one unlocks — like cancelling an unused card.'],
                ['🎛️', 'What if', 'Drag the price, deposit or income and watch lenders flip to “yes” in real time.'],
              ].map(([i, t, d]) => (
                <div key={t} className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
                  <span className="text-3xl" aria-hidden>{i}</span>
                  <h3 className="mt-3 text-xl font-bold">{t}</h3>
                  <p className="mt-2 text-white/70">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-20">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Three steps to clarity</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              ['Tell us your situation', 'One question at a time: work, money, the home you want. Ballparks are fine — no documents.'],
              ['We run the numbers', 'Income shading, a 3% stress test, living-cost benchmarks, LVR, stamp duty and scheme rules — for each lender.'],
              ['Walk in prepared', 'See your result instantly. Share it with a broker only if and when you want to.'],
            ].map(([t, d], i) => (
              <li key={t} className="rounded-3xl bg-card p-6 ring-1 ring-line">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint-soft text-lg font-extrabold text-go">{i + 1}</span>
                <h3 className="mt-4 text-xl font-bold">{t}</h3>
                <p className="mt-2 text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
          <div className="mt-10 text-center">
            <Link to="/check" className="inline-flex rounded-2xl bg-ink px-7 py-4 text-lg font-semibold text-white">Start — it takes 5 minutes</Link>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-6 px-4 pb-20">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Questions</h2>
          <div className="mt-8 divide-y divide-line rounded-3xl bg-card ring-1 ring-line">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-semibold">
                  {q}
                  <span className="text-2xl text-muted transition group-open:rotate-45" aria-hidden>+</span>
                </summary>
                <p className="mt-3 text-ink-soft">{a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-6xl space-y-3 px-4 py-10 text-sm text-muted">
          <Logo />
          <p className="max-w-3xl">
            KeyReady is a prototype that provides general information only. It is not credit assistance or financial advice. Rates, LVR limits and residency rules come from lenders’ public Open Banking data;
            other policy rules are typical settings, not any lender’s own policy. Always confirm with a licensed mortgage broker or lender.
          </p>
        </div>
      </footer>
    </div>
  );
}
