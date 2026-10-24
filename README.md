# KeyReady — mortgage readiness check

Find out which Australian lenders would likely say **yes** before you talk to a broker. Answer about 18 quick questions (no documents, no sign-up, no credit check) and get an instant report:

- **Who says yes, who's close, who's not yet**: 12 lender policy profiles, each with plain-English reasons
- **Borrowing power**: stress-tested at +3% (the APRA serviceability buffer), with lender-specific income shading, a HEM-style expense floor, card limits at 3.8%/month and HECS repayments
- **Your fastest wins**: simulated fixes (cancel card limits, save $X, lower the price, wait N months in your role) ranked by how many lenders each one unlocks
- **What-if sliders**: drag the price, deposit, card limits or income and watch lenders flip live
- **5% Deposit Scheme / Family Home Guarantee** eligibility, stamp duty concession, LMI estimate
- **Broker hand-off**: consented lead capture plus a broker dashboard

> Prototype. Lender policies in `src/engine/lenders.ts` are illustrative archetypes, not any real bank's policy. General information only — not credit assistance.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine unit tests (vitest)
npm run build      # static site in dist/
node e2e/flow.cjs http://localhost:4173/   # end-to-end smoke test against `npm run preview` (needs Playwright)
```

## Free hosting

The app is a static single-page app. Everything, including the matching engine, runs in the browser, so it costs nothing to host.

- **GitHub Pages** (configured): enable *Settings → Pages → Source: GitHub Actions* and add the repo variable `DEPLOY_PAGES=true`. Each push to `main` then runs the tests and deploys. On a free GitHub plan, Pages requires the repo to be public.
- **Cloudflare Pages / Netlify / Vercel**: build command `npm run build`, output `dist`.

### Optional backend: Supabase free tier

Without configuration, answers and leads are stored in the visitor's browser (demo mode). To collect leads centrally:

1. Create a free Supabase project and run `supabase/schema.sql` in the SQL editor. Row-level security means anonymous visitors can only *insert* consented leads, and only registered brokers can read them.
2. Add a broker: create an Auth user, then `insert into brokers (user_id, business_name) values ('<uuid>', 'My Brokerage');`
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (locally in `.env`, or as GitHub repo *Variables* for the Pages build).

Brokers sign in at `#/broker` with an email magic link.

## Structure

```
src/engine/       pure TypeScript, no UI — easy to test or move server-side
  finance.ts      tax, HECS, expenses, repayments, stamp duty, LMI, 5% Deposit Scheme caps
  lenders.ts      12 illustrative lender policies (swap for curated data)
  match.ts        per-lender checks → ready / close / not yet, score, borrowing power
  actions.ts      "fastest wins" simulator
src/wizard/       question definitions (one question per screen, branching for joint / self-employed)
src/pages/        Landing, Check (questionnaire), Report, Broker
supabase/         optional database schema with RLS
docs/RESEARCH.md  teardown of the reference site and the UX/lending research behind the design
```
