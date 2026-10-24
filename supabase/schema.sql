-- KeyReady — optional Supabase backend (free tier is plenty for a prototype).
-- Run in the Supabase SQL editor, then set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text not null default '',
  preferred_time text not null default '',
  consent boolean not null check (consent),
  profile jsonb not null,
  summary jsonb not null
);

-- Brokers are Supabase Auth users listed here.
create table if not exists public.brokers (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business_name text not null,
  acl_number text
);

alter table public.leads enable row level security;
alter table public.brokers enable row level security;

-- Anyone (anonymous visitors) may submit a lead, but never read leads back.
create policy "anon can insert consented leads" on public.leads
  for insert to anon, authenticated with check (consent);

-- Only registered brokers can read leads.
create policy "brokers can read leads" on public.leads
  for select to authenticated using (exists (select 1 from public.brokers b where b.user_id = auth.uid()));

create policy "brokers can read own row" on public.brokers
  for select to authenticated using (user_id = auth.uid());
