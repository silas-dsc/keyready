# KeyReady — mortgage readiness check

Find out which Australian lenders would likely say **yes** before you talk to a broker. Answer about 18 quick questions (no documents, no sign-up, no credit check) and get an instant report:

- **Who says yes, who's close, who's not yet**: ~90 real Australian lenders using **live Open Banking data** (rates by LVR band, max LVR, residency rules), refreshed weekly, each with plain-English reasons
- **Exact stamp duty and grants for all 8 states/territories (2026–27)**: first home buyer concessions, owner-occupier rates, First Home Owner Grants and foreign surcharges, tested against official worked examples
- **Borrowing power**: stress-tested at +3% (the APRA serviceability buffer), with lender-specific income shading, a HEM-style expense floor, card limits at 3.8%/month and HECS repayments
- **Your fastest wins**: simulated fixes (cancel card limits, save $X, lower the price, wait N months in your role) ranked by how many lenders each one unlocks
- **What-if sliders**: drag the price, deposit, card limits or income and watch lenders flip live
- **5% Deposit Scheme / Family Home Guarantee** eligibility, stamp duty concession, LMI estimate
- **Broker hand-off**: consented lead capture plus a broker dashboard

> Prototype. Rates, LVR limits and residency rules are each lender's published Open Banking data; credit-policy rules banks don't publish (time in job, income shading, DTI caps) are typical settings per lender type. Lender names are masked by default. General information only — not credit assistance.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine unit tests (vitest)
npm run build      # static site in dist/
node e2e/flow.cjs http://localhost:4173/   # end-to-end smoke test against `npm run preview` (needs Playwright)
npm run import:cdr # refresh src/data/market.json from Open Banking (behind a proxy: NODE_USE_ENV_PROXY=1)
```

A scheduled GitHub Action (`refresh-data.yml`) re-imports the data weekly and commits it if anything changed. Set `VITE_SHOW_LENDER_NAMES=true` to show real brand names instead of "Lender 08" (see docs/RESEARCH.md before doing this publicly).

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
  finance.ts      tax, HECS, expenses, repayments, LMI, 5% Deposit Scheme caps
  duty.ts         stamp duty, concessions, FHOG and surcharges for all states (2026–27)
  market.ts       turns Open Banking data into lender policies (+ per-type credit-policy defaults)
  lenders.ts      illustrative lender archetypes (used for specialists and deterministic tests)
  match.ts        per-lender checks → ready / close / not yet, score, borrowing power
  actions.ts      "fastest wins" simulator
src/data/         market.json (Open Banking snapshot), scheme-lenders.json (5% Deposit Scheme panel)
scripts/          import-cdr.mjs — the Open Banking importer
src/wizard/       question definitions (one question per screen, branching for joint / self-employed)
src/pages/        Landing, Check (questionnaire), Report, Broker
supabase/         optional database schema with RLS
docs/RESEARCH.md  teardown of the reference site and the UX/lending research behind the design
```
