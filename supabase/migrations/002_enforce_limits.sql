-- Defense-in-depth: enforce the free-plan domain limit and a valid domain
-- format at the database level. The client (DashboardClient.tsx) still checks
-- both for UX, but RLS alone lets a user insert arbitrary rows via the API.

-- ─── Domain format ───────────────────────────────────────────────────────────
-- Postgres POSIX regex has no lookahead, so the length bound is a separate
-- predicate. Case-insensitive (~*) since the app lowercases before insert.
alter table public.domains
  add constraint domains_format_check
  check (
    char_length(domain) between 1 and 253
    and domain ~* '^([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$'
  );

-- ─── Free-plan limit ───────────────────────────────────────────────────────
-- Reject a new domain when a non-pro user already watches FREE_LIMIT (10).
-- SECURITY DEFINER so the count runs regardless of the caller's RLS context.
create or replace function public.enforce_domain_limit()
returns trigger as $$
declare
  user_plan text;
  domain_count int;
begin
  select plan into user_plan
  from public.profiles
  where id = new.user_id;

  if user_plan is distinct from 'pro' then
    select count(*) into domain_count
    from public.domains
    where user_id = new.user_id;

    if domain_count >= 10 then
      raise exception 'Free plan limit of 10 domains reached'
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$ language plpgsql security definer;

create trigger enforce_domain_limit_trigger
  before insert on public.domains
  for each row execute procedure public.enforce_domain_limit();
