-- BetterMe core schema + auth/gameplay functions

create extension if not exists pgcrypto;

-- Enums
DO $$ BEGIN
  CREATE TYPE public.tier_enum AS ENUM ('Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.quest_category_enum AS ENUM ('Health', 'Knowledge', 'Focus Block', 'Mindfulness', 'Fitness');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.quest_frequency_enum AS ENUM ('Daily', 'Weekly', 'Specific Days');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.quest_difficulty_enum AS ENUM ('Easy', 'Medium', 'Hard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE public.friend_status_enum AS ENUM ('pending', 'accepted');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Tables
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  avatar_url text,
  tier public.tier_enum not null default 'Bronze',
  total_xp integer not null default 0 check (total_xp >= 0),
  profile_points integer not null default 0 check (profile_points >= 0),
  consistency_score integer not null default 0 check (consistency_score >= 0 and consistency_score <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  is_invited boolean not null default false,
  invited_by_user_id uuid references public.users(id) on delete set null
);

create table if not exists public.quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null,
  category public.quest_category_enum not null,
  frequency public.quest_frequency_enum not null,
  specific_days text[] null,
  difficulty public.quest_difficulty_enum not null,
  xp_reward integer not null default 50,
  profile_points_reward integer not null default 12,
  is_completed_today boolean not null default false,
  completed_dates date[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint quests_frequency_specific_days_check
    check (
      (frequency = 'Specific Days' and specific_days is not null and coalesce(array_length(specific_days, 1), 0) > 0)
      or (frequency <> 'Specific Days' and specific_days is null)
    )
);

create table if not exists public.friend_relationships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  friend_id uuid not null references public.users(id) on delete cascade,
  status public.friend_status_enum not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_relationships_not_self check (user_id <> friend_id),
  constraint friend_relationships_unique_direct unique (user_id, friend_id)
);

create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  invitation_code text not null unique,
  invited_email text not null,
  invited_by_user_id uuid not null references public.users(id) on delete cascade,
  invited_by_username text not null,
  is_used boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null,
  redeemed_by_user_id uuid references public.users(id) on delete set null
);

-- Indexes
create unique index if not exists friend_relationships_unique_pair_idx
  on public.friend_relationships ((least(user_id, friend_id)), (greatest(user_id, friend_id)));

create index if not exists quests_user_id_idx on public.quests (user_id);
create index if not exists quests_user_frequency_idx on public.quests (user_id, frequency);
create index if not exists users_xp_idx on public.users (total_xp desc);
create index if not exists invitations_email_idx on public.invitations (invited_email);
create index if not exists invitations_code_idx on public.invitations (invitation_code);

-- Triggers
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

DROP TRIGGER IF EXISTS users_set_updated_at ON public.users;
create trigger users_set_updated_at
before update on public.users
for each row
execute function public.set_updated_at();

DROP TRIGGER IF EXISTS quests_set_updated_at ON public.quests;
create trigger quests_set_updated_at
before update on public.quests
for each row
execute function public.set_updated_at();

DROP TRIGGER IF EXISTS friend_relationships_set_updated_at ON public.friend_relationships;
create trigger friend_relationships_set_updated_at
before update on public.friend_relationships
for each row
execute function public.set_updated_at();

DROP TRIGGER IF EXISTS invitations_set_updated_at ON public.invitations;
create trigger invitations_set_updated_at
before update on public.invitations
for each row
execute function public.set_updated_at();

-- Quest reward auto-calculation
create or replace function public.apply_quest_rewards()
returns trigger
language plpgsql
as $$
begin
  if new.difficulty = 'Easy' then
    new.xp_reward = 20;
    new.profile_points_reward = 5;
  elsif new.difficulty = 'Medium' then
    new.xp_reward = 50;
    new.profile_points_reward = 12;
  else
    new.xp_reward = 100;
    new.profile_points_reward = 25;
  end if;

  return new;
end;
$$;

DROP TRIGGER IF EXISTS quests_apply_rewards ON public.quests;
create trigger quests_apply_rewards
before insert or update of difficulty
on public.quests
for each row
execute function public.apply_quest_rewards();

-- Tier resolution
create or replace function public.calculate_tier(profile_points integer)
returns public.tier_enum
language plpgsql
immutable
as $$
begin
  if profile_points >= 2000 then
    return 'Diamond';
  elsif profile_points >= 1500 then
    return 'Platinum';
  elsif profile_points >= 1000 then
    return 'Gold';
  elsif profile_points >= 500 then
    return 'Silver';
  else
    return 'Bronze';
  end if;
end;
$$;

-- Keep public.users synced with auth.users
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, avatar_url)
  values (
    new.id,
    lower(coalesce(new.email, '')),
    nullif(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'), ''),
    nullif(new.raw_user_meta_data ->> 'avatar_url', '')
  )
  on conflict (id)
  do update set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.users.full_name),
    avatar_url = coalesce(excluded.avatar_url, public.users.avatar_url),
    updated_at = now();

  return new;
end;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_auth_user();

-- Consistency score helper (Monday to current day, IST)
create or replace function public.calculate_consistency_score(p_user_id uuid)
returns integer
language plpgsql
as $$
declare
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_week_start date := v_today - ((extract(isodow from v_today)::int) - 1);
  v_total_possible integer := 0;
  v_total_completed integer := 0;
  v_quest record;
  v_day date;
  v_day_code text;
begin
  for v_quest in
    select * from public.quests where user_id = p_user_id
  loop
    if v_quest.frequency = 'Daily' then
      v_total_possible := v_total_possible + ((v_today - v_week_start) + 1);

      v_total_completed := v_total_completed + (
        select coalesce(count(*), 0)
        from unnest(v_quest.completed_dates) as completed_date
        where completed_date between v_week_start and v_today
      );

    elsif v_quest.frequency = 'Weekly' then
      v_total_possible := v_total_possible + 1;

      if exists (
        select 1
        from unnest(v_quest.completed_dates) as completed_date
        where completed_date between v_week_start and v_today
      ) then
        v_total_completed := v_total_completed + 1;
      end if;

    else
      for v_day in
        select generate_series(v_week_start, v_today, '1 day'::interval)::date
      loop
        v_day_code := case extract(isodow from v_day)::int
          when 1 then 'M'
          when 2 then 'Tu'
          when 3 then 'W'
          when 4 then 'Th'
          when 5 then 'F'
          when 6 then 'Sa'
          else 'Su'
        end;

        if (
          v_day_code = any(v_quest.specific_days)
          or ((v_day_code in ('Tu', 'Th')) and ('T' = any(v_quest.specific_days)))
          or ((v_day_code in ('Sa', 'Su')) and ('S' = any(v_quest.specific_days)))
        ) then
          v_total_possible := v_total_possible + 1;
        end if;
      end loop;

      v_total_completed := v_total_completed + (
        select coalesce(count(*), 0)
        from unnest(v_quest.completed_dates) as completed_date
        where completed_date between v_week_start and v_today
      );
    end if;
  end loop;

  if v_total_possible = 0 then
    return 0;
  end if;

  return least(100, round((v_total_completed::numeric / v_total_possible::numeric) * 100)::int);
end;
$$;

-- Atomic quest completion
create or replace function public.complete_quest(p_quest_id uuid)
returns table (
  quest_id uuid,
  awarded_xp integer,
  awarded_profile_points integer,
  total_xp integer,
  profile_points integer,
  tier public.tier_enum
)
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_today date := (now() at time zone 'Asia/Kolkata')::date;
  v_week_start date := v_today - ((extract(isodow from v_today)::int) - 1);
  v_weekday_code text;
  v_quest public.quests%rowtype;
  v_user public.users%rowtype;
  v_consistency integer;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select *
  into v_quest
  from public.quests
  where id = p_quest_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Quest not found';
  end if;

  v_weekday_code := case extract(isodow from v_today)::int
    when 1 then 'M'
    when 2 then 'Tu'
    when 3 then 'W'
    when 4 then 'Th'
    when 5 then 'F'
    when 6 then 'Sa'
    else 'Su'
  end;

  if v_quest.frequency = 'Specific Days' then
    if not (
      v_weekday_code = any(v_quest.specific_days)
      or ((v_weekday_code in ('Tu', 'Th')) and ('T' = any(v_quest.specific_days)))
      or ((v_weekday_code in ('Sa', 'Su')) and ('S' = any(v_quest.specific_days)))
    ) then
      raise exception 'Quest is not scheduled for today';
    end if;
  end if;

  if v_quest.frequency = 'Daily' or v_quest.frequency = 'Specific Days' then
    if v_today = any(v_quest.completed_dates) then
      raise exception 'Quest already completed today';
    end if;
  elsif v_quest.frequency = 'Weekly' then
    if exists (
      select 1
      from unnest(v_quest.completed_dates) as completed_date
      where completed_date between v_week_start and (v_week_start + 6)
    ) then
      raise exception 'Quest already completed this week';
    end if;
  end if;

  update public.quests
  set
    completed_dates = (
      select array_agg(distinct completed_date order by completed_date)
      from unnest(array_append(v_quest.completed_dates, v_today)) as completed_date
    ),
    is_completed_today = true,
    updated_at = now()
  where id = v_quest.id;

  select *
  into v_user
  from public.users
  where id = v_user_id
  for update;

  update public.users
  set
    total_xp = v_user.total_xp + v_quest.xp_reward,
    profile_points = v_user.profile_points + v_quest.profile_points_reward,
    tier = public.calculate_tier(v_user.profile_points + v_quest.profile_points_reward),
    consistency_score = public.calculate_consistency_score(v_user_id),
    updated_at = now()
  where id = v_user_id
  returning consistency_score into v_consistency;

  return query
    select
      v_quest.id,
      v_quest.xp_reward,
      v_quest.profile_points_reward,
      v_user.total_xp + v_quest.xp_reward,
      v_user.profile_points + v_quest.profile_points_reward,
      public.calculate_tier(v_user.profile_points + v_quest.profile_points_reward);
end;
$$;

-- Friend lifecycle functions
create or replace function public.send_friend_request(p_friend_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_id uuid;
  v_new_id uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_friend_id is null or p_friend_id = v_user_id then
    raise exception 'Invalid friend target';
  end if;

  select id
  into v_existing_id
  from public.friend_relationships
  where (user_id = v_user_id and friend_id = p_friend_id)
     or (user_id = p_friend_id and friend_id = v_user_id)
  limit 1;

  if v_existing_id is not null then
    raise exception 'Friend relationship already exists';
  end if;

  insert into public.friend_relationships (user_id, friend_id, status)
  values (v_user_id, p_friend_id, 'pending')
  returning id into v_new_id;

  return v_new_id;
end;
$$;

create or replace function public.accept_friend_request(p_relationship_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  update public.friend_relationships
  set status = 'accepted', updated_at = now()
  where id = p_relationship_id
    and friend_id = v_user_id
    and status = 'pending';

  return found;
end;
$$;

create or replace function public.reject_friend_request(p_relationship_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.friend_relationships
  where id = p_relationship_id
    and friend_id = v_user_id
    and status = 'pending';

  return found;
end;
$$;

create or replace function public.unfriend(p_friend_id uuid)
returns boolean
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  delete from public.friend_relationships
  where status = 'accepted'
    and (
      (user_id = v_user_id and friend_id = p_friend_id)
      or (user_id = p_friend_id and friend_id = v_user_id)
    );

  return found;
end;
$$;

-- Invitation lifecycle
create or replace function public.create_invitation(p_invited_email text)
returns public.invitations
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_inviter_name text;
  v_code text;
  v_invitation public.invitations%rowtype;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if p_invited_email is null or length(trim(p_invited_email)) < 5 then
    raise exception 'Invalid invited email';
  end if;

  select coalesce(full_name, split_part(email, '@', 1))
  into v_inviter_name
  from public.users
  where id = v_user_id;

  if v_inviter_name is null then
    v_inviter_name := 'BetterMe User';
  end if;

  loop
    v_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 10));

    begin
      insert into public.invitations (
        invitation_code,
        invited_email,
        invited_by_user_id,
        invited_by_username,
        is_used,
        expires_at
      )
      values (
        v_code,
        lower(trim(p_invited_email)),
        v_user_id,
        v_inviter_name,
        false,
        now() + interval '30 days'
      )
      returning * into v_invitation;

      exit;
    exception
      when unique_violation then
        -- Retry code generation.
    end;
  end loop;

  return v_invitation;
end;
$$;

create or replace function public.redeem_invitation(p_invitation_code text)
returns boolean
language plpgsql
as $$
declare
  v_user_id uuid := auth.uid();
  v_user_email text;
  v_invitation public.invitations%rowtype;
  v_existing_friend uuid;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select email into v_user_email from public.users where id = v_user_id;

  if v_user_email is null then
    raise exception 'User profile not found';
  end if;

  select *
  into v_invitation
  from public.invitations
  where invitation_code = upper(trim(p_invitation_code))
    and is_used = false
    and expires_at > now()
  for update;

  if not found then
    return false;
  end if;

  if lower(v_invitation.invited_email) <> lower(v_user_email) then
    raise exception 'Invitation email mismatch';
  end if;

  update public.invitations
  set
    is_used = true,
    redeemed_by_user_id = v_user_id,
    updated_at = now()
  where id = v_invitation.id;

  update public.users
  set
    is_invited = true,
    invited_by_user_id = v_invitation.invited_by_user_id,
    updated_at = now()
  where id = v_user_id;

  select id
  into v_existing_friend
  from public.friend_relationships
  where (user_id = v_user_id and friend_id = v_invitation.invited_by_user_id)
     or (user_id = v_invitation.invited_by_user_id and friend_id = v_user_id)
  limit 1;

  if v_existing_friend is null then
    insert into public.friend_relationships (user_id, friend_id, status)
    values (v_user_id, v_invitation.invited_by_user_id, 'accepted');
  end if;

  return true;
end;
$$;

-- RLS
alter table public.users enable row level security;
alter table public.quests enable row level security;
alter table public.friend_relationships enable row level security;
alter table public.invitations enable row level security;

-- Users policies
DROP POLICY IF EXISTS users_select_authenticated ON public.users;
create policy users_select_authenticated
on public.users
for select
to authenticated
using (true);

DROP POLICY IF EXISTS users_insert_own ON public.users;
create policy users_insert_own
on public.users
for insert
to authenticated
with check (auth.uid() = id);

DROP POLICY IF EXISTS users_update_own ON public.users;
create policy users_update_own
on public.users
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Quests policies
DROP POLICY IF EXISTS quests_select_own ON public.quests;
create policy quests_select_own
on public.quests
for select
to authenticated
using (auth.uid() = user_id);

DROP POLICY IF EXISTS quests_insert_own ON public.quests;
create policy quests_insert_own
on public.quests
for insert
to authenticated
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS quests_update_own ON public.quests;
create policy quests_update_own
on public.quests
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS quests_delete_own ON public.quests;
create policy quests_delete_own
on public.quests
for delete
to authenticated
using (auth.uid() = user_id);

-- Friend relationships policies
DROP POLICY IF EXISTS friends_select_participant ON public.friend_relationships;
create policy friends_select_participant
on public.friend_relationships
for select
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);

DROP POLICY IF EXISTS friends_insert_requester ON public.friend_relationships;
create policy friends_insert_requester
on public.friend_relationships
for insert
to authenticated
with check (auth.uid() = user_id);

DROP POLICY IF EXISTS friends_update_recipient ON public.friend_relationships;
create policy friends_update_recipient
on public.friend_relationships
for update
to authenticated
using (auth.uid() = friend_id)
with check (auth.uid() = friend_id);

DROP POLICY IF EXISTS friends_delete_participant ON public.friend_relationships;
create policy friends_delete_participant
on public.friend_relationships
for delete
to authenticated
using (auth.uid() = user_id or auth.uid() = friend_id);

-- Invitations policies
DROP POLICY IF EXISTS invitations_select_owner_or_redeemer ON public.invitations;
create policy invitations_select_owner_or_redeemer
on public.invitations
for select
to authenticated
using (
  auth.uid() = invited_by_user_id
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(u.email) = lower(invited_email)
  )
);

DROP POLICY IF EXISTS invitations_select_public_active ON public.invitations;
create policy invitations_select_public_active
on public.invitations
for select
to anon
using (
  is_used = false
  and expires_at > now()
);

DROP POLICY IF EXISTS invitations_insert_owner ON public.invitations;
create policy invitations_insert_owner
on public.invitations
for insert
to authenticated
with check (auth.uid() = invited_by_user_id);

DROP POLICY IF EXISTS invitations_update_owner_or_redeemer ON public.invitations;
create policy invitations_update_owner_or_redeemer
on public.invitations
for update
to authenticated
using (
  auth.uid() = invited_by_user_id
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(u.email) = lower(invited_email)
  )
)
with check (
  auth.uid() = invited_by_user_id
  or exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and lower(u.email) = lower(invited_email)
  )
);

-- Function permissions
grant execute on function public.complete_quest(uuid) to authenticated;
grant execute on function public.send_friend_request(uuid) to authenticated;
grant execute on function public.accept_friend_request(uuid) to authenticated;
grant execute on function public.reject_friend_request(uuid) to authenticated;
grant execute on function public.unfriend(uuid) to authenticated;
grant execute on function public.create_invitation(text) to authenticated;
grant execute on function public.redeem_invitation(text) to authenticated;
