-- USER GAME DATA
create table public.user_game_data (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  data jsonb not null default '{}',
  updated_at timestamptz default now()
);

alter table public.user_game_data enable row level security;
create policy "user owns game data" on public.user_game_data
  for all using (auth.uid() = user_id);
