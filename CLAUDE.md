# KeyReady

Mortgage readiness check for Australian home buyers. It's a static React + TypeScript SPA (Vite, Tailwind v4, framer-motion). The matching engine runs entirely in the browser, so the site hosts free on GitHub Pages. Supabase is optional and only stores broker leads (`supabase/schema.sql`).

## Commands

- `npm run dev` / `npm run build` / `npm run preview`
- `npm test`: vitest, engine only. Run before every commit.
- `node e2e/flow.cjs http://localhost:4173/ [screenshotDir]`: Playwright smoke test against `npm run preview`.
- `npm run import:cdr`: refresh `src/data/market.json` from Open Banking. Behind a proxy on Node 22, prefix with `NODE_USE_ENV_PROXY=1`.

## Layout

- `src/engine/`: pure TS, no React. `match.ts` (per-lender checks), `market.ts` (Open Banking data → lender policies, plus per-type defaults and `policy-overrides.json`), `duty.ts` (state stamp duty and grants, 2026–27), `finance.ts`, `actions.ts` ("fastest wins").
- `src/data/`: `market.json` (generated, refreshed weekly by `.github/workflows/refresh-data.yml`, never hand-edit), `scheme-lenders.json`, `policy-overrides.json` (hand-verified lender facts, each with sources).
- `src/wizard/steps.tsx`: questionnaire, one question per screen. `src/pages/`: Landing, Check, Report, Broker.
- `docs/RESEARCH.md`: teardown, UX research and data sources. `docs/VERIFICATION.md`: open data-verification checklist and log.

## Rules

- Every rate, threshold or policy figure needs an official source: a revenue office, legislation, the ATO, Housing Australia, or the lender's own site or Open Banking data. Put the URL in a comment or data file, and add a test using official worked examples where one exists.
- Engine tests use `ILLUSTRATIVE_LENDERS` so live data refreshes can't break them. Only `market.test.ts` touches live data, and only loosely.
- Lender names stay masked in the UI ("Lender 08") unless `VITE_SHOW_LENDER_NAMES=true`. Don't unmask by default; see the ASIC note in RESEARCH.md.
- Never present modelled policy (`KIND_DEFAULTS`, `ILLUSTRATIVE_LENDERS`) as a real lender's rule.
- Don't collect personal data beyond the consented broker-lead form.

## Verifying data with Chrome

Some data couldn't be verified from a cloud session (bot-protected revenue sites, browser-only calculators, lender policy pages). On a Mac with the Claude in Chrome extension, start Claude with `claude --chrome` (or run `/chrome`), then run **`/verify-data`** (optionally with IDs, e.g. `/verify-data A1 A5`). The procedure is in `.claude/skills/verify-data/SKILL.md`, and progress is tracked in `docs/VERIFICATION.md`.
