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
