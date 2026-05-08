-- ============================================================
-- PBallConnect — Supabase RLS Policies
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor)
-- After running, verify each table shows RLS = enabled
-- ============================================================

-- ── PUBLIC_PROFILES view ────────────────────────────────────
-- Safe subset of registrations for player browsing, IC lookup,
-- and the coach directory. Strips PII (lat/lon, address, phone).
-- Browse queries should use /rest/v1/public_profiles.
-- Self-reads (profile page, restoreSession) stay on /rest/v1/registrations.

-- Add is_organizer column to registrations if it doesn't already exist
alter table registrations add column if not exists is_organizer boolean not null default false;

-- Add availability window columns
alter table registrations add column if not exists avail_weekday_morning   boolean default false;
alter table registrations add column if not exists avail_weekday_afternoon boolean default false;
alter table registrations add column if not exists avail_weekday_evening   boolean default false;
alter table registrations add column if not exists avail_weekends          boolean default false;

drop view if exists public_profiles;

create view public_profiles as
  select
    id,
    first_name,
    last_name,
    nickname,
    avatar_emoji,
    skill_level,
    dupr_rating,
    gender,
    play_style,
    play_format,
    match_gender_pref,
    handedness,
    schedule,
    anytime,
    state,
    county,
    city,
    playing_since,
    wants_to_improve,
    goal_rating,
    has_had_lesson,
    wants_lesson,
    is_coach,
    coach_certifications,
    coach_lesson_types,
    coach_formats,
    photo_url,
    email,
    created_at,
    -- proximity matching
    lat,
    lon,
    -- display fields
    court_name,
    play_venues,
    -- coach directory
    coach_rate_min,
    coach_rate_max,
    coach_bio,
    -- organizer feature
    is_organizer,
    -- availability windows
    avail_weekday_morning,
    avail_weekday_afternoon,
    avail_weekday_evening,
    avail_weekends
  from registrations;


-- ── REGISTRATIONS ───────────────────────────────────────────
-- Any signed-in user can browse registrations (needed for player
-- matching, IC lookup, and the coach directory).
-- Only the row owner can insert/update/delete their own record.

alter table registrations enable row level security;

drop policy if exists "Authenticated users can read registrations" on registrations;
drop policy if exists "Users can insert their own registration" on registrations;
drop policy if exists "Users can update their own registration" on registrations;
drop policy if exists "Users can delete their own registration" on registrations;

create policy "Authenticated users can read registrations"
  on registrations for select
  to authenticated
  using (true);

create policy "Users can insert their own registration"
  on registrations for insert
  to authenticated
  with check (auth.email() = email);

create policy "Users can update their own registration"
  on registrations for update
  to authenticated
  using (auth.email() = email);

create policy "Users can delete their own registration"
  on registrations for delete
  to authenticated
  using (auth.email() = email);


-- ── CONNECTIONS (Inner Circle) ───────────────────────────────
-- Users can only see connections they are a party to.
-- Only the requester can create a connection request.

alter table connections enable row level security;

drop policy if exists "Users can read their own connections" on connections;
drop policy if exists "Users can create connection requests" on connections;
drop policy if exists "Users can update connections they are part of" on connections;
drop policy if exists "Users can delete connections they are part of" on connections;

create policy "Users can read their own connections"
  on connections for select
  to authenticated
  using (auth.email() = requester_email or auth.email() = recipient_email);

create policy "Users can create connection requests"
  on connections for insert
  to authenticated
  with check (auth.email() = requester_email);

create policy "Users can update connections they are part of"
  on connections for update
  to authenticated
  using (auth.email() = requester_email or auth.email() = recipient_email);

create policy "Users can delete connections they are part of"
  on connections for delete
  to authenticated
  using (auth.email() = requester_email or auth.email() = recipient_email);


-- ── MATCHES ─────────────────────────────────────────────────
-- All signed-in users can read matches (open match browsing).
-- Only the organizer can modify/delete their own matches.

alter table matches enable row level security;

drop policy if exists "Authenticated users can read matches" on matches;
drop policy if exists "Users can create matches" on matches;
drop policy if exists "Organizers can update their matches" on matches;
drop policy if exists "Organizers can delete their matches" on matches;

create policy "Authenticated users can read matches"
  on matches for select
  to authenticated
  using (true);

create policy "Users can create matches"
  on matches for insert
  to authenticated
  with check (auth.email() = organizer_email);

create policy "Organizers can update their matches"
  on matches for update
  to authenticated
  using (auth.email() = organizer_email);

create policy "Organizers can delete their matches"
  on matches for delete
  to authenticated
  using (auth.email() = organizer_email);


-- ── MATCH_RESPONSES ─────────────────────────────────────────
-- Users see their own responses, and match organizers see all
-- responses to matches they own.

alter table match_responses enable row level security;

drop policy if exists "Users can read relevant match responses" on match_responses;
drop policy if exists "Users can insert their own match response" on match_responses;
drop policy if exists "Users can update their own match response" on match_responses;
drop policy if exists "Users can delete their own match response" on match_responses;

create policy "Users can read relevant match responses"
  on match_responses for select
  to authenticated
  using (
    auth.email() = player_email
    or exists (
      select 1 from matches
      where matches.id = match_responses.match_id
        and matches.organizer_email = auth.email()
    )
  );

create policy "Users can insert their own match response"
  on match_responses for insert
  to authenticated
  with check (auth.email() = player_email);

create policy "Users can update their own match response"
  on match_responses for update
  to authenticated
  using (
    auth.email() = player_email
    or exists (
      select 1 from matches
      where matches.id = match_responses.match_id
        and matches.organizer_email = auth.email()
    )
  );

create policy "Users can delete their own match response"
  on match_responses for delete
  to authenticated
  using (
    auth.email() = player_email
    or exists (
      select 1 from matches
      where matches.id = match_responses.match_id
        and matches.organizer_email = auth.email()
    )
  );


-- ── MATCH_RESULTS ────────────────────────────────────────────
-- Any signed-in user can read results. Only organizers insert them.

alter table match_results enable row level security;

drop policy if exists "Authenticated users can read match results" on match_results;
drop policy if exists "Authenticated users can insert match results" on match_results;
drop policy if exists "Organizers can update match results" on match_results;
drop policy if exists "Organizers can delete match results" on match_results;

create policy "Authenticated users can read match results"
  on match_results for select
  to authenticated
  using (true);

create policy "Authenticated users can insert match results"
  on match_results for insert
  to authenticated
  with check (
    exists (
      select 1 from matches
      where matches.id = match_results.match_id
        and matches.organizer_email = auth.email()
    )
  );

create policy "Organizers can update match results"
  on match_results for update
  to authenticated
  using (
    exists (
      select 1 from matches
      where matches.id = match_results.match_id
        and matches.organizer_email = auth.email()
    )
  );

create policy "Organizers can delete match results"
  on match_results for delete
  to authenticated
  using (
    exists (
      select 1 from matches
      where matches.id = match_results.match_id
        and matches.organizer_email = auth.email()
    )
  );


-- ── COURTS ───────────────────────────────────────────────────
-- Courts are public — readable by anyone (needed before auth for
-- the registration flow). Any signed-in user can add a court.

alter table courts enable row level security;

drop policy if exists "Anyone can read courts" on courts;
drop policy if exists "Authenticated users can add courts" on courts;
drop policy if exists "Court owners can update their courts" on courts;
drop policy if exists "Court owners can delete their courts" on courts;

create policy "Anyone can read courts"
  on courts for select
  to anon, authenticated
  using (true);

create policy "Authenticated users can add courts"
  on courts for insert
  to authenticated
  with check (true);

create policy "Court owners can update their courts"
  on courts for update
  to authenticated
  using (auth.email() = added_by_player);

create policy "Court owners can delete their courts"
  on courts for delete
  to authenticated
  using (auth.email() = added_by_player);


-- ── PLAYER_COURTS ────────────────────────────────────────────
-- Users manage only their own court associations.

alter table player_courts enable row level security;

drop policy if exists "Users can read their own player courts" on player_courts;
drop policy if exists "Users can insert their own player courts" on player_courts;
drop policy if exists "Users can update their own player courts" on player_courts;
drop policy if exists "Users can delete their own player courts" on player_courts;

create policy "Users can read their own player courts"
  on player_courts for select
  to authenticated
  using (auth.email() = player_email);

create policy "Users can insert their own player courts"
  on player_courts for insert
  to authenticated
  with check (auth.email() = player_email);

create policy "Users can update their own player courts"
  on player_courts for update
  to authenticated
  using (auth.email() = player_email);

create policy "Users can delete their own player courts"
  on player_courts for delete
  to authenticated
  using (auth.email() = player_email);


-- ── INVITES ─────────────────────────────────────────────────
-- Authenticated users see only their own invites (sent or received).
-- Pre-auth invite-link reads use the invite_tokens view (below),
-- which exposes only invite_token, inviter_name, and status to anon.

-- ── INVITE_TOKENS view (safe anon read for invite landing page) ──
-- Query: /rest/v1/invite_tokens?invite_token=eq.<token>
-- Returns only the columns needed before the recipient has signed in.
drop view if exists invite_tokens;

create view invite_tokens as
  select invite_token, inviter_name, invitee_email, status
  from invites;

alter table invites enable row level security;

drop policy if exists "Anyone can read invites" on invites;
drop policy if exists "Authenticated users can read invites" on invites;
drop policy if exists "Authenticated users can update invites" on invites;
drop policy if exists "Authenticated users can insert invites" on invites;

create policy "Authenticated users can read invites"
  on invites for select
  to authenticated
  using (auth.email() = inviter_email or (invitee_email is not null and auth.email() = invitee_email));

create policy "Authenticated users can insert invites"
  on invites for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update invites"
  on invites for update
  to authenticated
  using (
    auth.email() = inviter_email
    or (invitee_email is not null and auth.email() = invitee_email)
  );


-- ── PLAYER_FEEDBACK ─────────────────────────────────────────

alter table player_feedback enable row level security;

drop policy if exists "Users can read feedback they gave or received" on player_feedback;
drop policy if exists "Authenticated users can insert feedback" on player_feedback;
drop policy if exists "Reviewers can update their own feedback" on player_feedback;
drop policy if exists "Reviewers can delete their own feedback" on player_feedback;

create policy "Users can read feedback they gave or received"
  on player_feedback for select
  to authenticated
  using (auth.email() = reviewer_email or auth.email() = reviewed_email);

create policy "Authenticated users can insert feedback"
  on player_feedback for insert
  to authenticated
  with check (auth.email() = reviewer_email);

create policy "Reviewers can update their own feedback"
  on player_feedback for update
  to authenticated
  using (auth.email() = reviewer_email);

create policy "Reviewers can delete their own feedback"
  on player_feedback for delete
  to authenticated
  using (auth.email() = reviewer_email);


-- ── PLAYER_AVAILABILITY ──────────────────────────────────────

alter table player_availability enable row level security;

drop policy if exists "Authenticated users can read availability" on player_availability;
drop policy if exists "Users can manage their own availability" on player_availability;
drop policy if exists "Users can update their own availability" on player_availability;
drop policy if exists "Users can delete their own availability" on player_availability;

create policy "Authenticated users can read availability"
  on player_availability for select
  to authenticated
  using (true);

create policy "Users can manage their own availability"
  on player_availability for insert
  to authenticated
  with check (auth.email() = player_email);

create policy "Users can update their own availability"
  on player_availability for update
  to authenticated
  using (auth.email() = player_email);

create policy "Users can delete their own availability"
  on player_availability for delete
  to authenticated
  using (auth.email() = player_email);


-- ── BETA_FEEDBACK ────────────────────────────────────────────

alter table beta_feedback enable row level security;

drop policy if exists "Authenticated users can submit beta feedback" on beta_feedback;

create policy "Authenticated users can submit beta feedback"
  on beta_feedback for insert
  to authenticated
  with check (true);


-- ── PLAYER_GROUPS ─────────────────────────────────────────────
-- Named groups created by organizers for quick match inviting.
create table if not exists player_groups (
  id uuid primary key default gen_random_uuid(),
  organizer_email text not null,
  name text not null,
  max_players int not null default 4,  -- 4 / 8 / 12 / 16
  notes text,
  created_at timestamptz default now()
);

alter table player_groups enable row level security;

drop policy if exists "Organizers can read their own groups" on player_groups;
drop policy if exists "Organizers can insert their own groups" on player_groups;
drop policy if exists "Organizers can update their own groups" on player_groups;
drop policy if exists "Organizers can delete their own groups" on player_groups;

create policy "Organizers can read their own groups"
  on player_groups for select
  to authenticated
  using (auth.email() = organizer_email);

create policy "Organizers can insert their own groups"
  on player_groups for insert
  to authenticated
  with check (auth.email() = organizer_email);

create policy "Organizers can update their own groups"
  on player_groups for update
  to authenticated
  using (auth.email() = organizer_email);

create policy "Organizers can delete their own groups"
  on player_groups for delete
  to authenticated
  using (auth.email() = organizer_email);


-- ── PLAYER_GROUP_MEMBERS ──────────────────────────────────────
-- Members of a named group (primary players + sub pool).
create table if not exists player_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid references player_groups(id) on delete cascade,
  player_email text not null,
  player_name text,
  role text not null default 'primary',  -- 'primary' | 'sub'
  sub_category text,                      -- e.g. 'Backup', 'Weather sub'
  created_at timestamptz default now()
);

alter table player_group_members enable row level security;

drop policy if exists "Organizers can read their group members" on player_group_members;
drop policy if exists "Organizers can insert group members" on player_group_members;
drop policy if exists "Organizers can update group members" on player_group_members;
drop policy if exists "Organizers can delete group members" on player_group_members;

create policy "Organizers can read their group members"
  on player_group_members for select
  to authenticated
  using (
    exists (
      select 1 from player_groups
      where player_groups.id = player_group_members.group_id
        and player_groups.organizer_email = auth.email()
    )
  );

create policy "Organizers can insert group members"
  on player_group_members for insert
  to authenticated
  with check (
    exists (
      select 1 from player_groups
      where player_groups.id = player_group_members.group_id
        and player_groups.organizer_email = auth.email()
    )
  );

create policy "Organizers can update group members"
  on player_group_members for update
  to authenticated
  using (
    exists (
      select 1 from player_groups
      where player_groups.id = player_group_members.group_id
        and player_groups.organizer_email = auth.email()
    )
  );

create policy "Organizers can delete group members"
  on player_group_members for delete
  to authenticated
  using (
    exists (
      select 1 from player_groups
      where player_groups.id = player_group_members.group_id
        and player_groups.organizer_email = auth.email()
    )
  );


-- ── RECURRING_MATCHES ─────────────────────────────────────────
-- Recurring match schedules linked to a named group.
create table if not exists recurring_matches (
  id uuid primary key default gen_random_uuid(),
  organizer_email text not null,
  group_id uuid references player_groups(id) on delete set null,
  group_name text,
  days_of_week text not null,   -- comma-separated: 'Mon,Wed,Fri'
  time_start text not null,     -- 'HH:MM' 24-hr
  duration_hours numeric not null default 2,
  court_id uuid,
  court_name text,
  auto_invite_hours int not null default 48,  -- 24 / 48 / 72 / 96
  gap_alert_hours int not null default 4,
  status text not null default 'active',      -- 'active' | 'paused'
  created_at timestamptz default now()
);

alter table recurring_matches enable row level security;

drop policy if exists "Organizers can read their recurring matches" on recurring_matches;
drop policy if exists "Organizers can insert recurring matches" on recurring_matches;
drop policy if exists "Organizers can update recurring matches" on recurring_matches;
drop policy if exists "Organizers can delete recurring matches" on recurring_matches;

create policy "Organizers can read their recurring matches"
  on recurring_matches for select
  to authenticated
  using (auth.email() = organizer_email);

create policy "Organizers can insert recurring matches"
  on recurring_matches for insert
  to authenticated
  with check (auth.email() = organizer_email);

create policy "Organizers can update recurring matches"
  on recurring_matches for update
  to authenticated
  using (auth.email() = organizer_email);

create policy "Organizers can delete recurring matches"
  on recurring_matches for delete
  to authenticated
  using (auth.email() = organizer_email);


-- ── WAITLIST ──────────────────────────────────────────────────
-- Public waitlist for the landing page at landing.html.
-- Written by the /api/waitlist Cloudflare Pages Function using
-- the service role key (bypasses RLS). No public access granted.
-- David reads/exports this table manually from the Supabase dashboard.
--
-- Run this block in Supabase SQL Editor when ready to launch the waitlist.

create table if not exists waitlist (
  id           uuid        primary key default gen_random_uuid(),
  first_name   text        not null,
  email        text        not null,
  zip_code     text        not null,
  requested_at timestamptz not null default now(),
  invited_at   timestamptz,           -- set manually when David sends their invite
  notes        text,                  -- internal use only
  constraint waitlist_email_unique unique (email)
);

alter table waitlist enable row level security;

-- No public policies — service role key bypasses RLS for all writes.
-- Authenticated admin reads (Supabase dashboard / service role) work without policies.
