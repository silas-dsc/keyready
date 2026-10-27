-- KeyReady family: leads from every site (and the MCP server), routed to brokers,
-- with a status pipeline brokers update so we learn which sub-markets convert.

create extension if not exists pgcrypto;

create table public.brokers (
  id uuid primary key default gen_random_uuid(),
  -- Linked on the broker's first sign-in by public.claim_broker().
  user_id uuid unique references auth.users (id) on delete set null,
  email text not null unique,
  name text not null,
  business_name text not null default '',
  acl_number text,
  -- New leads go to the active default broker.
  is_default boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index brokers_one_default on public.brokers (is_default) where is_default;

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200 and email like '%@%'),
  phone text not null default '' check (char_length(phone) <= 40),
  preferred_time text not null default '' check (char_length(preferred_time) <= 40),
  consent boolean not null check (consent),
  profile jsonb not null check (pg_column_size(profile) < 20000),
  summary jsonb not null check (pg_column_size(summary) < 5000),
  site text not null default 'core' check (site ~ '^[a-z0-9-]{1,40}$'),
  segment text not null default 'general' check (segment ~ '^[a-z0-9_-]{1,40}$'),
  channel text not null default 'web' check (channel in ('web', 'mcp')),
  attribution jsonb not null default '{}' check (pg_column_size(attribution) < 2000),
  broker_id uuid references public.brokers (id),
  status text not null default 'new' check (status in ('new', 'contacted', 'application', 'approved', 'settled', 'lost')),
  status_updated_at timestamptz not null default now(),
  broker_notes text not null default '',
  -- Loan amount at settlement, for revenue tracking.
  settled_amount numeric
);
create index leads_broker_created on public.leads (broker_id, created_at desc);
create index leads_site_status on public.leads (site, status);

-- Pipeline history: every status change a broker records.
create table public.lead_events (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.leads (id) on delete cascade,
  broker_id uuid references public.brokers (id),
  from_status text,
  to_status text not null,
  note text not null default '',
  created_at timestamptz not null default now()
);

-- New leads: route to the default broker and force a clean starting state, whatever the client sent.
create function public.prepare_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.status := 'new';
  new.status_updated_at := now();
  new.broker_notes := '';
  new.settled_amount := null;
  new.broker_id := (select id from public.brokers where is_default and active limit 1);
  return new;
end $$;
create trigger leads_prepare before insert on public.leads for each row execute function public.prepare_lead();

alter table public.brokers enable row level security;
alter table public.leads enable row level security;
alter table public.lead_events enable row level security;

-- Visitors may submit a consented lead but never read leads back.
create policy "visitors submit consented leads" on public.leads
  for insert to anon, authenticated with check (consent);

-- Brokers see their own leads and their history.
create policy "brokers read assigned leads" on public.leads
  for select to authenticated
  using (broker_id in (select id from public.brokers where user_id = auth.uid()));
create policy "brokers read assigned lead events" on public.lead_events
  for select to authenticated
  using (lead_id in (select l.id from public.leads l join public.brokers b on b.id = l.broker_id where b.user_id = auth.uid()));
create policy "brokers read own row" on public.brokers
  for select to authenticated using (user_id = auth.uid());

-- Link the signed-in user to the broker row with the same email (the row is added by the operator).
create function public.claim_broker() returns public.brokers
language plpgsql security definer set search_path = public as $$
declare b public.brokers;
begin
  update public.brokers set user_id = auth.uid()
   where lower(email) = lower(auth.jwt() ->> 'email') and user_id is null and active;
  select * into b from public.brokers where user_id = auth.uid();
  return b;
end $$;

-- Brokers record feedback through this function only (no direct UPDATE on leads).
create function public.set_lead_status(p_lead uuid, p_status text, p_note text default '', p_settled_amount numeric default null)
returns public.leads
language plpgsql security definer set search_path = public as $$
declare l public.leads; b uuid;
begin
  select id into b from public.brokers where user_id = auth.uid() and active;
  if b is null then raise exception 'not a broker'; end if;
  select * into l from public.leads where id = p_lead and broker_id = b for update;
  if not found then raise exception 'lead not found'; end if;
  insert into public.lead_events (lead_id, broker_id, from_status, to_status, note)
       values (p_lead, b, l.status, p_status, coalesce(p_note, ''));
  update public.leads
     set status = p_status, status_updated_at = now(),
         broker_notes = case when coalesce(p_note, '') = '' then broker_notes else p_note end,
         settled_amount = coalesce(p_settled_amount, settled_amount)
   where id = p_lead returning * into l;
  return l;
end $$;

revoke all on function public.claim_broker() from public, anon;
revoke all on function public.set_lead_status(uuid, text, text, numeric) from public, anon;
grant execute on function public.claim_broker() to authenticated;
grant execute on function public.set_lead_status(uuid, text, text, numeric) to authenticated;

-- Conversion by sub-market and channel: the proof-of-concept scoreboard.
create view public.lead_funnel with (security_invoker = true) as
select site, segment, channel,
       count(*) as leads,
       count(*) filter (where status in ('contacted', 'application', 'approved', 'settled')) as contacted,
       count(*) filter (where status in ('application', 'approved', 'settled')) as applications,
       count(*) filter (where status = 'settled') as settled,
       count(*) filter (where status = 'lost') as lost,
       sum(settled_amount) as settled_volume
  from public.leads group by site, segment, channel;
