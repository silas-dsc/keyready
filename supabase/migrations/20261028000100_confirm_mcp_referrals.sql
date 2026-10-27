-- Referrals made through an AI assistant (channel 'mcp') wait for the borrower to confirm by email:
-- the assistant's "consent" is not the borrower's own. Until then they are 'pending', hidden from
-- brokers and out of the funnel; unconfirmed ones are deleted after 7 days. Website referrals, where
-- the person ticks the consent box themselves, are confirmed at once as before.

alter table public.leads
  add column confirm_token uuid not null default gen_random_uuid(),
  add column confirmed_at timestamptz;
update public.leads set confirmed_at = created_at where confirmed_at is null;
create unique index leads_confirm_token on public.leads (confirm_token);

alter table public.leads drop constraint leads_status_check;
alter table public.leads add constraint leads_status_check
  check (status in ('pending', 'new', 'contacted', 'application', 'approved', 'settled', 'lost'));

create or replace function public.prepare_lead() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.status := case when new.channel = 'mcp' then 'pending' else 'new' end;
  new.confirmed_at := case when new.channel = 'mcp' then null else now() end;
  new.confirm_token := gen_random_uuid();
  new.status_updated_at := now();
  new.broker_notes := '';
  new.settled_amount := null;
  new.broker_id := (select id from public.brokers where is_default and active limit 1);
  return new;
end $$;

-- Brokers only ever see confirmed referrals.
drop policy "brokers read assigned leads" on public.leads;
create policy "brokers read assigned leads" on public.leads
  for select to authenticated
  using (confirmed_at is not null and broker_id in (select id from public.brokers where user_id = auth.uid()));

-- One notify call per event: 'confirm' asks the borrower to confirm, 'new' sends the referral emails.
create or replace function public.call_notify_lead() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  url text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret');
  kind text := case when new.confirmed_at is null then 'confirm' else 'new' end;
  b public.brokers;
begin
  if url is null or secret is null then
    raise warning 'notify-lead not configured (vault secrets project_url / notify_secret missing)';
    return new;
  end if;
  select * into b from public.brokers where id = new.broker_id;
  perform net.http_post(
    url := url || '/functions/v1/notify-lead',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-notify-secret', secret),
    body := jsonb_build_object(
      'kind', kind,
      'lead', to_jsonb(new),
      'broker', case when b.id is null then null else jsonb_build_object('id', b.id, 'email', b.email, 'name', b.name, 'business_name', b.business_name) end
    )
  );
  return new;
end $$;

create trigger leads_notify_confirmed after update of confirmed_at on public.leads
  for each row when (old.confirmed_at is null and new.confirmed_at is not null)
  execute function public.call_notify_lead();

-- Called from the link in the confirmation email. Anyone holding the token may confirm, once, within 7 days.
create function public.confirm_lead(p_token uuid) returns text
language plpgsql security definer set search_path = public as $$
declare l public.leads;
begin
  select * into l from public.leads where confirm_token = p_token for update;
  if not found then return 'not_found'; end if;
  if l.confirmed_at is not null then return 'already_confirmed'; end if;
  if l.created_at < now() - interval '7 days' then return 'expired'; end if;
  update public.leads set confirmed_at = now(), status = 'new', status_updated_at = now() where id = l.id;
  return 'confirmed';
end $$;
revoke all on function public.confirm_lead(uuid) from public;
grant execute on function public.confirm_lead(uuid) to anon, authenticated;

create or replace view public.lead_funnel with (security_invoker = true) as
select site, segment, channel,
       count(*) as leads,
       count(*) filter (where status in ('contacted', 'application', 'approved', 'settled')) as contacted,
       count(*) filter (where status in ('application', 'approved', 'settled')) as applications,
       count(*) filter (where status = 'settled') as settled,
       count(*) filter (where status = 'lost') as lost,
       sum(settled_amount) as settled_volume
  from public.leads where confirmed_at is not null group by site, segment, channel;

-- Delete referrals nobody confirmed, daily.
create extension if not exists pg_cron;
select cron.schedule('purge-unconfirmed-leads', '17 3 * * *',
  $$delete from public.leads where confirmed_at is null and created_at < now() - interval '7 days'$$);
