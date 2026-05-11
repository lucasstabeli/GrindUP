-- Adiciona coluna para registrar qual plano o usuário assinou
alter table public.profiles
  add column if not exists plan_type text check (plan_type in ('monthly', 'annual'));
