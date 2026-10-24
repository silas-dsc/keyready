---
description: Verify KeyReady's unverified stamp duty, grant, scheme, tax and lender-policy data against official websites using Claude-controlled Chrome, then fix code/tests and log results in docs/VERIFICATION.md.
argument-hint: "[item IDs, e.g. A1 A5 C1 — default: next 3 unchecked]"
disable-model-invocation: true
---

# Verify missing data with Chrome

Work through `docs/VERIFICATION.md` using the browser. The cloud session that built this couldn't reach these sources: bot protection, browser-only calculators, or data that isn't in any API.

## 0. Preconditions

- Browser tools come from the `claude-in-chrome` MCP server. If they aren't available, **stop** and tell the user to restart with `claude --chrome`, or run `/chrome`. A project file can't switch this on. Use `/mcp` → `claude-in-chrome` → View tools to see the exact tool names.
- Run `npm install` if `node_modules` is missing, then `npm test` to confirm a green baseline.
- Create a branch: `git checkout -b verify-data-YYYY-MM-DD`.

## 1. Pick items

Use the IDs in `$ARGUMENTS` if given. Otherwise take the next three ⬜ items, in table order (A before B before C). Tell the user which items you're doing.

## 2. Browse — rules

- **Official sources only**: state revenue offices and their calculators, legislation registers, ATO, Housing Australia / firsthomebuyers.gov.au, and each **lender's own public website**. Aggregators, comparison sites, broker blogs and forums can help you *find* a page, never *confirm* a figure.
- **No logins, no broker portals, no paywalls.** If a page wants a login, skip it and mark the item ⚠️.
- **CAPTCHA or "verify you are human" challenge:** pause and ask the user to complete it in the Chrome window. Never try to get around it.
- Calculators: enter **only property values and yes/no answers**. Never type personal details (names, emails, phone numbers, DOBs). If a calculator insists on personal details, mark the item ⚠️.
- Work out of a fresh tab. Don't touch the user's other tabs.
- For every figure you rely on, capture the URL, the date, and a short exact quote or the calculator inputs and outputs.

## 3. Compare with the code

- Duty and grants (A): run the "Test values" from the table through the official calculator, then compare with `stampDuty()` in `src/engine/duty.ts`. A quick check: `npx vitest run src/engine/duty.test.ts`. For extra values, add a temporary test rather than guessing.
- Scheme and tax (B): compare with `SCHEME_CAPS`, `incomeTax`, `hecsRepayment` and `lmiEstimate` in `src/engine/finance.ts`, and with `src/data/scheme-lenders.json`.
- Lender policy (C): find the facts listed in the table and add an entry to `src/data/policy-overrides.json`. Use the brand **exactly** as in `src/data/market.json`:

  ```json
  "CommBank": {
    "set": { "minTenure": { "casual": 6, "self_employed": 24 }, "residency": { "temporary_visa": 80 } },
    "sources": [{ "url": "https://…", "retrieved": "2026-11-01", "quote": "Casual employees need to have been in their role for at least 6 months" }]
  }
  ```

  `set` takes any `LenderPolicy` field (see `src/engine/types.ts`). Months go in `minTenure`; `null` means not accepted. LVR values are percentages. Income shading values are fractions (0.8 = 80%). Only set what the lender's site actually states. Leave the rest to the type defaults.

## 4. Record the outcome

- **Matches:** add or relabel the test case with `// official calculator, retrieved YYYY-MM-DD` and mark the item ✅.
- **Differs:** fix the code, update or add the test with the official figure, and mark it 🔧. Explain the change in the log.
- **Couldn't verify:** mark it ⚠️ with the reason.
- Add a row to the **Verification log** in `docs/VERIFICATION.md` for every item touched: date, ID, result, source URL, notes.
- If the "Not fully verified" notes in `docs/RESEARCH.md` §6 no longer apply, update them.

## 5. Finish

- `npm test` and `npm run build` must pass.
- Commit (one commit per item group is fine), push the branch, and open a PR. In the PR description, summarise each item checked with its source.
- Report back to the user: what was verified, what changed, and what's still ⬜ or ⚠️.
