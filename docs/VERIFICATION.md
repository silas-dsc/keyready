# Data verification checklist

Items here couldn't be verified automatically from a cloud session: the sites block bots, need a real browser, or the data isn't published as an API. They're meant to be worked through by Claude Code on a Mac with Claude-controlled Chrome, using `/verify-data` (see `.claude/skills/verify-data/SKILL.md`).

**Status:** ⬜ to do · ✅ verified (matches code) · 🔧 fixed (code changed) · ⚠️ blocked (note why)

Update the status and fill in the log at the bottom every time an item is checked. This file is the memory between sessions.

## A. Stamp duty & grants (`src/engine/duty.ts`, tests in `src/engine/duty.test.ts`)

| ID | Status | What to verify | Where | Test values to run |
|---|---|---|---|---|
| A1 | ⬜ | **SA** general duty table, FHB relief (new home / land, no cap), FHOG $15k, 7% foreign surcharge. All figures so far came from search extracts. | https://www.revenuesa.sa.gov.au/stamp-duty-land/rate-of-stamp-duty · RevenueSA stamp duty calculator · https://www.revenuesa.sa.gov.au/stamp-duty-land/first-home-buyer-relief | $500,000 → $21,330; $600,000 → $26,830; $900,000 → $43,330 |
| A2 | ⬜ | **NSW** rounding: does general duty keep cents, or round per $100 / to the dollar? | Revenue NSW transfer duty calculator: https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/understanding-transfer-duty/calculate-transfer-duty | $450,050; $1,290,050; FHB $900,000 → $19,593.50 |
| A3 | ⬜ | **QLD** "per $100 or part" rounding (code rounds the excess **up**) | QRO calculator: https://qro.qld.gov.au/duties/transfer-duty/calculate/ | $540,050 general; $850,000 → $31,275; FHB $730,000 → $6,555 |
| A4 | ⬜ | **WA** "per $100 or part" rounding; first home owner rate from 7 May 2026 | RevenueWA calculator (wa.gov.au transfer duty calculator) | $725,050 general; FHB $650,000 → $8,075 |
| A5 | ⬜ | **ACT** owner-occupier $580,000: the code gives $11,864 (from the schedule), but the official explanatory statement says $11,128 | ACT Revenue Office duty calculator: https://www.revenue.act.gov.au/duties/conveyance-duty | Owner-occupier $580,000; investor $580,000 → $14,856 |
| A6 | ⬜ | **NT** formula & rates still current (Act reprint dated 1 Jul 2025); HomeGrown Territory Grant $50k | Territory Revenue Office calculator: https://treasury.nt.gov.au/dtf/territory-revenue-office | $300,000 → $10,414.30; $500,000 → $23,928.60; $650,000 → $32,175 |
| A7 | ⬜ | **TAS** FHOG $20k for 2026–27: is there a price cap? (none found) | https://www.sro.tas.gov.au/first-home-owner/eligibility | — |
| A8 | ⬜ | **QLD** FHOG $30k still applies to contracts after 1 Jul 2026 (only seen in a search snippet) | https://qro.qld.gov.au/property-concessions-grants/first-home-grant/ | — |
| A9 | ⬜ | **VIC** off-the-plan concession (not implemented) — decide whether to add | https://sro.vic.gov.au/offtheplan | — |
| A10 | ⬜ | **WA** FHOG cap north of the 26th parallel ($1m) — code always uses $800k | https://www.wa.gov.au/government/publications/about-the-first-home-owner-grant | — |

## B. Government scheme & tax settings (`src/engine/finance.ts`)

| ID | Status | What to verify | Where |
|---|---|---|---|
| B1 | ⬜ | 5% Deposit Scheme property price caps for every state, capital/regional (`SCHEME_CAPS`), incl. the July 2026 Darwin/regional changes | Housing Australia price cap tool: https://www.housingaustralia.gov.au |
| B2 | ⬜ | Official participating-lender list on housingaustralia.gov.au matches `src/data/scheme-lenders.json` (copied from firsthomebuyers.gov.au) | https://www.housingaustralia.gov.au (participating lenders page) |
| B3 | ⬜ | 2026–27 resident tax rates (15% bottom rate) in `incomeTax` | https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents |
| B4 | ⬜ | 2026–27 HECS/HELP repayment threshold and marginal rates (code: $67,000, 15% / 17% above $125,000) in `hecsRepayment` | https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds |
| B5 | ⬜ | LMI estimate bands in `lmiEstimate` against a public LMI premium estimator (e.g. Helia) for $500k at 85%, 90% and 95% LVR | https://www.helia.com.au |

## C. Lender credit policy (`src/data/policy-overrides.json`)

Open Banking gives rates, maximum LVR and residency only. Everything else in `KIND_DEFAULTS` (`src/engine/market.ts`) is a typical setting for each lender type. Replace it lender by lender with facts from the **lender's own public website**: eligibility pages, "self-employed home loans", "temporary residents", "what you need to apply" or published credit guides. Start with the largest lenders.

| ID | Status | Lender (brand as in market.json) | Facts to look for |
|---|---|---|---|
| C1 | ⬜ | CommBank | Min time in job (full-time, casual), self-employed history (ABN years / tax returns), temporary visa lending & max LVR, % of overtime/bonus counted |
| C2 | ⬜ | Westpac | same |
| C3 | ⬜ | NATIONAL AUSTRALIA BANK | same |
| C4 | ⬜ | ANZ | same |
| C5 | ⬜ | Macquarie Bank Limited | same + maximum LVR for apartments |
| C6 | ⬜ | ING BANK (Australia) Ltd | same |
| C7 | ⬜ | Bendigo Bank | same |
| C8 | ⬜ | Great Southern Bank | same |
| C9 | ⬜ | Liberty Financial | defaults accepted? bankruptcy discharge period? min credit score? |
| C10 | ⬜ | UBank | same as C1 |

## Verification log

| Date | ID | Result | Source URL | Notes |
|---|---|---|---|---|
| | | | | |
