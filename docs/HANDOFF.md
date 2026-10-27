# Handoff: tasks for a local Claude Code session (Chrome + logins)

These tasks couldn't be done from the cloud session: they need a real browser (bot-protected sites), your logins, or payment. Work through them with Claude Code on your Mac, started with `claude --chrome` (or `/chrome` after teleporting). Tick items off here, and log data checks in `docs/VERIFICATION.md`.

**Ground rules for Claude:**
- Accounts, payments, CAPTCHAs and secrets are the user's to handle. Pause and ask; never type a password or card number.
- Secrets go into dashboards or GitHub secrets, never into the repo.

## 1. Data verification (Chrome, no login): `/verify-data`
- [ ] **A1–A10** (stamp duty and grants), especially **A1** (SA, bot-blocked) and **A2–A4** (NSW, QLD and WA rounding via the official calculators)
- [ ] **B1** 5% Deposit Scheme price caps, **B2** official lender list, **B3–B4** ATO tax and HECS figures (the ATO blocks automated fetches)
- [ ] **C1–C10** lender credit policies from lender websites → `src/data/policy-overrides.json`
- [ ] **D1–D8** segment rules (NAB waiver LVR, CommBank professions, non-bank lenders for low-doc and expat lending) → `src/data/segment-policies.json`
- [ ] Domain availability: confirm with a registrar (the cloud check was DNS-based because the .au registry rate-limited it): lmiwaivercheck.com.au, nursehomeloan.com.au, lowdoccheck.com.au, expatloancheck.com.au, keyready.au

## 2. Accounts and logins (user-driven, Claude guides)
- [ ] Review and merge **PR #2** (github.com/silas-dsc/keyready/pull/2)
- [ ] Register the domains, plus ASIC business names for each brand (`docs/GROWTH.md` §3)
- [ ] **Supabase:** create the project (Sydney) → `docs/BACKEND.md` steps 1, 6 and 7
- [ ] **Resend:** verify a sending domain, then create an API key
- [ ] **Knock:** create the account, add a Resend channel with the key `resend`, create a service token and copy the secret key
- [ ] **GitHub:** add the secrets and variables listed in `docs/BACKEND.md` step 4, then re-run *Deploy backend*
- [ ] **Add Trevor as the broker** (SQL in `docs/BACKEND.md` step 8), then have him sign in at `/keyready/#/broker`
- [ ] Test a lead end to end: submit a form, and check that both emails arrive and the lead shows in the dashboard
- [ ] **MCP:**
  - [ ] Put the project ref into `server.json`, then run `mcp-publisher login github && mcp-publisher publish`
  - [ ] Add the endpoint as a custom connector in Claude and in ChatGPT (developer mode) and run a test conversation
- [ ] **Custom domains:** set `domain` in each `src/sites/<id>.ts`, run `npm run build:sites -- --target=domains`, and deploy each `dist-sites/<id>` to a free static host (e.g. Cloudflare Pages). Submit sitemaps to Google Search Console and Bing Webmaster Tools.

## 3. Compliance (people, not code)
- [ ] Credit lawyer review of the site copy and the referral agreement (`docs/GROWTH.md` §2)
- [ ] Ask Connective (via Goodlend) about appointing your entity as a credit representative
- [ ] Agree the referral fee with Trevor, possibly tiered by loan size, then record settled amounts in the dashboard
- [ ] Set `VITE_CONTACT_EMAIL` (GitHub variable) for privacy access and deletion requests
