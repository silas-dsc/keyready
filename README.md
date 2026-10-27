# KeyReady — a family of home-loan readiness sites on one rules engine

Free Australian home-loan readiness checks for specific sub-markets. Each checks a borrower against ~90 lenders' **published rules** (live Open Banking rates, LVR limits, residency rules), APRA's 3% buffer, exact 2026–27 stamp duty and grants, the 5% Deposit Scheme, and segment rules (profession LMI waivers, alt-doc lending, foreign income). With consent, it refers the borrower to one broker: Goodlend Mortgage Brokers.

| Site | For | Preview |
|---|---|---|
| **KeyReady** (hub) | first home buyers, everyone | https://silas-dsc.github.io/keyready/ |
| **LMI Waiver Check** | doctors, dentists, vets, lawyers, accountants | https://silas-dsc.github.io/keyready/professionals/ |
| **Nurse Home Loan Check** | nurses, midwives, allied health | https://silas-dsc.github.io/keyready/nurses/ |
| **Low Doc Check** | self-employed, tradies | https://silas-dsc.github.io/keyready/self-employed/ |
| **Expat Loan Check** | Australians abroad, foreign income | https://silas-dsc.github.io/keyready/expats/ |
| **MCP server** | Claude, ChatGPT, Gemini, Perplexity… | https://silas-dsc.github.io/keyready/mcp/ |

> General information only. Not credit assistance, a comparison service or a recommendation. See docs/GROWTH.md §2 before launch.

## One engine, many sites

```
src/engine/ + src/data/   THE rules: lenders (Open Banking), duty.ts (8 states), segments.ts (+ segment-policies.json), policy-overrides.json
      │
      ├── src/sites/<id>.ts   per-site config: brand, theme, copy, guides (SEO pages), wizard questions, sample
      │      └── scripts/build-sites.mjs → dist/ (hub) + dist/<id>/ — prerendered HTML, JSON-LD, sitemap, robots, llms.txt, privacy
      │
      └── src/mcp/server.ts   MCP tools on the same engine → bundled into supabase/functions (scripts/bundle-rules.mjs)
```

A rule changes in one place and every site, plus the MCP server, picks it up on the next deploy. To add a site, add `src/sites/<id>.ts` and register it in `src/sites/index.ts`.

### Keeping the rules current (automated)
- **Weekly Open Banking refresh** (`refresh-data.yml`): every lender's rates, LVR limits and residency rules. It redeploys the sites and the MCP server.
- **Weekly rules watch** (`rules-watch.yml`): snapshots ~30 official pages (revenue offices, ATO, Housing Australia, legislation) listed in `rules/sources.json`. It opens a `rules-watch` issue when a page changes or a time-limited rule is about to expire, for example NT's $50k grant (Sep 2027) or the 1 July rollovers.
- **Optional rules agent** (`rules-agent.yml`, needs `ANTHROPIC_API_KEY`): Claude reads that issue, checks the official pages and opens a PR with updated rules and tests.
- **Bot-blocked sources:** checked by hand with `/verify-data` in Claude Code with Chrome (see CLAUDE.md).

## Run it

```bash
npm install
npm run dev                 # one site (VITE_SITE=professionals npm run dev for another)
npm test                    # engine, duty (official examples), segments, MCP end-to-end
npm run build               # all sites → dist/
npm run bundle:rules        # engine + MCP server → supabase/functions/_shared/
npm run import:cdr          # refresh Open Banking data   (behind a proxy: NODE_USE_ENV_PROXY=1)
npm run watch:rules         # rules watch locally
```

## Hosting (free)
- **Sites:** GitHub Pages, all five under one repo, deployed on every push to `main`. For custom domains, `npm run build:sites -- --target=domains` produces one root-based build per site.
- **Backend:** Supabase (leads, broker dashboard, Edge Functions for MCP and email), Knock (email workflows in `.knock/`) and Resend. Setup is in **docs/BACKEND.md**.

## Docs
- docs/GROWTH.md: sub-market economics, compliance, domains, SEO and AI visibility, 90-day plan
- docs/BACKEND.md: Supabase, Knock, Resend and MCP setup
- docs/RESEARCH.md: original teardown, UX research, data sources
- docs/VERIFICATION.md: open data-verification checklist
