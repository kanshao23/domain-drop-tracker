-- Profiles table extends auth.users
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Domains watchlist
create table public.domains (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade not null,
  domain text not null,
  status text not null default 'active' check (status in ('active', 'dropped', 'checking')),
  last_checked_at timestamptz,
  dropped_at timestamptz,
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id, domain)
);

alter table public.domains enable row level security;

create policy "Users can manage own domains"
  on public.domains for all
  using (auth.uid() = user_id);

-- Service role can update domains (for cron job)
create policy "Service role can update all domains"
  on public.domains for update
  using (auth.role() = 'service_role');

create policy "Service role can select all domains"
  on public.domains for select
  using (auth.role() = 'service_role');

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
