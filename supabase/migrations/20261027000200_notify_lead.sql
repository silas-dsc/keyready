-- On every new lead, call the notify-lead Edge Function (which triggers the Knock emails).
-- pg_net is async: a slow or failing email never blocks the lead being saved.
--
-- One-time setup per project (NOT in migrations — the values are secrets), in the SQL editor:
--   select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
--   select vault.create_secret('<random string>', 'notify_secret');   -- same value as the NOTIFY_SECRET function secret

create extension if not exists pg_net;

create function public.call_notify_lead() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  url text := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url');
  secret text := (select decrypted_secret from vault.decrypted_secrets where name = 'notify_secret');
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
      'lead', to_jsonb(new),
      'broker', case when b.id is null then null else jsonb_build_object('id', b.id, 'email', b.email, 'name', b.name, 'business_name', b.business_name) end
    )
  );
  return new;
end $$;

create trigger leads_notify after insert on public.leads for each row execute function public.call_notify_lead();
