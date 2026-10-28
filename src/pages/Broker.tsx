import { useEffect, useMemo, useState } from 'react';
import { Logo, Pill } from '../components/ui';
import { fmtShortMoney } from '../engine/finance';
import { leadSource } from '../lib/lead-email';
import { backendMode, claimBroker, getSupabase, LEAD_STATUSES, listLeads, setLeadStatus, type Lead, type LeadStatus } from '../lib/leads';
import { SITES } from '../sites';

export default function Broker() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [signedIn, setSignedIn] = useState(backendMode === 'local');

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let unsub = () => {};
    sb.then(c => {
      c.auth.getSession().then(({ data }) => setSignedIn(!!data.session));
      const { data } = c.auth.onAuthStateChange((_e, session) => setSignedIn(!!session));
      unsub = () => data.subscription.unsubscribe();
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!signedIn) return;
    claimBroker()
      .then(b => {
        if (!b) throw new Error('This account isn’t registered as a broker yet. Ask the operator to add your email.');
        return listLeads();
      })
      .then(setLeads)
      .catch(e => setError((e as Error).message));
  }, [signedIn]);

  const updateStatus = async (id: string, status: LeadStatus) => {
    try {
      await setLeadStatus(id, status);
      setLeads(ls => ls!.map(l => (l.id === id ? { ...l, status } : l)));
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // Conversion by site: which sub-market is worth doubling down on.
  const funnel = useMemo(() => {
    const rows = new Map<string, { leads: number; contacted: number; settled: number; lost: number }>();
    for (const l of leads ?? []) {
      const r = rows.get(l.site ?? 'core') ?? { leads: 0, contacted: 0, settled: 0, lost: 0 };
      r.leads++;
      if (['contacted', 'application', 'approved', 'settled'].includes(l.status ?? 'new')) r.contacted++;
      if (l.status === 'settled') r.settled++;
      if (l.status === 'lost') r.lost++;
      rows.set(l.site ?? 'core', r);
    }
    return [...rows.entries()];
  }, [leads]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await (await getSupabase()!).auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.href } });
    if (error) setError(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-dvh">
      <header className="bg-ink">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Logo light />
          <span className="text-sm font-semibold text-mint">Broker dashboard</span>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="text-3xl font-extrabold">Pre-qualified leads</h1>
        <p className="mt-1 text-ink-soft">Every lead arrives with a readiness report: which lenders fit, LVR and borrowing power, so the first call starts at “let’s apply”.</p>
        {backendMode === 'local' && (
          <p className="mt-4 rounded-2xl bg-amber-soft p-4 text-sm text-amber">
            Demo mode: showing leads submitted from this browser. Connect Supabase (see README) to collect leads from everyone.
          </p>
        )}

        {!signedIn ? (
          <form onSubmit={signIn} className="mt-8 max-w-md space-y-3 rounded-3xl bg-card p-6 ring-1 ring-line">
            <h2 className="text-xl font-bold">Broker sign in</h2>
            {sent ? (
              <p>Check your inbox for a sign-in link.</p>
            ) : (
              <>
                <input type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@brokerage.com.au" className="w-full rounded-2xl border-2 border-line px-4 py-3 outline-none focus:border-ink" />
                <button className="w-full rounded-2xl bg-ink px-5 py-3 font-semibold text-white">Email me a sign-in link</button>
              </>
            )}
          </form>
        ) : error ? (
          <p className="mt-8 rounded-2xl bg-rose-soft p-4 text-rose">{error}</p>
        ) : !leads ? (
          <p className="mt-8 text-muted">Loading…</p>
        ) : leads.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-card p-10 text-center ring-1 ring-line">
            <p className="text-lg font-semibold">No leads yet.</p>
            <p className="mt-1 text-muted">Complete a check and choose “Connect with a broker” to see one appear here.</p>
          </div>
        ) : (
          <>
          <section className="mt-8 overflow-x-auto rounded-3xl bg-card ring-1 ring-line" aria-label="Conversion by site">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-black/5">
                <tr>{['Site', 'Leads', 'Contacted', 'Settled', 'Lost', 'Settle rate'].map(h => <th key={h} className="px-4 py-3 font-bold">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-line">
                {funnel.map(([site, r]) => (
                  <tr key={site}>
                    <td className="px-4 py-3 font-semibold">{SITES[site]?.name ?? site}</td>
                    <td className="px-4 py-3">{r.leads}</td>
                    <td className="px-4 py-3">{r.contacted}</td>
                    <td className="px-4 py-3">{r.settled}</td>
                    <td className="px-4 py-3">{r.lost}</td>
                    <td className="px-4 py-3">{Math.round((r.settled / r.leads) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <ul className="mt-8 space-y-3">
            {leads.map(l => {
              const a0 = l.profile.applicants[0];
              const tone = l.summary.ready > 0 ? 'go' : l.summary.close > 0 ? 'amber' : 'rose';
              return (
                <li key={l.id} className="rounded-2xl bg-card ring-1 ring-line">
                  <button onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id} className="grid w-full gap-3 p-5 text-left sm:grid-cols-[1.3fr_1fr_1fr_1fr_auto] sm:items-center">
                    <div>
                      <p className="font-bold">{l.name}</p>
                      <p className="text-sm text-muted">
                        {new Date(l.created_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })} · {SITES[l.site]?.name ?? l.site ?? 'KeyReady'}{l.channel === 'mcp' ? ' · via AI assistant' : ''}
                      </p>
                    </div>
                    <div><Pill tone={tone}>{l.summary.ready} ready · {l.summary.close} close</Pill></div>
                    <div className="text-sm"><span className="text-muted">Loan</span> <strong>{fmtShortMoney(l.profile.loan)}</strong> · LVR {l.summary.lvr}%</div>
                    <div className="text-sm"><span className="text-muted">Power</span> <strong>{fmtShortMoney(l.summary.borrowingPower)}</strong></div>
                    <span className="text-muted" aria-hidden>⌄</span>
                  </button>
                  {open === l.id && (
                    <dl className="grid gap-x-8 gap-y-2 border-t border-line p-5 text-sm sm:grid-cols-3">
                      {[
                        ['Email', l.email], ['Mobile', l.phone], ['Best time', l.preferred_time],
                        ['Applicants', l.profile.mode === 'joint' ? 'Joint' : 'Solo'], ['First home', l.profile.firstHome ? 'Yes' : 'No'], ['Purpose', l.profile.purpose],
                        ['Income (B1)', fmtShortMoney(a0.baseIncome)], ['Employment (B1)', a0.employment.replace('_', ' ')], ['Savings', fmtShortMoney(l.profile.savings)],
                        ['Price', fmtShortMoney(l.profile.price)], ['State', l.profile.state], ['Closest fits', l.summary.topLenders.join(', ') || '—'],
                        ['Source', leadSource(l.attribution)],
                        ['Stamp duty', l.summary.stampDuty !== undefined ? fmtShortMoney(l.summary.stampDuty) : '—'], ['Grant', l.summary.fhog ? fmtShortMoney(l.summary.fhog) : '—'],
                      ].map(([k, v]) => (
                        <div key={k} className="flex justify-between gap-3 sm:block">
                          <dt className="text-muted">{k}</dt>
                          <dd className="font-semibold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-3 text-sm">
                    <span className="text-muted">Outcome:</span>
                    {LEAD_STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => updateStatus(l.id, s)}
                        aria-pressed={(l.status ?? 'new') === s}
                        className={`rounded-full px-3 py-1 font-semibold capitalize ${(l.status ?? 'new') === s ? 'bg-ink text-white' : 'bg-black/5 text-ink-soft hover:bg-black/10'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
          </>
        )}
      </main>
    </div>
  );
}
