# Research notes

## 1. Teardown of the reference product (loanprep.com.au, October 2026)

The application form was completed in a headless browser up to the account-creation step. I stopped there and did not create an account, upload ID or consent to a credit check on a live service.

**Flow (10 steps solo, 13 joint):**

| # | Step | Fields |
|---|------|--------|
| 1 | Applicants | Just me / With someone else |
| 2 | About you | Age, citizenship/visa (7 options) |
| 3 | Work | Employment type (7), time in role (6 bands) |
| 4 | Income | Base income + frequency (yearly/monthly/fortnightly), overtime, allowances, bonus, commission |
| 5 | Finances | Savings, gift, other assets, loan balances, credit card limits, HECS, super, owns property, FTB / child maintenance / rental income |
| 6 | Household | Household type, dependants, relationship status |
| 7 | Property | Purpose, property type, new/existing, state, capital/regional, value, loan amount, live LVR, broker note |
| 8 | Residence & credit | State lived in, first home, defaults (yes/no/unsure), years since bankruptcy, credit score |
| 9 | Account | Name, email, password (or Google) — **required before any result** |
| 10 | Verify | Stripe Identity photo ID + Equifax ScoreSeeker credit check — **required before the report** |

**How it works (from the network traffic, bundles and privacy policy):** a Next.js app on Vercel; each step autosaves through a Next.js server action (`POST /get-started` with a JSON payload, after the income step). It uses Supabase for the database and auth, a backend on Railway that matches answers against lender policy PDFs, Stripe Identity for ID, Equifax for the credit score, and Resend for email. Revenue comes from brokers paying subscription and lead fees, and unclaimed leads go to an affiliate brokerage.

**Gaps and opportunities:**
1. **No value until you hand over identity.** A full account, photo ID and a credit enquiry are all required before you see anything. KeyReady shows the full report immediately and makes broker hand-off the optional final step.
2. **Dense multi-field screens.** Step 5 has 13 inputs on one screen. KeyReady asks one question per screen, which the GOV.UK Design System recommends as a starting point.
3. **No borrowing-power number.** It shows a per-bank yes/no but never "how much can I borrow". KeyReady shows a live estimate in the sidebar as you answer.
4. **No "what if".** You have to edit your answers and regenerate the report, possibly triggering a fresh credit check. KeyReady has instant sliders and one-tap "Try it" fixes.
5. **Fixes aren't ranked.** It lists blockers per bank. KeyReady simulates each fix and ranks them by how many lenders it unlocks.
6. **Scheme and costs are missing.** There's no 5% Deposit Scheme eligibility, stamp duty or LMI estimate. KeyReady includes all three.
7. A data-mapping quirk was spotted: the "Overtime" field was submitted as `second_job_income_aud`.

## 2. UX research applied

| Principle | Source | Where it's used |
|---|---|---|
| One question per page as a starting point; let people answer "I'm not sure" | [GOV.UK Design System — Question pages](https://design-system.service.gov.uk/patterns/question-pages), [GDS "One thing per page"](https://designnotes.blog.gov.uk/2015/07/03/one-thing-per-page/) | Questionnaire; "Not sure" options for defaults and location |
| Inline validation improved success rates by 22% and cut completion time by 42% in Wroblewski/Etre's test, **but** errors shown the moment someone leaves a field increased errors in later studies | Wroblewski, *A List Apart* (2009); summarised by [UX Movement](https://uxmovement.com/?p=10881) | Errors appear only when you try to continue; live *helpful* feedback (LVR, "≈ $X a year") appears while typing |
| Endowed progress: a loyalty card pre-stamped 2 of 10 was completed ~34% of the time vs ~19% for a blank card of 8 | Nunes & Drèze, *J. Consumer Research* (2006) | The progress bar starts partly filled; section ticks |
| Goal-gradient / immediate feedback keeps people going | same | Live borrowing-power estimate that animates as you answer |
| Explain why you ask sensitive questions | GOV.UK / NHS service manual question guidance | "Why we ask" on every step |
| Keep people oriented in long wizards; let them review and jump back | Microsoft wizard guidelines; NN/g wizard guidance | Section stepper, "What you've told us" panel with tap-to-edit |
| Big tap targets, numeric keypads, accessible focus | WCAG 2.2 | 44px+ targets, `inputMode="numeric"`, focus moves to each new question heading, `prefers-reduced-motion` respected |

Vendor claims that multi-step forms convert "up to 300%" better weren't verifiable against primary sources, so they didn't drive any decision.

## 3. Lending rules modelled

- **Serviceability buffer: 3 percentage points**, confirmed unchanged by APRA in its May 2026 macroprudential update. Assessment rate = max(product rate + 3%, lender floor).
- **Debt-to-income:** APRA limits loans at DTI ≥ 6× to 20% of each bank's new owner-occupier and investor lending, from 1 February 2026. Modelled as a "high DTI" warning plus per-lender hard caps of 6–8×.
- **5% Deposit Scheme** (formerly Home Guarantee Scheme): no income caps or place limits since 1 October 2025; price caps raised (e.g. Sydney $1.5m, Melbourne $950k, Brisbane $1m). The Family Home Guarantee for single parents needs a 2% deposit. Caps for other states are approximate, and the July 2026 Darwin/regional updates are not reflected, so check Housing Australia's cap tool.
- **Tax:** 2026–27 resident rates with the 15% bottom bracket, plus the Medicare levy. **HECS:** marginal repayment system from 2025–26.
- **Living expenses:** HEM is a licensed dataset, so the app uses a transparent HEM-style floor by household size and income.
- **Stamp duty, LMI:** deliberately rough estimates, flagged as such in the UI.

## 4. Next steps toward production

- Replace the illustrative lender policies with curated or licensed data. The reference site extracts them from lender policy PDFs, which would suit an LLM-assisted extraction pipeline with human review.
- Add an optional soft credit score check (Equifax/illion APIs) *after* showing value, not before.
- Hold an Australian Credit Licence, or act as a credit representative, before giving anything that could be read as credit assistance.
- Run broker onboarding with ASIC register checks, plus lead billing (Stripe).

## 5. Live lender data: Open Banking (Consumer Data Right)

Every Australian bank must publish its products through public, unauthenticated **Product Reference Data** APIs. The [CDR Register](https://api.cdr.gov.au/cdr-register/v1/banking/data-holders/brands/summary) lists each brand's endpoint (116 banking brands as of October 2026).

`scripts/import-cdr.mjs` (`npm run import:cdr`) pulls every brand's `RESIDENTIAL_MORTGAGES` products and keeps four things:
- **Variable P&I rate by LVR band** (60/70/80/85/90/95%). Where a bank publishes a base rate plus a separate `DISCOUNT` rate for the same LVR band (e.g. Great Southern Bank), the discount is subtracted.
- **Maximum LVR**, from LVR tiers or eligibility text.
- **Residency eligibility**, normalised from free text to citizen / PR / NZ / temporary visa.
- **Owner-occupier vs investment** rates.

Niche products (green upgrades, bridging, construction, SMSF, staff) and implausible rates (<4.5% or >12%) are excluded so they don't stand in for a lender's mainstream loan.

Lessons from building the importer:
- Many hosts reject API versions they don't serve instead of negotiating. The importer tries versions per host and caches what works (Westpac's detail endpoint only accepts v7).
- Banks that publish no `RESIDENCY_STATUS` are treated as "not stated", not "unrestricted to temporary visas", and fall back to typical settings for that lender type.

**What Open Banking does not publish** (and is therefore modelled per lender type in `src/engine/market.ts`): minimum time in job, income shading, card-limit loading, DTI caps, credit-score cut-offs and assessment-rate floors. That's the credit policy found in broker portals. Getting it legitimately means a broker partnership, licensed policy data, or the published guidelines of mortgage insurers and non-bank lenders.

**5% Deposit Scheme panel:** matched against the [Australian Government participating-lender list](https://firsthomebuyers.gov.au/australian-government-5-deposit-scheme/australian-government-5-deposit-scheme-participating-lenders) (54 lenders, retrieved 24 Oct 2026), stored in `src/data/scheme-lenders.json`.

**Naming lenders:** results show masked names ("Lender 08") by default. `VITE_SHOW_LENDER_NAMES=true` reveals brands. Get legal advice before doing that publicly: saying a named bank "would say yes" carries accuracy and advertising risk (ASIC RG 234). Brokers receiving a lead see real brand names.

## 6. Stamp duty and grants (2026–27)

`src/engine/duty.ts` implements the official schedules for all eight jurisdictions. `src/engine/duty.test.ts` checks them against **official worked examples and calculator outputs** (e.g. NSW FHBAS table to the cent, VIC SRO calculator, QLD and SA published examples). Rules that changed recently and are reflected:

| State | General duty | First home buyers | FHOG (new homes) |
|---|---|---|---|
| NSW | Indexed brackets; premium rate above $3.87m | Nil to $800k, sliding concession to $1m (land $350k–$450k) | $10k (cap $600k; $750k land + build) |
| VIC | Schedule; flat 5.5% from $960k to $2m; PPR concession ≤ $550k | Nil to $600k, concession to $750k | $10k (cap $750k) |
| QLD | Per $100 or part; home concession for owner-occupiers (citizen/PR from 1 Aug 2026) | Established: nil to $700k, stepped to $800k. New home or vacant land: nil, no cap | $30k (under $750k) |
| WA | Per $100 or part | From 7 May 2026: nil to $600k, $16.15 per $100 to $800k (land $450k–$550k) | $10k (cap $800k south / $1m north) |
| SA | Per $100 or part | New home or land: nil, no cap. Established: no relief | $15k, no cap |
| TAS | Per $100 or part | **Established-home exemption ended 30 Jun 2026** | $20k (2026–27) |
| ACT | Separate owner-occupier and investor tables; flat 4.54% above $1.455m | **Home Buyer Concession Scheme: nil, no income or price cap from 1 Jul 2026** | Nil |
| NT | Formula to $525k, then 4.95% | House and land package exemption (to 30 Jun 2027) | **$50k HomeGrown Territory Grant** |

Foreign purchaser surcharges (NSW 9%, VIC/QLD/TAS 8%, WA/SA 7%) apply in proportion to the share of foreign buyers. The grant is counted toward funds to complete.

**Not fully verified:**
- SA figures came via search extracts of revenuesa.sa.gov.au, which blocks automated access; they match two official worked examples.
- NSW's concession formula is derived; it matches all eight official table values to the cent.
- The ACT explanatory statement's $580k owner-occupier example ($11,128) contradicts its own schedule ($11,864); the schedule is implemented.
