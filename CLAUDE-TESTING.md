# CLAUDE-TESTING.md — Testing session log & utilities

## Player wipe script (reusable)

Use this to fully remove a test account and all associated data before
re-testing registration from scratch. Covers every table in the schema
that can reference a player by email — built and verified live
(Aug 2 2026 session) against 19 tables including untracked ones
(sms_log, sms_consent_log, organic_signups, action_tokens) that don't
appear in supabase_rls_policies.sql.

CAUTION before running against a non-test email: this checks for
shared-resource collateral damage (courts added by this user that
others may reference, matches organized by this user that other real
people RSVP'd to) — always run the pre-checks below first for any
account that might have real interactions, not just confirmed test
accounts.

### Pre-checks (run first for any account with real activity)

```sql
SELECT id, name, added_by_player FROM courts WHERE added_by_player = 'EMAIL_HERE';

SELECT m.id, m.match_date, m.status,
  (SELECT count(*) FROM match_responses mr WHERE mr.match_id = m.id AND mr.player_email <> 'EMAIL_HERE') AS other_responses,
  (SELECT count(*) FROM match_results res WHERE res.match_id = m.id) AS results_count
FROM matches m
WHERE m.organizer_email = 'EMAIL_HERE';
```

If either returns non-test data belonging to other real people, stop
and handle those rows manually (reassign/null rather than delete)
before running the wipe below.

### Single-account wipe

```sql
DO $$
DECLARE
  target_email text := 'EMAIL_HERE';  -- change this line only
BEGIN
  DELETE FROM sms_log WHERE player_email = target_email;
  DELETE FROM sms_consent_log WHERE player_email = target_email;
  DELETE FROM organic_signups WHERE email = target_email;
  DELETE FROM player_feedback WHERE reviewer_email = target_email OR reviewed_email = target_email;
  DELETE FROM player_availability WHERE player_email = target_email;
  DELETE FROM player_courts WHERE player_email = target_email;
  DELETE FROM connections WHERE requester_email = target_email OR recipient_email = target_email;
  DELETE FROM invites WHERE inviter_email = target_email OR invitee_email = target_email;
  DELETE FROM player_group_members WHERE player_email = target_email;
  DELETE FROM match_results WHERE team_a_player1_email = target_email OR team_a_player2_email = target_email
    OR team_b_player1_email = target_email OR team_b_player2_email = target_email OR recorded_by = target_email;
  DELETE FROM match_responses WHERE player_email = target_email;
  DELETE FROM matches WHERE organizer_email = target_email;
  DELETE FROM player_groups WHERE organizer_email = target_email;
  DELETE FROM recurring_matches WHERE organizer_email = target_email;
  DELETE FROM beta_feedback WHERE player_email = target_email;
  DELETE FROM beta_applications WHERE email = target_email;
  DELETE FROM waitlist WHERE email = target_email;
  DELETE FROM action_tokens WHERE payload->>'organizerEmail' = target_email OR payload->>'playerEmail' = target_email;
  DELETE FROM registrations WHERE email = target_email;  -- parent record, always last
END $$;
```

### Batch wipe (multiple accounts)

```sql
DO $$
DECLARE
  target_emails text[] := ARRAY['email1@example.com','email2@example.com'];  -- edit this line
BEGIN
  DELETE FROM sms_log WHERE player_email = ANY(target_emails);
  DELETE FROM sms_consent_log WHERE player_email = ANY(target_emails);
  DELETE FROM organic_signups WHERE email = ANY(target_emails);
  DELETE FROM player_feedback WHERE reviewer_email = ANY(target_emails) OR reviewed_email = ANY(target_emails);
  DELETE FROM player_availability WHERE player_email = ANY(target_emails);
  DELETE FROM player_courts WHERE player_email = ANY(target_emails);
  DELETE FROM connections WHERE requester_email = ANY(target_emails) OR recipient_email = ANY(target_emails);
  DELETE FROM invites WHERE inviter_email = ANY(target_emails) OR invitee_email = ANY(target_emails);
  DELETE FROM player_group_members WHERE player_email = ANY(target_emails);
  DELETE FROM match_results WHERE team_a_player1_email = ANY(target_emails) OR team_a_player2_email = ANY(target_emails)
    OR team_b_player1_email = ANY(target_emails) OR team_b_player2_email = ANY(target_emails) OR recorded_by = ANY(target_emails);
  DELETE FROM match_responses WHERE player_email = ANY(target_emails);
  DELETE FROM matches WHERE organizer_email = ANY(target_emails);
  DELETE FROM player_groups WHERE organizer_email = ANY(target_emails);
  DELETE FROM recurring_matches WHERE organizer_email = ANY(target_emails);
  DELETE FROM beta_feedback WHERE player_email = ANY(target_emails);
  DELETE FROM beta_applications WHERE email = ANY(target_emails);
  DELETE FROM waitlist WHERE email = ANY(target_emails);
  DELETE FROM action_tokens WHERE payload->>'organizerEmail' = ANY(target_emails) OR payload->>'playerEmail' = ANY(target_emails);
  DELETE FROM registrations WHERE email = ANY(target_emails);
END $$;
```

### Verification (run after any wipe — replace the email list, expect all zeros)

```sql
SELECT 'sms_log' t, count(*) FROM sms_log WHERE player_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'sms_consent_log', count(*) FROM sms_consent_log WHERE player_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'organic_signups', count(*) FROM organic_signups WHERE email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'player_feedback', count(*) FROM player_feedback WHERE reviewer_email = ANY(ARRAY['EMAIL_HERE']) OR reviewed_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'player_availability', count(*) FROM player_availability WHERE player_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'player_courts', count(*) FROM player_courts WHERE player_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'connections', count(*) FROM connections WHERE requester_email = ANY(ARRAY['EMAIL_HERE']) OR recipient_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'invites', count(*) FROM invites WHERE inviter_email = ANY(ARRAY['EMAIL_HERE']) OR invitee_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'player_group_members', count(*) FROM player_group_members WHERE player_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'match_results', count(*) FROM match_results WHERE team_a_player1_email = ANY(ARRAY['EMAIL_HERE']) OR team_a_player2_email = ANY(ARRAY['EMAIL_HERE']) OR team_b_player1_email = ANY(ARRAY['EMAIL_HERE']) OR team_b_player2_email = ANY(ARRAY['EMAIL_HERE']) OR recorded_by = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'match_responses', count(*) FROM match_responses WHERE player_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'matches', count(*) FROM matches WHERE organizer_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'player_groups', count(*) FROM player_groups WHERE organizer_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'recurring_matches', count(*) FROM recurring_matches WHERE organizer_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'beta_feedback', count(*) FROM beta_feedback WHERE player_email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'beta_applications', count(*) FROM beta_applications WHERE email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'waitlist', count(*) FROM waitlist WHERE email = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'action_tokens', count(*) FROM action_tokens WHERE payload->>'organizerEmail' = ANY(ARRAY['EMAIL_HERE']) OR payload->>'playerEmail' = ANY(ARRAY['EMAIL_HERE'])
UNION ALL SELECT 'registrations', count(*) FROM registrations WHERE email = ANY(ARRAY['EMAIL_HERE']);
```

## Wipe log

- Aug 2 2026: david@dealdonebb.com wiped and verified (0 rows, all 19 tables).
- Aug 2 2026: david@prosperci.com, rippleofhope777@gmail.com,
  decelectron@gmail.com, sweetpeaven@gmail.com, lindsybbmm@yahoo.com
  wiped and verified (0 rows, all 19 tables) — confirmed by user as
  test-only accounts, no real match activity.

## Registration flow — bugs found (Aug 2 2026 testing session)

Found while tracing what a new user sees after registering via an
email invite (real-world trigger: Artie Brennan's test registration).
Full trace done by CC against live app.js — see conversation for line
numbers if needed again.

### Bug 1 — Quick Connect: two uncoordinated post-registration flows

`_qcSave()` (app.js ~12249-12330) calls `restoreSession()`, which
unconditionally navigates to Dashboard on its own
(`showPage('dashboard')`), then immediately calls
`handlePostRegistrationInvite()`, which creates an "accept invite"
overlay. `showFoundingMemberOverlay()` then renders on top and visually
hides the invite-accept overlay (it isn't removed, just covered).
When the founding-member overlay is dismissed, the user gets
auto-navigated to Inner Circle > Requests, and the hidden invite-accept
overlay reappears on top of that page. Net effect: unexpected page
navigation, one modal silently swallowed by another, and a prompt
reappearing after the user thought they were done.

Full Profile's `doSaveProfile()` does NOT have this problem — it
deliberately sequences each overlay behind the previous one's dismissal
(2.5s delay before creating the invite-accept overlay). Quick Connect's
fix should follow the same sequencing pattern.

Status: not fixed, not scheduled. Fix scope: gate
`handlePostRegistrationInvite()`'s overlay creation behind
`restoreSession()` + `showFoundingMemberOverlay()` fully completing,
same as the Full Profile path, instead of firing all three
independently.

### Bug 2 — Full Profile: failed save still shows success

`doSaveProfile()` (app.js ~1037-1303): the try/catch around
`saveRegistration()` only shows a toast on failure — there is no
`return` statement, so execution falls through unconditionally into the
full "You're In!" success sequence (confirmation card, founding-member
modal, IC-invite flow) even if the registration row was never actually
written. A real save failure and a real success currently look
identical to the user.

Status: not fixed, not scheduled. Fix scope: add a `return` in the
catch block immediately after the toast, so a failed save stops
execution before any success UI fires. Low risk, high value — protects
data integrity for active testers.

## Full Profile flow (confirmed working / reference sequence)

Verified coherent by trace, Aug 2 2026 — this is the "good" path,
useful as a reference for fixing Quick Connect's sequencing:

1. Tap email invite link -> invite.html loading -> invite card.
2. Enter email -> "Send My Magic Link" -> "Check your email!"
3. Tap magic link -> brief "Setting up your account..." on app.html.
4. Full Profile / Quick Connect choice screen.
5. Tap Full Profile -> registration form (multi-step).
6. Fill out form, tap Complete Registration.
7. "You're In!" confirmation card.
8. Founding-member modal ("You're one of X players...") -> dismiss.
9. (2.5s later) "You're in, [Name]! Join their Inner Circle?" -> Yes/Maybe Later.
10. If Yes: "Add [Inviter] to YOUR Inner Circle?" -> Yes/Maybe Later.
11. Dashboard — stable, one thing on screen at a time.
