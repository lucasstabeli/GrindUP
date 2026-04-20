-- ── INVITE CODE ──────────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists invite_code text unique;

-- Auto-generate unique 8-char code on insert
create or replace function public.generate_invite_code()
returns trigger language plpgsql as $$
declare
  code text;
  taken boolean;
begin
  loop
    code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
    select exists(select 1 from public.profiles where invite_code = code) into taken;
    exit when not taken;
  end loop;
  new.invite_code := code;
  return new;
end;
$$;

create or replace trigger set_invite_code
  before insert on public.profiles
  for each row
  when (new.invite_code is null)
  execute function public.generate_invite_code();

-- Backfill existing profiles
do $$
declare
  r   record;
  code text;
  taken boolean;
begin
  for r in select id from public.profiles where invite_code is null loop
    loop
      code := upper(substring(md5(random()::text || clock_timestamp()::text) from 1 for 8));
      select exists(select 1 from public.profiles where invite_code = code) into taken;
      exit when not taken;
    end loop;
    update public.profiles set invite_code = code where id = r.id;
  end loop;
end;
$$;

-- ── FRIENDSHIPS ───────────────────────────────────────────────────────────────

create table if not exists public.friendships (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  friend_id  uuid not null references public.profiles(id) on delete cascade,
  status     text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  constraint friendships_unique  unique (user_id, friend_id),
  constraint no_self_friend      check  (user_id <> friend_id)
);

alter table public.friendships enable row level security;

-- Anyone on either side of a row can read it
create policy "see own friendships" on public.friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

-- Only the initiator can insert
create policy "send friend request" on public.friendships
  for insert with check (auth.uid() = user_id);

-- Either side can update (accept / clear status)
create policy "respond to request" on public.friendships
  for update using (auth.uid() = user_id or auth.uid() = friend_id);

-- Either side can delete (remove friend / cancel request)
create policy "remove friendship" on public.friendships
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

-- ── RPC: accepted friends (with coins + streak) ───────────────────────────────

create or replace function public.get_accepted_friends()
returns table (
  friend_id     uuid,
  friend_name   text,
  friend_avatar text,
  coins         numeric,
  streak        numeric
)
language sql security definer stable as $$
  -- Filter by user_id = caller only: each accepted friendship has two symmetric rows
  -- (A→B and B→A), so OR-ing both sides would return each friend twice.
  select
    f.friend_id,
    p.name       as friend_name,
    p.avatar_url as friend_avatar,
    coalesce((gd.data->>'coins')::numeric,  0) as coins,
    coalesce((gd.data->>'streak')::numeric, 0) as streak
  from public.friendships f
  join public.profiles p on p.id = f.friend_id
  left join public.user_game_data gd on gd.user_id = f.friend_id
  where f.user_id = auth.uid()
    and f.status = 'accepted';
$$;

-- ── RPC: pending requests sent TO me ─────────────────────────────────────────

create or replace function public.get_pending_requests()
returns table (
  requester_id     uuid,
  requester_name   text,
  requester_avatar text
)
language sql security definer stable as $$
  select
    f.user_id    as requester_id,
    p.name       as requester_name,
    p.avatar_url as requester_avatar
  from public.friendships f
  join public.profiles p on p.id = f.user_id
  where f.friend_id = auth.uid()
    and f.status = 'pending';
$$;
