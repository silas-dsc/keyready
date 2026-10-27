import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo, Pill } from '../components/ui';
import { fmtShortMoney } from '../engine/finance';
import { assess } from '../engine/match';
import { DATA_DATE, LENDER_COUNT, LIVE_COUNT, lenderName } from '../lib/lenderDisplay';
import { clearSaved, loadSaved } from '../lib/store';
import { SITE, SITES, siteUrl } from '../sites';
import { BROKER_DISCLOSURE } from '../sites/broker';

const lenderFaq: [string, string] = [
  'Which lenders do you check?',
  `${LIVE_COUNT} Australian banks and lenders — majors, customer-owned banks, online lenders and more — using the rates, LVR limits and residency rules they publish through Open Banking (updated ${DATA_DATE}), plus two modelled specialist lenders. Rules banks don’t publish, like time in job, are typical settings for each type of lender.`,
];

export default function Landing() {
  const nav = useNavigate();
  const saved = loadSaved();
  const inProgress = saved && saved.answered.length > 0;
  const sample = useMemo(() => assess(SITE.sample()), []);
  const faq = [...SITE.faq.slice(0, 2), lenderFaq, ...SITE.faq.slice(2)];
  const [before, highlight, after] = SITE.hero.title;

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
            <Pill tone="go">{SITE.hero.pill}</Pill>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
              {before}<span className="text-go underline decoration-mint decoration-[0.12em] underline-offset-[0.18em] [text-decoration-skip-ink:none]">{highlight}</span>{after}
            </h1>
            <p className="mt-6 max-w-xl text-lg text-ink-soft sm:text-xl">
              {SITE.hero.sub} <span className="whitespace-nowrap">{LENDER_COUNT} lenders checked.</span>
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
              {SITE.hero.ticks.map(t => (
                <li key={t} className="flex items-center gap-2"><span className="text-go">✓</span>{t}</li>
              ))}
            </ul>
          </div>

          <motion.div initial={{ opacity: 0, y: 20, rotate: 1 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ duration: 0.6 }} className="relative">
            <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-gradient-to-br from-mint/40 to-transparent blur-2xl" aria-hidden />
            <div className="rounded-3xl bg-card p-6 shadow-2xl ring-1 ring-line">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Example readiness report</p>
              <p className="mt-2 text-2xl font-extrabold leading-snug">
                Fits the published rules of <span className="text-go">{sample.ready} of {LENDER_COUNT} lenders</span>.
              </p>
              <p className="text-sm text-ink-soft">Borrowing power ~{fmtShortMoney(sample.borrowingPower.typical)} · LVR {sample.lvr.toFixed(0)}%</p>
              <ul className="mt-5 space-y-2">
                {sample.results.slice(0, 2).concat(sample.results.filter(r => r.status !== 'ready').slice(0, 2)).map(r => (
                  <li key={r.lender.id} className="rounded-2xl bg-paper p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{lenderName(r.lender)}</span>
                      <span className="flex items-center gap-2">
                        <Pill tone={r.status === 'ready' ? 'go' : r.status === 'close' ? 'amber' : 'rose'}>{r.status === 'ready' ? 'Fits' : r.status === 'close' ? 'Close' : 'Not yet'}</Pill>
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
              {SITE.pitch.title[0]}<span className="text-mint">{SITE.pitch.title[1]}</span>
            </h2>
            <div className="mt-12 grid gap-6 sm:grid-cols-3">
              {SITE.pitch.points.map(([i, t, d]) => (
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

        {SITE.guides.length > 0 && (
          <section id="guides" className="mx-auto max-w-6xl scroll-mt-6 px-4 pb-20">
            <h2 className="text-3xl font-extrabold sm:text-4xl">Guides</h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-2">
              {SITE.guides.map(g => (
                <li key={g.slug}>
                  <a href={`${import.meta.env.BASE_URL}guides/${g.slug}/`} className="block h-full rounded-3xl bg-card p-6 ring-1 ring-line transition hover:ring-ink/40">
                    <h3 className="text-lg font-bold">{g.title}</h3>
                    <p className="mt-2 text-sm text-ink-soft">{g.description}</p>
                    <p className="mt-3 text-xs text-muted">Checked {new Date(g.updated).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-6 px-4 pb-20">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Questions</h2>
          <div className="mt-8 divide-y divide-line rounded-3xl bg-card ring-1 ring-line">
            {faq.map(([q, a]) => (
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
            {SITE.name} provides general information only. It is not credit assistance or financial advice. It is a self-check against lenders’ published rules, not a comparison service or a recommendation. Rates, LVR limits and residency rules come from lenders’ public Open Banking data;
            other policy rules are typical settings, not any lender’s own policy. Always confirm with a licensed mortgage broker or lender.
            {BROKER_DISCLOSURE}{' '}
            <a href={`${import.meta.env.BASE_URL}privacy/`} className="underline underline-offset-2 hover:text-ink">Privacy policy</a>
          </p>
          {SITE.id !== 'core' && (
            <p>
              Part of the <a href={siteUrl(SITES.core) + '/'} className="underline underline-offset-2 hover:text-ink">{SITES.core.name}</a> family of home-loan readiness checks.
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
