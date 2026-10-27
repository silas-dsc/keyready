# KeyReady

A family of Australian home-loan readiness sites (hub + professionals, nurses, self-employed, expats) built from one React + TypeScript codebase and **one rules engine**, plus an MCP server on the same engine. Static sites on GitHub Pages. Supabase stores consented leads and runs the Edge Functions (MCP, lead emails via Knock + Resend). See README.md, docs/BACKEND.md and docs/GROWTH.md.

## Commands

- `npm run dev` (one site; `VITE_SITE=<id>` picks which) / `npm run build` (all sites → dist/, prerendered)
- `npm test`: vitest — engine, duty, segments and the MCP server end to end. Run before every commit.
- `npm run bundle:rules`: bundle engine + MCP server into `supabase/functions/_shared/` (generated, git-ignored).
- `npm run watch:rules`: snapshot official sources in `rules/sources.json`.
- `node e2e/flow.cjs http://localhost:4173/ [screenshotDir]`: Playwright smoke test against `npm run preview`.
- `npm run import:cdr`: refresh `src/data/market.json` from Open Banking. Behind a proxy on Node 22, prefix with `NODE_USE_ENV_PROXY=1`.

## Layout

- `src/engine/`: pure TS, no React. `match.ts` (per-lender checks), `market.ts` (Open Banking data → lender policies, plus per-type defaults and `policy-overrides.json`), `duty.ts` (state stamp duty and grants, 2026–27), `finance.ts`, `actions.ts` ("fastest wins").
- `src/data/`: `market.json` (generated, refreshed weekly by `.github/workflows/refresh-data.yml`, never hand-edit), `scheme-lenders.json`, `policy-overrides.json` (hand-verified lender facts, each with sources).
- `src/engine/segments.ts` + `src/data/segment-policies.json`: profession LMI waivers, alt-doc lending, expat and foreign-income rules, each with a lender source.
- `src/sites/<id>.ts`: per-site config (copy, theme, guides, wizard questions). `src/sites/broker.ts`: the one referral broker and its licence disclosure.
- `src/mcp/server.ts`: MCP tools; `supabase/functions/`: Edge Functions; `supabase/migrations/`: schema + RLS; `.knock/`: email workflows.
- `src/wizard/steps.tsx`: questionnaire, one question per screen. `src/pages/`: Landing, Check, Report, Broker, GuidePage (static).
- `docs/RESEARCH.md`: teardown, UX research and data sources. `docs/VERIFICATION.md`: open data-verification checklist and log.

## Rules

- Every rate, threshold or policy figure needs an official source: a revenue office, legislation, the ATO, Housing Australia, or the lender's own site or Open Banking data. Put the URL in a comment or data file, and add a test using official worked examples where one exists.
- Engine tests use `ILLUSTRATIVE_LENDERS` so live data refreshes can't break them. Only `market.test.ts` touches live data, and only loosely.
- Lender names stay masked in the UI ("Lender 08") unless `VITE_SHOW_LENDER_NAMES=true`. Don't unmask by default; see the ASIC note in RESEARCH.md.
- Never present modelled policy (`KIND_DEFAULTS`, `ILLUSTRATIVE_LENDERS`) as a real lender's rule.
- Don't collect personal data beyond the consented broker-lead form. Never commit the broker's email or any secret — they live in Supabase and GitHub secrets.
- Copy must not claim to compare, recommend or predict approval (ASIC RG 234; see docs/GROWTH.md §2). Say "fits the published rules", name the one broker and disclose the fee at every referral point (`BROKER_DISCLOSURE`).
- A new official source the engine depends on goes in `rules/sources.json` so the rules watch covers it.

## Verifying data with Chrome

Some data couldn't be verified from a cloud session (bot-protected revenue sites, browser-only calculators, lender policy pages). On a Mac with the Claude in Chrome extension, start Claude with `claude --chrome` (or run `/chrome`), then run **`/verify-data`** (optionally with IDs, e.g. `/verify-data A1 A5`). The procedure is in `.claude/skills/verify-data/SKILL.md`, and progress is tracked in `docs/VERIFICATION.md`.
