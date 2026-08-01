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

-- Add SMS notification columns
alter table registrations add column if not exists phone        text;
alter table registrations add column if not exists sms_opt_in  boolean default false;
alter table registrations add column if not exists sms_opt_in_at timestamptz;

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
    avail_weekends,
    -- sms opt-in flag (phone number intentionally excluded — PII, self-reads use /rest/v1/registrations)
    sms_opt_in
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
--
-- RLS AUDIT (July 2026): four untracked, live PERMISSIVE anon-role policies
-- were found on this table via pg_policies — "anon_all" (cmd ALL, qual true,
-- with_check true) plus "Allow public inserts"/"Allow public reads"/
-- "Allow public updates" (same unrestricted grant, split by operation).
-- None appear anywhere in this file's history — untracked live drift, same
-- as the anon_all findings on matches/match_responses. Full trace of every
-- connections read/write in app.js (IC accept/decline, remove connection,
-- send invite, cancel pending invite, icPostPendingConnection(), and
-- handlePostRegistrationInvite()'s reciprocal-connection writes) confirmed
-- every single one runs as `authenticated`, never `anon` — no code
-- dependency found. Dropped as Phase 2 of RLS hardening.

alter table connections enable row level security;

drop policy if exists anon_all on connections;
drop policy if exists "Allow public inserts" on connections;
drop policy if exists "Allow public reads" on connections;
drop policy if exists "Allow public updates" on connections;
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
-- Organizers and confirmed participants can update matches
-- (participant updates needed for checkAndUpdateMatchStatus() flipping
-- status to 'full'). Only the organizer can delete their own matches.
--
-- RLS AUDIT (July 2026, Phase 1): a policy named "anon_all" (PERMISSIVE,
-- role anon, cmd ALL, qual true, with_check true) was found live on this
-- table via pg_policies, granting unrestricted anon CRUD alongside the
-- scoped policies below. It does not appear anywhere in this file's
-- history — it was applied directly against the live database, never
-- tracked here. No code in app.js or functions/api/*.js was found to
-- depend on anon-role access to this table (every write is gated behind
-- a logged-in session, running as `authenticated`; Functions use the
-- service role, which bypasses RLS regardless). Dropped as Phase 1 of
-- RLS hardening.
--
-- RLS AUDIT (July 2026, Phase 2 — Priority 2 item #4): two additional
-- untracked policies were found live and dropped — "Anyone can insert
-- matches" and "Anyone can update matches" (both PERMISSIVE, role
-- public, with_check/qual true). Role `public` matches every role
-- including `authenticated`, so these silently made the scoped policies
-- below no-ops via permissive-OR. Also found and dropped: "Anyone can
-- read matches" (role public+authenticated, qual true) — repo-wide grep
-- confirmed zero legitimate dependency on unauthenticated reads. The
-- UPDATE policy below was simultaneously broadened from organizer-only
-- to organizer-or-participant, since checkAndUpdateMatchStatus()
-- (app.js:8239) legitimately needs any confirmed 'in' participant, not
-- just the organizer, to flip status to 'full' when the roster fills.

alter table matches enable row level security;

drop policy if exists anon_all on matches;
drop policy if exists "Anyone can insert matches" on matches;
drop policy if exists "Anyone can update matches" on matches;
drop policy if exists "Anyone can read matches" on matches;
drop policy if exists "Authenticated users can read matches" on matches;
drop policy if exists "Users can create matches" on matches;
drop policy if exists "Organizers can update their matches" on matches;
drop policy if exists "Users can update matches they organize or participate in" on matches;
drop policy if exists "Organizers can delete their matches" on matches;

create policy "Authenticated users can read matches"
  on matches for select
  to authenticated
  using (true);

create policy "Users can create matches"
  on matches for insert
  to authenticated
  with check (auth.email() = organizer_email);

create policy "Users can update matches they organize or participate in"
  on matches for update
  to authenticated
  using (
    auth.email() = organizer_email
    or exists (
      select 1 from match_responses
      where match_responses.match_id = matches.id
        and match_responses.player_email = auth.email()
        and match_responses.response = 'in'
    )
  );

create policy "Organizers can delete their matches"
  on matches for delete
  to authenticated
  using (auth.email() = organizer_email);


-- ── MATCH_RESPONSES ─────────────────────────────────────────
-- Users see their own responses, and match organizers see all
-- responses to matches they own. Insert is allowed for self OR for
-- a match the caller organizes (organizers invite/promote/emergency-fill
-- other players' rows).
--
-- RLS AUDIT (July 2026, Phase 1): same "anon_all" finding as `matches`
-- above — a live, untracked PERMISSIVE policy (role anon, cmd ALL, qual
-- true, with_check true) granting unrestricted anon CRUD. No code was
-- found to depend on anon-role access here. Dropped as Phase 1 of RLS
-- hardening.
--
-- RLS AUDIT (July 2026, Phase 2 — Priority 2 item #5): three additional
-- untracked policies found live and dropped — "Anyone can insert
-- responses", "Anyone can read responses", "Anyone can update responses"
-- (all PERMISSIVE, role public, true) — same public-role no-op problem
-- as `matches`. The INSERT policy below was simultaneously broadened
-- from self-only to self-or-organizer: a real fraction of writes are the
-- caller writing to ANOTHER player's row (organizer inviting others,
-- waitlist promotion, emergency fill — app.js:4417/4428/4449/8343/
-- 8537/8899); a self-only policy would have broken those flows once the
-- loose public policy was removed.

alter table match_responses enable row level security;

drop policy if exists anon_all on match_responses;
drop policy if exists "Anyone can insert responses" on match_responses;
drop policy if exists "Anyone can read responses" on match_responses;
drop policy if exists "Anyone can update responses" on match_responses;
drop policy if exists "Users can read relevant match responses" on match_responses;
drop policy if exists "Users can insert their own match response" on match_responses;
drop policy if exists "Users can insert responses for self or their matches" on match_responses;
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

create policy "Users can insert responses for self or their matches"
  on match_responses for insert
  to authenticated
  with check (
    auth.email() = player_email
    or exists (
      select 1 from matches
      where matches.id = match_responses.match_id
        and matches.organizer_email = auth.email()
    )
  );

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
-- Any signed-in user can read results. Organizers or confirmed
-- participants can insert them. Only organizers update/delete.
--
-- RLS AUDIT (July 2026, Priority 1 item #3): a policy named "anon_all"
-- (PERMISSIVE, role anon, cmd ALL, qual true, with_check true) was found
-- live on this table via pg_policies, untracked here. No code was found
-- to depend on anon-role access (srConfirmGame()/saveWalkOnMatch() both
-- run as `authenticated`). Dropped.
--
-- RLS AUDIT (July 2026, Known Bug #25): the INSERT policy below was
-- broadened from organizer-only to organizer-or-participant.
-- loadRecordScores() (app.js:5516) surfaces the "Record Score" button to
-- both organizers and confirmed 'in' participants, but the original
-- organizer-only policy silently rejected non-organizer participants'
-- score submissions via RLS. Fixed to allow either.

alter table match_results enable row level security;

drop policy if exists anon_all on match_results;
drop policy if exists "Authenticated users can read match results" on match_results;
drop policy if exists "Authenticated users can insert match results" on match_results;
drop policy if exists "Organizer or participant can insert match results" on match_results;
drop policy if exists "Organizers can update match results" on match_results;
drop policy if exists "Organizers can delete match results" on match_results;

create policy "Authenticated users can read match results"
  on match_results for select
  to authenticated
  using (true);

create policy "Organizer or participant can insert match results"
  on match_results for insert
  to authenticated
  with check (
    exists (
      select 1 from matches
      where matches.id = match_results.match_id
        and matches.organizer_email = auth.email()
    )
    or exists (
      select 1 from match_responses
      where match_responses.match_id = match_results.match_id
        and match_responses.player_email = auth.email()
        and match_responses.response = 'in'
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
-- Any signed-in user can read/add courts. Only the adding player
-- can update/delete their own court entry.
--
-- RLS AUDIT (July 2026, Priority 3 item #8): a policy named "anon_all"
-- (PERMISSIVE, role anon, cmd ALL, qual true, with_check true) was found
-- live, untracked. Dropped — no code dependency found. Separately, the
-- "Anyone can read courts" policy below was narrowed from
-- `to anon, authenticated` to `to authenticated` only. Its original
-- comment (removed above) said this was needed pre-auth for the
-- registration flow; code trace confirmed the current registration flow
-- (doSaveProfile()/_qcSave()) is unreachable until after a real session
-- token is set, and all live courts call sites already send
-- Authorization: Bearer — the anon grant was unexercised by current code.

alter table courts enable row level security;

drop policy if exists anon_all on courts;
drop policy if exists "Anyone can read courts" on courts;
drop policy if exists "Authenticated users can read courts" on courts;
drop policy if exists "Authenticated users can add courts" on courts;
drop policy if exists "Court owners can update their courts" on courts;
drop policy if exists "Court owners can delete their courts" on courts;

create policy "Authenticated users can read courts"
  on courts for select
  to authenticated
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
--
-- RLS AUDIT (July 2026, Priority 3 item #7): "anon_all" and two more
-- untracked PERMISSIVE policies — "Allow public inserts", "Allow public
-- reads" (both role anon, true) — found live and dropped. Code trace (12
-- call sites) confirmed every one self-scoped to the caller's own
-- player_email, no anon dependency.

alter table player_courts enable row level security;

drop policy if exists anon_all on player_courts;
drop policy if exists "Allow public inserts" on player_courts;
drop policy if exists "Allow public reads" on player_courts;
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
-- Pre-auth invite-link reads use the invite_tokens view (below); the
-- pre-auth "opened" status write goes through a service-role Function
-- (/api/mark-invite-opened) instead of a direct client write — see the
-- RLS AUDIT notes below.

-- ── INVITE_TOKENS view (safe anon read for invite landing page) ──
-- Query: /rest/v1/invite_tokens?invite_token=eq.<token>
-- Returns only the columns needed before the recipient has signed in.
--
-- RLS AUDIT (July 2026): this view was found to have live anon AND
-- authenticated grants for INSERT, UPDATE, DELETE, and TRUNCATE — not just
-- SELECT. Because it's a plain single-table view with no security_invoker
-- setting and no DISTINCT/GROUP BY/joins/set operations, Postgres treats it
-- as automatically updatable: a write sent to this view passes straight
-- through to the base `invites` table, limited to the view's 4 exposed
-- columns — and `status` is one of those columns. This was a live, working
-- bypass of every RLS policy on `invites` itself, completely independent of
-- whatever policies existed on the base table (fixing only the base table's
-- policies would NOT have closed this). No code anywhere (app.js,
-- invite.html) was found to write through this view — every call site is a
-- GET-only read. Locked to SELECT-only for both roles.
drop view if exists invite_tokens;

create view invite_tokens as
  select invite_token, inviter_name, invitee_email, status
  from invites;

revoke insert, update, delete, truncate on invite_tokens from anon;
revoke insert, update, delete, truncate on invite_tokens from authenticated;
grant select on invite_tokens to anon;
grant select on invite_tokens to authenticated;

alter table invites enable row level security;

-- RLS AUDIT (July 2026): five untracked, live anon/public-role policies
-- were found on this table via pg_policies — anon_all (role public, cmd
-- ALL), "Anyone can insert invites" (public), "Anyone can read by token"
-- (public), "Public can read invite by token" (role anon, despite the
-- name), and "Anyone can update status" (public). None appear anywhere in
-- this file's history — untracked live drift, same as every other table
-- audited tonight. The two confirmed genuine pre-auth needs are both now
-- served without any anon-role policy on this base table at all: reads go
-- through the SELECT-only invite_tokens view above, and the "opened"
-- status write goes through /api/mark-invite-opened (service role,
-- replacing the direct client-side PATCH previously at app.js ~line 11840).
-- No anon-role replacement policy needed here. Dropped as Phase 3 of RLS
-- hardening.
drop policy if exists anon_all on invites;
drop policy if exists "Anyone can insert invites" on invites;
drop policy if exists "Anyone can read by token" on invites;
drop policy if exists "Public can read invite by token" on invites;
drop policy if exists "Anyone can update status" on invites;
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
-- Users read only feedback they gave or received. Insert/update/delete
-- are self-scoped to the reviewer.
--
-- RLS AUDIT (July 2026, Priority 1 item #1): "anon_all" (PERMISSIVE,
-- role anon, cmd ALL, qual true, with_check true) found live, untracked,
-- dropped. Code trace confirmed no read or write dependency —
-- submitPostMatchFeedback() self-attributes reviewer_email;
-- fetchPlayerStats() sends Authorization: Bearer <user token>, running
-- as `authenticated`, governed by the SELECT policy below, not anon_all.
-- (fetchPlayerStats()'s cross-player conduct-% read has a separate,
-- unrelated correctness issue under this self-scoped SELECT policy —
-- see CLAUDE.md Known Bug #24. Not an RLS/security issue, not addressed
-- here.)

alter table player_feedback enable row level security;

drop policy if exists anon_all on player_feedback;
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
-- SELECT is open to any authenticated user (not self-scoped) — this is
-- intentional: loadFindPlayers() (app.js:10331) needs to read every
-- authenticated user's availability row for the "Players Wanting to
-- Play" discovery feature. Insert/update/delete remain self-scoped.
--
-- RLS AUDIT (July 2026, Priority 3 item #6): "anon_all" and three more
-- untracked PERMISSIVE policies — "Allow public inserts", "Allow public
-- reads", "Allow public updates" (all role anon, true) — found live and
-- dropped. Code trace (3 call sites) confirmed no anon dependency.

alter table player_availability enable row level security;

drop policy if exists anon_all on player_availability;
drop policy if exists "Allow public inserts" on player_availability;
drop policy if exists "Allow public reads" on player_availability;
drop policy if exists "Allow public updates" on player_availability;
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

-- ─────────────────────────────────────────────────────────────────────────────
-- beta_applications — applications submitted via join.html gated beta flow.
-- Written by /api/beta-application using SUPABASE_SERVICE_KEY.
-- status: 'pending' = yes beta tester (awaiting review); 'waitlist' = no beta tester.
-- Run this block in Supabase SQL Editor before deploying join.html.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists beta_applications (
  id               uuid        primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  email            text        not null,
  first_name       text        not null,
  city             text        not null,
  state            text        not null,
  heard_from       text        not null,
  skill_level      text,
  playing_since    text,
  age_range        text,
  wants_beta       boolean     not null default false,
  wants_video_call boolean,
  calendly_shown   boolean     not null default false,
  status           text        not null default 'pending'
    check (status in ('pending','approved','rejected','waitlist')),
  notes            text,
  constraint beta_applications_email_unique unique (email)
);

alter table beta_applications enable row level security;

-- No public policies — service role key bypasses RLS for all writes.
