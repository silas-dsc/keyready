import { SITE } from '../sites';
import { BROKER_DISCLOSURE } from '../sites/broker';
import type { Guide } from '../sites/types';

/**
 * A static, prerendered guide page. It ships without the app's JavaScript, so it must not use
 * the router or browser APIs: links are plain anchors back into the app.
 */
export default function GuidePage({ guide, appUrl }: { guide: Guide; appUrl: string }) {
  const updated = new Date(guide.updated).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
        <a href={appUrl} className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-ink">
          <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
            <rect width="32" height="32" rx="8" fill="currentColor" />
            <path d="M9 17l5 5 9-11" stroke="#50e3a4" strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {SITE.name}
        </a>
        <a href={`${appUrl}#/check`} className="rounded-xl bg-ink px-4 py-2 text-sm font-semibold text-white">Check my readiness</a>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-20 pt-6">
        <nav aria-label="Breadcrumb" className="text-sm text-muted">
          <a href={appUrl} className="underline underline-offset-2">{SITE.name}</a> › Guides
        </nav>
        <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{guide.title}</h1>
        <p className="mt-3 text-sm font-semibold text-go">Facts checked {updated}</p>
        <p className="mt-6 text-xl text-ink-soft">{guide.intro}</p>

        <a href={`${appUrl}#/check`} className="mt-8 flex items-center justify-between gap-4 rounded-3xl bg-ink p-6 text-white">
          <span>
            <span className="block text-lg font-bold">See where you stand in 5 minutes</span>
            <span className="text-white/70">Free self-check against lenders’ published rules. No credit check.</span>
          </span>
          <span className="text-2xl" aria-hidden>→</span>
        </a>

        {guide.sections.map(s => (
          <section key={s.heading} className="mt-12">
            <h2 className="text-2xl font-extrabold">{s.heading}</h2>
            {s.body.map(b => <p key={b} className="mt-4 leading-relaxed text-ink-soft">{b}</p>)}
            {s.table && (
              <div className="mt-6 overflow-x-auto rounded-2xl ring-1 ring-line">
                <table className="w-full min-w-[480px] bg-card text-left text-sm">
                  <thead className="bg-black/5">
                    <tr>{s.table.head.map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {s.table.rows.map(r => (
                      <tr key={r.join('|')}>{r.map((c, i) => <td key={i} className="px-4 py-3 align-top">{c}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {s.table?.head[0] === 'Lender' && (
              <p className="mt-3 text-xs text-muted">
                Each lender’s published criteria as at {updated}, from its own website. This is not a comparison or a recommendation: not every lender was checked, and lenders change these terms often.
              </p>
            )}
          </section>
        ))}

        {guide.faq && guide.faq.length > 0 && (
          <section className="mt-12">
            <h2 className="text-2xl font-extrabold">Common questions</h2>
            <div className="mt-6 divide-y divide-line rounded-3xl bg-card ring-1 ring-line">
              {guide.faq.map(([q, a]) => (
                <div key={q} className="p-5">
                  <h3 className="font-semibold">{q}</h3>
                  <p className="mt-2 text-ink-soft">{a}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-lg font-bold">Sources</h2>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-soft">
            {guide.sources.map(s => (
              <li key={s.url}><a href={s.url} className="underline underline-offset-2" rel="noopener">{s.label}</a></li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line">
        <p className="mx-auto max-w-4xl px-4 py-8 text-sm text-muted">
          {SITE.name} provides general information only, not credit assistance or financial advice. Lender policies change; always confirm with a licensed broker or the lender.
          {BROKER_DISCLOSURE} <a href={`${appUrl}privacy/`} className="underline underline-offset-2">Privacy policy</a>
        </p>
      </footer>
    </div>
  );
}
