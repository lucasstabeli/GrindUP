-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  gender text check (gender in ('male', 'female')),
  theme text default 'male',
  role text not null default 'client' check (role in ('client', 'nutritionist', 'personal', 'aesthetician')),
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;
create policy "users own profile" on public.profiles
  for all using (auth.uid() = id);
create policy "professionals visible" on public.profiles
  for select using (role in ('nutritionist', 'personal', 'aesthetician'));

-- PROFESSIONAL PROFILES
create table public.professional_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete cascade,
  type text not null check (type in ('nutritionist', 'personal', 'aesthetician')),
  bio text,
  specialties text[],
  active boolean default true,
  created_at timestamptz default now()
);

alter table public.professional_profiles enable row level security;
create policy "pro profile readable" on public.professional_profiles
  for select using (true);
create policy "pro owns profile" on public.professional_profiles
  for all using (auth.uid() = user_id);

-- SERVICES
create table public.services (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references public.professional_profiles(id) on delete cascade,
  name text not null,
  description text,
  modality text check (modality in ('online', 'presential', 'both')),
  price_cents integer not null,
  price_label text,
  active boolean default true
);

alter table public.services enable row level security;
create policy "services readable" on public.services for select using (true);
create policy "pro owns services" on public.services
  for all using (
    auth.uid() = (
      select user_id from public.professional_profiles where id = professional_id
    )
  );

-- BOOKINGS
create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete cascade,
  professional_id uuid references public.professional_profiles(id) on delete cascade,
  service_id uuid references public.services(id),
  status text default 'pending' check (status in ('pending', 'confirmed', 'cancelled')),
  client_weight numeric,
  client_height numeric,
  client_age integer,
  client_goal text,
  client_notes text,
  days_per_week integer,
  created_at timestamptz default now()
);

alter table public.bookings enable row level security;
create policy "client sees own bookings" on public.bookings
  for select using (auth.uid() = client_id);
create policy "client creates booking" on public.bookings
  for insert with check (auth.uid() = client_id);
create policy "pro sees bookings" on public.bookings
  for select using (
    auth.uid() = (
      select user_id from public.professional_profiles where id = professional_id
    )
  );
create policy "pro updates booking" on public.bookings
  for update using (
    auth.uid() = (
      select user_id from public.professional_profiles where id = professional_id
    )
  );

-- DIET PLANS
create table public.diet_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete cascade,
  professional_id uuid references public.professional_profiles(id) on delete cascade,
  content jsonb not null default '{}',
  notes text,
  updated_at timestamptz default now(),
  unique(client_id, professional_id)
);

alter table public.diet_plans enable row level security;
create policy "client reads own diet" on public.diet_plans
  for select using (auth.uid() = client_id);
create policy "pro manages diet" on public.diet_plans
  for all using (
    auth.uid() = (
      select user_id from public.professional_profiles where id = professional_id
    )
  );

-- WORKOUT PLANS
create table public.workout_plans (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references public.profiles(id) on delete cascade,
  professional_id uuid references public.professional_profiles(id) on delete cascade,
  content jsonb not null default '{}',
  notes text,
  updated_at timestamptz default now(),
  unique(client_id, professional_id)
);

alter table public.workout_plans enable row level security;
create policy "client reads own workout" on public.workout_plans
  for select using (auth.uid() = client_id);
create policy "pro manages workout" on public.workout_plans
  for all using (
    auth.uid() = (
      select user_id from public.professional_profiles where id = professional_id
    )
  );

-- AESTHETIC POSTS
create table public.aesthetic_posts (
  id uuid primary key default gen_random_uuid(),
  professional_id uuid references public.professional_profiles(id) on delete cascade,
  title text not null,
  body text not null,
  created_at timestamptz default now()
);

alter table public.aesthetic_posts enable row level security;
create policy "posts readable" on public.aesthetic_posts for select using (true);
create policy "aesthetician manages posts" on public.aesthetic_posts
  for all using (
    auth.uid() = (
      select user_id from public.professional_profiles where id = professional_id
    )
  );
