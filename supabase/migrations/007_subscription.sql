-- Adiciona controle de trial e assinatura ao perfil do usuário
alter table public.profiles
  add column if not exists trial_ends_at timestamptz,
  add column if not exists subscription_status text default 'trial'
    check (subscription_status in ('trial', 'active', 'expired')),
  add column if not exists subscription_ends_at timestamptz;

-- Dá 7 dias de trial para usuários existentes (migração de dados)
update public.profiles
  set trial_ends_at = now() + interval '7 days'
  where trial_ends_at is null;
