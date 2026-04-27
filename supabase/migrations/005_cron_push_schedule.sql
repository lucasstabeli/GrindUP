-- Agenda o cron-push pra rodar a cada minuto.
-- A Edge Function checa internamente quais usuários têm horário batendo agora.
--
-- IMPORTANTE: Antes de rodar essa migration, você precisa configurar 2 secrets
-- no Supabase Dashboard > Project Settings > Vault:
--   - app.settings.supabase_url      = https://SEU-PROJETO.supabase.co
--   - app.settings.supabase_anon_key = sua anon key (Settings > API)
--
-- Ou rode estes comandos manualmente substituindo os valores:
--   ALTER DATABASE postgres SET app.settings.supabase_url = 'https://SEU.supabase.co';
--   ALTER DATABASE postgres SET app.settings.supabase_anon_key = 'sua-anon-key';

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Remove job antigo se já existir (pra a migration ser idempotente)
do $$
begin
  if exists (select 1 from cron.job where jobname = 'invoke-cron-push') then
    perform cron.unschedule('invoke-cron-push');
  end if;
end $$;

-- Agenda: a cada minuto, dispara HTTP POST pra Edge Function cron-push
select cron.schedule(
  'invoke-cron-push',
  '* * * * *',  -- todo minuto
  $$
  select net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/cron-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.supabase_anon_key')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  ) as request_id;
  $$
);
