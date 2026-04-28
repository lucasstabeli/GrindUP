-- Add trophies to the get_accepted_friends RPC so the rank leaderboard
-- can sort by trophies instead of coins.
-- Trophies live inside user_game_data.data->>'trophies' (added client-side).

drop function if exists public.get_accepted_friends();

create or replace function public.get_accepted_friends()
returns table (
  friend_id     uuid,
  friend_name   text,
  friend_avatar text,
  coins         numeric,
  streak        numeric,
  trophies      numeric
)
language sql security definer stable as $$
  select
    f.friend_id,
    p.name       as friend_name,
    p.avatar_url as friend_avatar,
    coalesce((gd.data->>'coins')::numeric,    0) as coins,
    coalesce((gd.data->>'streak')::numeric,   0) as streak,
    coalesce((gd.data->>'trophies')::numeric, 0) as trophies
  from public.friendships f
  join public.profiles p on p.id = f.friend_id
  left join public.user_game_data gd on gd.user_id = f.friend_id
  where f.user_id = auth.uid()
    and f.status = 'accepted';
$$;
