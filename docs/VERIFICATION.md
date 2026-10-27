# Data verification checklist

Items here couldn't be verified automatically from a cloud session: the sites block bots, need a real browser, or the data isn't published as an API. They're meant to be worked through by Claude Code on a Mac with Claude-controlled Chrome, using `/verify-data` (see `.claude/skills/verify-data/SKILL.md`).

**Status:** ⬜ to do · ✅ verified (matches code) · 🔧 fixed (code changed) · ⚠️ blocked (note why)

Update the status and fill in the log at the bottom every time an item is checked. This file is the memory between sessions.

## A. Stamp duty & grants (`src/engine/duty.ts`, tests in `src/engine/duty.test.ts`)

| ID | Status | What to verify | Where | Test values to run |
|---|---|---|---|---|
| A1 | 🔧 | **SA** general duty table, FHB relief (new home / land, no cap), FHOG $15k, 7% foreign surcharge. All figures so far came from search extracts. | https://www.revenuesa.sa.gov.au/stamp-duty-land/rate-of-stamp-duty · RevenueSA stamp duty calculator · https://www.revenuesa.sa.gov.au/stamp-duty-land/first-home-buyer-relief | $500,000 → $21,330; $600,000 → $26,830; $900,000 → $43,330 |
| A2 | 🔧 | **NSW** rounding: does general duty keep cents, or round per $100 / to the dollar? | Revenue NSW transfer duty calculator: https://www.revenue.nsw.gov.au/taxes-duties-levies-royalties/transfer-duty/understanding-transfer-duty/calculate-transfer-duty | $450,050; $1,290,050; FHB $900,000 → $19,593.50 |
| A3 | ✅ | **QLD** "per $100 or part" rounding (code rounds the excess **up**) | QRO calculator: https://qro.qld.gov.au/duties/transfer-duty/calculate/ | $540,050 general; $850,000 → $31,275; FHB $730,000 → $6,555 |
| A4 | ✅ | **WA** "per $100 or part" rounding; first home owner rate from 7 May 2026 | RevenueWA calculator (wa.gov.au transfer duty calculator) | $725,050 general; FHB $650,000 → $8,075 |
| A5 | ✅ | **ACT** owner-occupier $580,000: the code gives $11,864 (from the schedule), but the official explanatory statement says $11,128 | ACT Revenue Office duty calculator: https://www.revenue.act.gov.au/duties/conveyance-duty | Owner-occupier $580,000; investor $580,000 → $14,856 |
| A6 | 🔧 | **NT** formula & rates still current (Act reprint dated 1 Jul 2025); HomeGrown Territory Grant $50k | Territory Revenue Office calculator: https://treasury.nt.gov.au/dtf/territory-revenue-office | $300,000 → $10,414.30; $500,000 → $23,928.60; $650,000 → $32,175 |
| A7 | ✅ | **TAS** FHOG $20k for 2026–27: is there a price cap? (none found) | https://www.sro.tas.gov.au/first-home-owner/eligibility | — |
| A8 | ✅ | **QLD** FHOG $30k still applies to contracts after 1 Jul 2026 (only seen in a search snippet) | https://qro.qld.gov.au/property-concessions-grants/first-home-grant/ | — |
| A9 | ⚠️ | **VIC** off-the-plan concession (not implemented) — decide whether to add | https://sro.vic.gov.au/offtheplan | — |
| A10 | ⚠️ | **WA** FHOG cap north of the 26th parallel ($1m) — code always uses $800k | https://www.wa.gov.au/government/publications/about-the-first-home-owner-grant | — |

## B. Government scheme & tax settings (`src/engine/finance.ts`)

| ID | Status | What to verify | Where |
|---|---|---|---|
| B1 | 🔧 | 5% Deposit Scheme property price caps for every state, capital/regional (`SCHEME_CAPS`), incl. the July 2026 Darwin/regional changes | Housing Australia price cap tool: https://www.housingaustralia.gov.au |
| B2 | ✅ | Official participating-lender list on housingaustralia.gov.au matches `src/data/scheme-lenders.json` (copied from firsthomebuyers.gov.au) | https://www.housingaustralia.gov.au (participating lenders page) |
| B3 | ✅ | 2026–27 resident tax rates (15% bottom rate) in `incomeTax` | https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents |
| B4 | 🔧 | 2026–27 HECS/HELP repayment threshold and marginal rates (code: $67,000, 15% / 17% above $125,000) in `hecsRepayment` | https://www.ato.gov.au/tax-rates-and-codes/study-and-training-support-loans-rates-and-repayment-thresholds |
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

## D. Segment rules (`src/data/segment-policies.json`)

| ID | Status | What to verify | Where |
|---|---|---|---|
| D1 | ⬜ | NAB's LMI waiver: maximum LVR (not published on its consumer page) | https://www.nab.com.au/personal/home-loans/lmi/lmi-waiver |
| D2 | ⬜ | CommBank's waiver: eligible profession list and LVR (reported 2025 changes: interns, pharmacists $100k, nurse pilot) | https://www.commbank.com.au/home-loans/low-deposit-home-loan-options.html |
| D3 | ⬜ | Westpac/St.George legal & accounting waiver criteria (in BrokerHub only) | https://westpac.com.au/brokers/policy |
| D4 | ⬜ | ANZ legal/accounting waiver: 90% (broker PDFs) vs "up to 95%" (consumer page) | https://www.anz.com.au/personal/home-loans/buying-home/home-loans-business-owners/ |
| D5 | ⬜ | St.George nurse/allied waiver: capture an exact quote ($90k, 90% LVR) | https://www.stgeorge.com.au/personal/home-loans/profession-home-loans |
| D6 | ⬜ | Non-bank lenders that don't publish Open Banking data (Pepper, La Trobe, Bluestone, Firstmac…): add their published rates and alt-doc/expat policies as lenders | Each lender's own site |
| D7 | ⬜ | Expat lenders: which lenders *do* lend to Australians living overseas, max LVR, currencies | Lender sites |
| D8 | ⬜ | Westpac overtime at 100% for hospital nurses: model as a nurse-specific shading rule | Westpac broker niche booklet |

## Verification log

| Date | ID | Result | Source URL | Notes |
|---|---|---|---|---|
| 2026-10-27 | A1 | 🔧 | https://www.revenuesa.sa.gov.au/stamp-duty-land/rate-of-stamp-duty · …/first-home-buyer-relief · …/first-home-buyer-relief/relief-available · https://www.revenuesa.sa.gov.au/FHOG/grant-details | Rate table matches code bracket for bracket ($500k → $21,330). Relief (contracts from 13 Feb 2025): full relief on new homes/land "regardless of the property value"; not applied to the 7% foreign surcharge. FHOG "up to $15,000", no price cap. **Fixed:** relief needs only "at least one" applicant who is a citizen, PR or NZ citizen on a Special Category visa; code had required all applicants. |
| 2026-10-27 | A2 | 🔧 | https://www.apps09.revenue.nsw.gov.au/erevenue/calculators/landsalesimple.php · …/fhba.php | Calculator rounds the excess up per $100: $450,050 → $14,441.50 (code had $14,439.25), $1,290,050 → $52,242.50. FHBA: $900,000 → $19,593.50 ✓, $850,050 → $9,808.80. **Fixed:** NSW schedule now uses "or part" rounding. |
| 2026-10-27 | A3 | ✅ | https://amun.osr.qld.gov.au/sap/osrqld/wd_tfr_calc_com | Calculator: general $540,050 → $17,329.50 (confirms round-up); first home $730,000 → $6,555. Both match code. |
| 2026-10-27 | A4 | ✅ | https://apps.osr.wa.gov.au/portal/0/calculators/transferduty | Calculator: general $725,050 → $28,458.15 (confirms round-up); FHOR new/established $650,050 → $8,091.15. Both match code. |
| 2026-10-27 | A5 | ✅ | https://www.revenue.act.gov.au/help-and-resources/calculators/calculate-your-conveyance-duty | Calculator: owner-occupier $580,000 → $11,864 (owner-occupier discount $2,992), investor → $14,856. Matches the code and schedule; the explanatory statement's $11,128 is wrong. |
| 2026-10-27 | A6 | 🔧 | https://nt.gov.au/property/buying-and-selling-a-home/settle-the-sale/stamp-duty-buying-or-selling-a-home/conveyance-calculator · https://nt.gov.au/property/home-owner-assistance/buy-build-new-home | Calculator rounds duty **down to 5 cents**: $300,000 → $10,414.25 (code had $10,414.30), $525,050 → $25,989.95; $500,000 → $23,928.60, $650,000 → $32,175, $3,000,000 → $172,500 (5.75%). **Fixed** rounding. HomeGrown Territory Grant "$50,000", "no cap on the build or purchase price", contracts to 30 Sep 2027 ✓. Note: NT requires only "one applicant" to be a citizen/PR; the code's FHOG check requires all applicants (not changed, see open notes). |
| 2026-10-27 | A7 | ✅ | https://www.sro.tas.gov.au/first-home-owner/eligibility | $20,000 for transactions 1 Jul 2026 – 30 Jun 2027. No price cap on the SRO eligibility or transaction pages. |
| 2026-10-27 | A8 | ✅ | https://qro.qld.gov.au/property-concessions-grants/first-home-grant/eligibility/ | "$30,000 for contracts signed on or after 20 November 2023", no end date; value "must be less than $750,000". Matches code. |
| 2026-10-27 | A9 | ⚠️ | https://sro.vic.gov.au/offtheplan | Decision needed, not implemented. Concession subtracts post-contract construction costs from the dutiable value; temporary version (contracts 21 Oct 2024 – 21 Apr 2027) open to all buyers for strata lots, no value cap. Needs a new "construction cost remaining" input. |
| 2026-10-27 | A10 | ⚠️ | https://www.wa.gov.au/government/publications/about-the-first-home-owner-grant | Confirmed: from 7 May 2026, cap is $800,000 south / $1,000,000 north of the 26th parallel. Not implemented: the profile only has capital/regional, which can't place a property north of the 26th parallel. Code keeps the stricter $800k. |
| 2026-10-27 | B1 | 🔧 | https://firsthomebuyers.gov.au/australian-government-5-percent-deposit-scheme/property-price-caps | All state caps match. **Fixed:** NT capital city (Darwin) is $750,000, rest of Territory $600,000 (code had $600,000 for both). Note: regional centres (Central Coast, Illawarra, Newcastle, Geelong, Gold Coast, Sunshine Coast, etc.) take the capital cap; the profile's capital/regional answer can't tell them apart. |
| 2026-10-27 | B2 | ✅ | https://firsthomebuyers.gov.au/australian-government-5-percent-deposit-scheme/5-percent-participating-lenders | All 54 participating lenders match `scheme-lenders.json` exactly (housingaustralia.gov.au/participating-lenders redirects here). Source URL and date updated. |
| 2026-10-27 | B3 | ✅ | https://www.ato.gov.au/tax-rates-and-codes/tax-rates-australian-residents | 2026–27: nil to $18,200; 15c to $45,000; $4,020 + 30c to $135,000; $31,020 + 37c to $190,000; $51,370 + 45c above. Excludes the 2% Medicare levy. Matches `incomeTax`. |
| 2026-10-27 | B4 | 🔧 | https://www.ato.gov.au/tax-rates-and-codes/study-and-training-loan-minimum-repayment-income-and-rates | Code had the 2025–26 table. **Fixed** to 2026–27: nil to $69,528; 15c over $69,528 to $129,717; $9,028 + 17c over $129,717 to $186,050; 10% of total repayment income from $186,051. Test includes ATO example 1 ($86,380 → $2,527.80). |
