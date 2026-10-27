# Backend setup: Supabase + Knock + Resend (free tiers)

The sites work without a backend: leads stay in the visitor's browser. Connecting the backend turns on four things:
- real lead capture from every site
- emails to the broker and the borrower
- the broker dashboard, with outcome tracking
- the public MCP server for AI assistants

Everything is configured as code in this repo. You only supply accounts and secrets.

```
browser / AI assistant ──► Supabase (leads table, RLS) ──pg_net trigger──► notify-lead function ──► Knock ──► Resend ──► broker + borrower
AI assistant ──► mcp function (same rules engine, bundled) ──► leads table (consented referrals only)
broker ──magic link──► #/broker dashboard ──set_lead_status()──► leads.status + lead_events (conversion feedback)
```

## Free-tier limits that matter

| Service | Free tier | Notes |
|---|---|---|
| Supabase | 500 MB database, 500k Edge Function calls/month, 2 projects | **Projects pause after 1 week of inactivity.** Live traffic keeps it awake; the weekly backend deploy also helps. |
| Knock | 10,000 messages/month | Needs an email provider for real sending. Its test sender only reaches members of your Knock account. |
| Resend | Free tier | Needs a **verified sending domain**: register a domain (see docs/GROWTH.md) first. |

## One-time setup

1. **Supabase**
   - Create a project (region: Sydney).
   - Note the project ref, the project URL and the publishable (anon) key.
2. **Resend**
   - Create an account, verify your sending domain and create an API key.
3. **Knock**
   - Create an account.
   - Under *Integrations → Channels*, add a **Resend** email channel with the key **`resend`** (the workflows in `.knock/workflows/` send through `resend`).
   - Create a **service token**, for the CLI and CI.
   - Copy the **secret API key** for the development environment (`sk_…`).
4. **GitHub**, under *Settings → Secrets and variables → Actions*:
   - Secrets: `SUPABASE_ACCESS_TOKEN` (from supabase.com/dashboard/account/tokens), `SUPABASE_DB_PASSWORD`, `KNOCK_SERVICE_TOKEN`, and optionally `ANTHROPIC_API_KEY` for the rules agent.
   - Variables: `SUPABASE_PROJECT_REF`, `VITE_SUPABASE_URL` (`https://<ref>.supabase.co`), `VITE_SUPABASE_ANON_KEY` (the publishable key, which is safe in the browser), and optionally `VITE_CONTACT_EMAIL` (shown in the privacy policy).
5. **Push to `main`** (or run *Deploy backend* manually). CI then:
   - applies `supabase/migrations/`
   - bundles the rules engine and MCP server
   - deploys the `mcp` and `notify-lead` functions
   - pushes the Knock workflows
   - rebuilds the sites against Supabase
6. **Function secrets** (once, from a machine with the Supabase CLI):
   ```bash
   supabase link --project-ref <ref>
   supabase secrets set KNOCK_SECRET_API_KEY=sk_... NOTIFY_SECRET=$(openssl rand -hex 24)
   RESEND_API_KEY=re_... SMTP_SENDER_EMAIL=hello@<your-domain> supabase config push   # auth redirect URLs + SMTP for broker sign-in links
   ```
7. **Vault secrets for the lead trigger.** In the SQL editor, using the same `NOTIFY_SECRET`:
   ```sql
   select vault.create_secret('https://<ref>.supabase.co', 'project_url');
   select vault.create_secret('<NOTIFY_SECRET>', 'notify_secret');
   ```
8. **Add the broker.** This is done in the SQL editor, not the repo, so the broker's email never appears in this public repository:
   ```sql
   insert into public.brokers (email, name, business_name, acl_number, is_default)
   values ('<broker email>', 'Trevor', 'Goodlend Mortgage Brokers', 'CR 556461 of Connective Credit Services (ACL 389328)', true);
   ```
9. **Broker sign-in.** The broker opens `https://keyready.au/#/broker` and requests a sign-in link with that email. The first sign-in links their account (`claim_broker()`). From then on, each lead has outcome buttons (new → contacted → application → approved → settled / lost), and the conversion-by-site table is the proof-of-concept scoreboard.

## Test it

- **Lead path:** submit the form on any site. The broker and borrower emails should arrive within a minute. If not, check *Supabase → Edge Functions → notify-lead → Logs* and *Knock → Logs*.
- **MCP:**
  ```bash
  curl -s https://<ref>.supabase.co/functions/v1/mcp -H 'content-type: application/json' -H 'accept: application/json, text/event-stream' \
    -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
  ```
  Or add the URL as a custom connector in Claude. The public setup page is at `/keyready/mcp/`.
- **Locally:** `npm test` covers the engine and runs the MCP server end to end with the official MCP client (`src/mcp/server.test.ts`).

## Publish the MCP server

1. Replace `SUPABASE_PROJECT_REF` in `server.json` with your ref.
2. Install `mcp-publisher` (from the modelcontextprotocol/registry GitHub releases), then run `mcp-publisher login github` and `mcp-publisher publish`. The `io.github.silas-dsc/*` namespace is verified by your GitHub login.
3. Optionally submit it to the ChatGPT app directory once it has been validated in developer mode.

## Data protection notes

- RLS:
  - Visitors can only **insert** consented leads (`check (consent)`), and a trigger resets status, notes and broker assignment, whatever the client sends.
  - Brokers read only their assigned leads.
  - Status changes go through `set_lead_status()` and are logged in `lead_events`.
- `notify-lead` and `mcp` have `verify_jwt = false`:
  - `notify-lead` checks its own shared secret.
  - `mcp` is deliberately public. Its only write is a consented referral, rate-limited to 3 per email per day.
