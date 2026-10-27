// Public MCP endpoint: https://mcp.keyready.au/mcp (Cloudflare Worker in cloudflare/mcp-proxy/ forwards here),
// also reachable directly at https://<project-ref>.supabase.co/functions/v1/mcp
// The server (tools, schemas, rules engine) is bundled from src/mcp/server.ts by `npm run bundle:rules`;
// this file only connects it to the database for consented broker referrals.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createKeyReadyMcp } from '../_shared/mcp.js';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const handler = createKeyReadyMcp({
  async insertLead(lead: Record<string, unknown>) {
    const { data, error } = await db.from('leads').insert(lead).select('id').single();
    if (error) throw new Error(error.message);
    return data as { id: string };
  },
  async recentLeadCount(email: string) {
    const since = new Date(Date.now() - 864e5).toISOString();
    const { count } = await db.from('leads').select('id', { count: 'exact', head: true }).eq('email', email).gte('created_at', since);
    return count ?? 0;
  },
});

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', 'Access-Control-Expose-Headers': '*' };

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  const res = await handler.fetch(req);
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
  return out;
});
