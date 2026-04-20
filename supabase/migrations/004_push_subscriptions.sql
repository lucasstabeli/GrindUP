create table if not exists public.push_subscriptions (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  endpoint  text not null,
  p256dh    text not null,
  auth      text not null,
  updated_at timestamptz default now()
);

alter table public.push_subscriptions enable row level security;

create policy "users manage own subscription"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
