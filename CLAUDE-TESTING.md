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
- Aug 5 2026: david@prosperci.com, rippleofhope777@gmail.com,
  david@dealdonebb.com — re-registered after the Aug 2 wipe (for further
  testing), wiped again and verified (0 rows, all 19 tables).

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

### Bug 3 — Invite overlays: unreadable body text (contrast)

Both #inviteAcceptOverlay and #inviteReciprocateOverlay (app.js
~12712-12782, built in handlePostRegistrationInvite()) hardcode a
near-black card background (#0f1f12) but reuse the app's single global
--dim gray (#6b7280, defined styles.css:14-17) for description text, and
rgba(255,255,255,0.4) for a secondary line — both designed/used
elsewhere for gray-text-on-white-card contexts (e.g. .header p,
.confirm-email), not dark cards. Titles (color:#fff) read fine; body
text is very low contrast against the dark background.

Status: not fixed, not scheduled. Fix scope: replace the description
text colors on these two overlays specifically with light colors
appropriate for a dark card — do not change the global --dim variable,
which is correctly used elsewhere on light backgrounds.

### Bug 4 — Page renders wider than viewport on real iOS (pinch-to-zoom needed)

Confirmed NOT a missing viewport meta tag (app.html:5 has a correct
one). Confirmed: no overflow-x restriction exists anywhere on html/body
(styles.css:262-263) — the only overflow-x usage in the codebase is
scoped to a schedule table's own scroll container (styles.css:168), not
a page-level safety net. Strongest candidate found: .left-nav
(styles.css:267-268, mobile override 303-306) is position:fixed with
transform:translateX(-240px) when closed — a known iOS Safari trigger
for the layout viewport being computed wider than the visual viewport.
Not confirmed with certainty from static code alone — would need live
Safari remote inspector or a temporary `* { outline: 1px solid red }`
pass to fully confirm .left-nav is the actual offending element.

Status: not fixed, not scheduled. Fix scope (two parts): (1) add a
global overflow-x:hidden safety net on html/body — cheap, fixes the
symptom regardless of root cause; (2) separately investigate/fix
.left-nav's fixed+transform pattern as the likely actual source.

### Bug 5 — Founding-member/confirmation flash is a bare, purposeless 2.5s timer

doSaveProfile() (app.js:1289-1303): after showFoundingMemberOverlay()'s
user-triggered dismiss (tapping "Let's Play! ->"), a bare
setTimeout(...,2500) runs before confirmOverlay ("You're In! Welcome to
the directory") is hidden and the next step happens. During those 2.5
seconds, confirmOverlay sits alone on screen with nothing else
happening — no async work, no animation, no button. Additionally:
showFoundingMemberOverlay() (app.js:12354) skips itself entirely if
localStorage has pb_founding_seen set (true after a device's first test
registration) — on repeat test registrations on the same phone, the
founding modal never appears at all, and the 2.5s bare-confirmOverlay
state begins immediately after tapping "Complete Registration."

Status: FIXED — commit aae6847. Redesigned rather than just shortened:
- Timer extended 2500ms -> 7000ms (a real, readable beat rather than a
  bare pause).
- Countdown start decoupled from showFoundingMemberOverlay()'s dismiss
  callback timing — now gated behind a double requestAnimationFrame so
  it only begins once confirmOverlay has actually painted, closing the
  same-tick-skip gap described above (pb_founding_seen already set ->
  onDismiss() firing synchronously with no guaranteed paint first).
- New startConfirmCountdown() (app.js:1318-1335): confirmNote now
  ticks "Taking you to your dashboard in 7…" down to "…in 1…" once
  per second, so the wait is visibly counting down instead of static.
- At 3 seconds remaining, the "Go to Dashboard" button (only the
  button, not the rest of the card) gets a green ring-pulse
  (.confirm-btn-pulse, styles.css) signaling auto-advance is imminent.

CORRECTION (found while building a visual mockup of #confirmOverlay):
this card includes a live, visible "Go to Dashboard ->" button
(app.html:2308-2309) throughout the wait — the original write-up above
was wrong to describe this window as buttonless. Tapping that button
during the wait creates a separate race condition — see Bug 8. This
was true of the original 2.5s design; SUPERSEDED by the aae6847 fix
above — window._completeRegistrationTransition() (ba02602's idempotent,
clearTimeout-guarded single entry point) is unchanged in shape and
still the only way either the button or the timer can complete the
transition, now also clearing the new countdown interval on whichever
path wins first. No open race between the button and the timer.

### Bug 6 — Dashboard can render scrolled/cut off after registration or reload

Two independent, stacking causes found:
(1) showPage()'s window.scrollTo(0,0) (intended as instant, per its own
comment "always open pages at the top") is not actually instant —
scroll-behavior:smooth is set globally (styles.css:262, also
index.html:36), so the 2-arg scrollTo form defers to that smooth
animation, which can still be resolving while loadDashboard()'s four
async tile loaders are still populating content.
(2) history.scrollRestoration is never set anywhere in the codebase
(confirmed via repo-wide grep) — browsers default this to "auto,"
meaning a real page reload tries to restore the previous scroll
position for that URL, competing with showPage()'s reset before
dashboard content has repopulated.
.top-header's position:sticky was checked and is not implicated — no
evidence of a height-miscalculation there.

Status: not fixed, not scheduled. Fix scope: force an instant (non-
smooth) scroll specifically for showPage()'s reset, and explicitly set
history.scrollRestoration = 'manual' once, early in app init.

### Bug 7 — Dashboard IC counts never update without a full reload; refresh icon is a no-op for dashboard

Two separate, real bugs:
(1) refreshCurrentPage() (app.js:1898-1919)'s loaders map has no
`dashboard` entry — tapping the refresh icon on the dashboard spins the
icon, waits 500ms, then falls through to the else branch and shows a
fake "Refreshed" success toast while re-fetching nothing.
(2) The three IC dashboard tiles (dashIcMemberCount, dashIcSentCount,
dashIcIncomingCount, app.html:348/356/364) are only ever written by
loadInnerCircle() and its helpers — never by loadDashboard() or its four
tile loaders (loadDashTileCounts, loadDashNextMatch,
loadDashPendingInvites, loadDashInvitedToPlay). loadInnerCircle() only
runs once at login (600ms after restoreSession()) or when the user
navigates to the Inner Circle page directly. Accepting a reciprocal
invite (handlePostRegistrationInvite()'s showStep2/finalize, already
traced) does the connections PATCH/POST then only calls
showPage('dashboard') — it never updates IC_INCOMING_COUNT, IC_MEMBERS,
or any dashIc* element, and showPage('dashboard') doesn't trigger
loadInnerCircle() either. Net effect: dashboard IC tiles are populated
once at login and never refreshed by anything short of a full page
reload.

Status: not fixed, not scheduled. Fix scope: (1) add a dashboard entry
to refreshCurrentPage()'s loaders map that actually re-fetches dashboard
+ IC tile data; (2) have the reciprocal-invite acceptance flow refresh
the relevant IC counts (or just re-call loadInnerCircle()) after its
PATCH/POST succeeds, instead of relying on a full reload.

Scope confirmed to cover BOTH directions of staleness, not just the
"my own action didn't refresh my counts" case above — live-tested and
traced Aug 5 2026 via a real IC accept between two test accounts
(Ripply and David). After David accepted Ripply's reciprocal IC request
on David's own Inner Circle page, David's own dashboard/IC page updated
immediately and correctly, but Ripply's dashboard still showed "My IC: 0"
until she did a full reload. Root cause confirmed identical: dashIcMemberCount
is only ever written by updateNavCircleBadges(), which is only called from
inside loadInnerCircle()'s own flow — populated once at login (600ms after
restoreSession()) or on manual navigation to the Inner Circle page, never
on a timer/poll/push. Since Ripply's session has no live-update mechanism
at all, this is true regardless of whose action changed the underlying
connections data — her own or someone else's.

### Bug 8 — "Go to Dashboard" button races against the pending invite-accept overlay

doSaveProfile()'s setTimeout(...,2500) (app.js:1294-1301) is fired-and-
forgotten — its ID is never captured into a variable, and a repo-wide
grep for clearTimeout (3 hits, all unrelated: geocoding abort, zip-code
debounce, IC search debounce) confirms nothing ever cancels it.
#confirmOverlay's "Go to Dashboard ->" button (app.html:2308-2309) is
fully visible and tappable for the entire 2.5s window (the founding-
member overlay is REMOVED from the DOM on dismiss, not hidden, so
nothing covers it) and its onclick runs showPage('dashboard')
immediately, independent of the pending timer.

If a user taps this button during the wait: the timer still fires 2.5s
after the founding overlay was dismissed, regardless of where the user
has since navigated. PENDING_INVITE is still set at that point (only
nulled inside handlePostRegistrationInvite() itself, which hasn't run
yet), so the if(PENDING_INVITE) branch calls
handlePostRegistrationInvite(newEmail, newName) unconditionally --
appending the "You're in, Name! ... Join their Inner Circle?" overlay
directly to document.body with no check on what page is currently
active. Net effect: the user taps through to Dashboard, starts looking
at real content, and ~2.5s later an unexplained invite-accept prompt
appears on top of it with no visible cause.

Status: not fixed, not scheduled. Same root class as Bug 1 (an overlay
appearing on a page the user already navigated away from) but a
distinct cause -- an uncancelled timer racing a manual escape hatch,
not an automatic stacking order. Fix scope: capture the setTimeout's ID
and clearTimeout() it if the user taps "Go to Dashboard" early
(preferred -- lets the user skip the wait AND still get the invite
prompt immediately instead of losing it or having it ambush them later),
or alternatively disable/hide the button during the wait so it can't be
tapped until the timer's own logic has run.

### Bug 9 — HIGH PRIORITY — in-app match confirmation structurally broken by RLS read-scoping

checkAndUpdateMatchStatus() (app.js:8228-8254) and respondToMatch()'s
own pre-check (app.js:8089-8093) both query match_responses under the
responding participant's own session token. The live match_responses
SELECT policy ("Users can read relevant match responses") is scoped to
auth.email() = player_email OR the caller organizes the match — so a
non-organizer participant's read of response='in' rows for a match can
only ever return THEIR OWN row, never the organizer's or any other
participant's row, even though those rows exist and are correct.

This has exactly one call site in the entire app (app.js:8191, inside
respondToMatch()'s 'in' branch), and that call site is structurally
reachable ONLY by non-organizers: the organizer's own row is inserted
directly as 'in' at match creation (never 'pending'), so the organizer
never has an Accept button to tap for their own match and therefore
never triggers this check. This is not an edge case -- it's the only
way this check ever runs, for every match confirmed via the in-app
Accept flow.

Confirmed via a real test match (Aug 4 2026, organizer Tyler
Brenneman, participant David DiPerri, Singles, max_players=2): both
players had correct 'in' rows in match_responses, but status remained
'open' after David accepted in-app -- David's own RLS-scoped read
undercounted the roster to 1, never reaching needed=2.

The SMS tap-to-respond path (functions/api/match-invite-respond.js:
83-99) implements the identical check correctly, because it runs under
SUPABASE_SERVICE_KEY (service role), which bypasses RLS entirely --
explaining why earlier testing that went through SMS links appeared to
work fine while the in-app button was silently broken the whole time.

Status: not fixed, actively being designed. Fix direction chosen (Aug
4 2026, user decision): move the roster-fill check server-side (new
service-role Cloudflare Function, mirroring match-invite-respond.js's
already-correct logic) rather than broadening the match_responses
SELECT policy -- preserves participant privacy (an invitee shouldn't
necessarily see who else is in/pending before accepting, which was an
intentional design consideration, not an oversight).

FINALIZED FIX DESIGN (Aug 4 2026, all decisions resolved):

One new Cloudflare Function, /api/check-match-status (POST, JSON body
{matchId}, Authorization: Bearer header), following match-view-token.js's
exact Path-A pattern: confirm the match exists via service role,
verifyCaller() for real caller identity, authorize as organizer OR
existing match_responses row (same check as match-view-token.js),
then run the roster-count/status-flip logic under service-role headers
(bypasses RLS, sees every response row regardless of caller).

Reused in THREE places, not just the one that surfaced the bug:
1. respondToMatch()'s pre-check (currently the undercounted read at
   app.js:8089-8093) -- fixes the pre-check AND the decline-branch/
   waitlist-promotion under-trigger for free, since both currently
   reuse that same undercounted variable downstream.
2. respondToMatch()'s post-accept check (replaces the
   checkAndUpdateMatchStatus() call at app.js:8191) -- the original
   bug's main fix.
3. loadMyInvitesPage() (organizer's pending-matches view) -- a new
   background reconciliation call per pending match. Since the
   organizer's own session CAN see the full roster correctly (no RLS
   blind spot for them), this makes the fix self-healing: if a match
   is secretly already full due to any future/edge-case failure, it
   corrects itself the next time the organizer views their match list,
   with no bug report needed.

checkAndUpdateMatchStatus() (the old client-side function) will be
REMOVED entirely once all call sites are migrated -- its job is fully
absorbed into the new shared endpoint, not left as dead code.

Decisions made:
- New endpoint logs failures server-side (console.error, visible in
  Cloudflare Function logs) rather than failing completely silently
  like the original -- deliberate deviation from the original's silent
  catch(e){}, so a future failure leaves a trace instead of being
  invisible again.
- respondToMatch()'s pre-check and the decline-branch/waitlist-
  promotion under-count are explicitly IN SCOPE for this fix pass, not
  deferred -- see item 1 above.

Known follow-up, NOT part of this fix: Tyler/David's specific existing
test match (match_id f6574a23-b777-4ba2-bd0a-7372b51dd9f5) is stuck in
its broken state in the database -- the fix only prevents this going
forward, it doesn't retroactively correct already-affected matches.
Needs a manual one-off correction (or triggering the new endpoint
against that specific match_id) once the fix is live, plus a direct
follow-up with Tyler once it's actually confirmed working.

STATUS: ALL FIVE ITEMS RESOLVED. (1-3) SHIPPED (commit 58c7c40, Aug 4
2026) — the new /api/check-match-status Function, the three app.js
call-site changes (respondToMatch()'s pre-check and post-accept check,
loadMyInvitesPage()'s background reconciliation), and removal of the
old checkAndUpdateMatchStatus() function. (4) the one-off correction
for Tyler/David's stuck match (match_id
f6574a23-b777-4ba2-bd0a-7372b51dd9f5) — CLOSED, MOOT, not done (see
note below, no data fix applied). (5) live verification with a real
second match — FULLY VERIFIED, both branches, see note below.

Live verification (5) — FULLY VERIFIED, Aug 5/6 2026. Both branches of
the fix now exercised live:
- Waitlist-routing branch — VERIFIED LIVE: Ripply
  (rippleofhope777@gmail.com) tapped Accept on David's already-full
  (2/2) singles match. Despite the invitee-facing card still showing
  stale "0 IN / 2 NEEDED" (Bug 11, known/logged, unrelated call site),
  the actual write correctly triggered handleMatchFullRace() -> "Spot
  Already Taken — Join Waitlist / No thanks." No false "you're in" was
  shown on a full match, even with the surrounding display stale.
- Fill-to-Confirmed branch (the original Bug 9 symptom — a match
  filling to capacity via the in-app Accept button and flipping
  matches.status from 'open' to 'full', the wasJustFilled path in
  checkMatchStatusServer()) — VERIFIED LIVE: dippa777@gmail.com tapped
  Accept on Deally's (david@dealdonebb.com) new Owl's Nest Resort
  singles match, the last open spot. Confirmed directly via a live
  Supabase query (not inferred): matches.status = 'full' for the match
  (id 74e9d7bd-6c4a-4a68-8a16-f97098329d39), and both match_responses
  rows are 'in' — Deally as organizer, dippa777 with a real
  responded_at timestamp from his Accept tap. The in-app Accept button
  genuinely flips status and fills the roster, closing the original
  Bug 9 symptom for good.

A separate display bug was found while verifying this branch — see
Bug 13 below. It does not affect this verification: the underlying
write and status flip are confirmed correct at the database level,
independent of what any client page displays afterward.

Item (4) — the Tyler/David stuck-match one-off correction — CLOSED,
MOOT, Aug 5/6 2026. Confirmed via direct query: match
f6574a23-b777-4ba2-bd0a-7372b51dd9f5 has match_date=2026-08-04 (now in
the past) and status='open' despite both match_responses rows (David
DiPerri, Tyler Brenneman) showing response='in' — the original Bug 9
symptom, preserved unchanged in this one record. Since the match date
has passed, it is filtered out of every active match view
(Confirmed/Pending/Waitlist all exclude past matches) regardless of
its status value — no one will ever see this record in normal use, so
a status correction has no functional benefit. Closed without a data
fix.

All five items of Bug 9's checklist are now resolved: (1-3) shipped
and verified live, (4) moot/closed, (5) fully verified. No further
action needed on Bug 9.

### Bug 10 — Lingering ?invite=TOKEN / ?newuser=1 in URL bar after registration completes (cosmetic)

New registrants retain the original magic-link query string
(?invite=TOKEN&newuser=1) in the URL bar indefinitely after completing
registration and landing on their dashboard. Confirmed inert — traced
Aug 5 2026 during the Bug 7 investigation above, doesn't affect any
dashboard/IC data-fetch logic. checkInviteToken() and checkMatchToken()
(app.js:11892, 7895) are the only functions that read these params,
both wired to one-shot document.addEventListener('DOMContentLoaded')
setTimeouts (app.js:12861-12864, 8961-8964) — they never re-run on SPA
navigation, and their only side effects are gated behind
if(!SESSION_PLAYER?.id).

Root cause: restoreSession()'s existing URL-cleanup code
(app.js:9285-9292, history.replaceState(null,'',window.location.pathname))
only runs inside its if(player) branch — i.e. only for an EXISTING
registration row. A brand-new registrant hits the !player branch
instead, which calls startNewRegistration(email) and never strips the
URL.

Same class of issue as Known Bug #21 (CLAUDE.md) — a lingering
auth-flow artifact left in the URL bar, not a functional bug.

Status: not fixed, not scheduled, low priority. Likely fix: add the
same history.replaceState(null,'',window.location.pathname) call
somewhere in the post-registration completion path (e.g. end of
startNewRegistration() or handlePostRegistrationInvite()).

### Bug 11 — loadInvitedByOthersPage()'s IN/PENDING/WAITLIST/OUT/NEEDED card undercounts (same RLS cause as Bug 9, unmigrated call site)

loadInvitedByOthersPage() (app.js:6141, the "Pending Matches" page /
page-invitedByOthers) fetches roster counts for its IN/PENDING/WAITLIST/
OUT/NEEDED pills via a direct client-side match_responses query
(app.js:6205-6207), under the viewing invitee's own RLS-scoped session
token — the exact same "Users can read relevant match responses" policy
(auth.email() = player_email OR caller organizes the match) that caused
Bug 9. A not-yet-responded invitee's own row is the only one that
policy lets them see, so the card's IN/remaining counts are undercounted
for every match on the page whenever other participants have already
accepted.

Confirmed live Aug 5/6 2026: a real match (organizer David DiPerri,
singles, needs 2) already showed 2/2 CONFIRMED on the organizer's
dashboard (David + a second account "zorro"), but the invited,
not-yet-responded participant (rippleofhope777@gmail.com) still saw
"0 IN / 1 PENDING / 2 NEEDED" on this exact card.

This is the fourth call site reading match_responses under a
non-organizer's RLS-scoped session for a roster-fill purpose — Bug 9's
migration (commit 58c7c40) only covered three: respondToMatch()'s
pre-check, respondToMatch()'s post-accept check, and
loadMyInvitesPage()'s background reconciliation.
loadInvitedByOthersPage() was not one of them.

Confirmed NOT a safety issue — traced precisely, not inferred.
respondToMatch() (app.js:8104) never reuses this card's stale numbers;
it independently re-checks via checkMatchStatusServer() (the same
service-role /api/check-match-status endpoint Bug 9 introduced) at the
moment Accept is tapped. With a real confirmedCount/needed of 2/2, that
check correctly routes the tap through handleMatchFullRace() to the
waitlist, not a fabricated "you're in." This is purely a misleading-
display bug — the card can show stale numbers, but the write path is
already correct.

Reproduced independently Aug 5/6 2026 with a different organizer/invitee
pair, confirming this is a consistent, reproducible pattern, not a
one-off. Deally (david@dealdonebb.com) created a new singles match and
invited dippa777@gmail.com. Deally's own "My Match Invites" organizer
view correctly shows 1 IN / 1 PENDING / 1 NEEDED (David DiPerri
pending). But dippa777's "Pending Matches" invitee view of the SAME
match shows 0 IN / 1 PENDING / 2 NEEDED — the organizer's own 'in' row
is invisible to the invitee's RLS-scoped session, same mechanism as the
original finding above.

Status: not fixed, not scheduled. Fix: migrate
loadInvitedByOthersPage()'s roster count to the same
/api/check-match-status endpoint, same pattern as the other three call
sites.

### Bug 12 — loadInvitedByOthersPage()'s card never re-renders after a response via the full-match/waitlist race path

Distinct from Bug 11 though the two compound on the same screen.
loadInvitedByOthersPage()'s card never re-renders or re-fetches after a
response is submitted via the full-match/waitlist race path
(handleMatchFullRace()). Root cause, traced precisely Aug 5/6 2026:

1. The pending/in/waitlist/out pill counts and roster-name lists are
   computed once at initial card render (app.js:6259-6265) from the
   allInResps fetch captured in a closure — never re-fetched on
   expand/collapse or after any response.
2. respondToMatch()'s only refresh trigger (app.js:8257-8259,
   loadInvitedByOthersPage() re-call) sits at the tail of the
   function's NORMAL path — but handleMatchFullRace()
   (app.js:8037-8087) returns directly from its own early-exit branch
   (line 8143), bypassing that refresh entirely.
3. The "You're on the waitlist" success banner is NOT data-driven —
   it's a hardcoded string swapped into the button row based purely on
   respondToMatch()'s return value (app.js:6542-6574). This is why the
   banner is correct (driven by the write's known outcome) while the
   pills/roster above it are stale (never re-fetched at all).

Confirmed via a separate live check: "My Waitlist" page independently
shows the correct state (Waitlist position #1, etc.) — proving the
underlying match_responses write is correct. This is purely a missed
re-render on one specific card, not a data problem.

Note: fixing this refresh gap does NOT fix Bug 11 — even with a fresh
re-fetch, the pill counts would still undercount other players'
responses due to the RLS scoping Bug 11 already documents. Both bugs
need fixing for this card to be fully correct.

Status: not fixed, not scheduled. Fix: add the same refresh call
handleMatchFullRace() is missing — either have it also trigger
loadInvitedByOthersPage() on the invitedByOthers page (mirroring
respondToMatch()'s existing pattern at 8257-8259), or move that
refresh logic so it runs regardless of which return path was taken.

### Bug 13 — loadConfirmedMatches()'s roster re-verification undercounts for non-organizer participants, can drop a genuinely-full match from their own Confirmed Matches page

Found while live-verifying Bug 9's fill-to-Confirmed branch (see Bug 9
STATUS above). A fifth RLS-undercount call site — same root mechanism
as Bug 9/Bug 11, distinct from Bug 12's stale-closure pattern.

loadConfirmedMatches() (app.js:4820) correctly unions organizer matches
AND matches where the viewer has a match_responses row with
response='in' (app.js:4827-4842) — it is NOT organizer-only in scope.
But it then re-verifies each match's roster with a second query, under
the viewer's own RLS-scoped session token:

  app.js:4853-4864 — fetches match_responses for all candidate match
  ids (response in ('in','waitlist')), then filters allMatches down to
  only those where `confirmed >= needed`, where confirmed is computed
  from that same RLS-scoped read.

The live match_responses SELECT policy ("Users can read relevant match
responses") only lets a caller see their OWN row for a match they
didn't organize. So for any match where the viewer is a participant
(not organizer), this re-verification read undercounts exactly like
Bug 9/Bug 11 — the viewer's own row is all they see, so `confirmed`
comes back as 1 even when the real count is 2. `confirmed >= needed`
then evaluates false, and the filter on app.js:4860 silently drops a
genuinely status='full' match from allMatches — it never renders on
the page at all, for the participant side only (the organizer's own
view of the same match is unaffected, since their RLS-scoped read of
a match they organize sees the full roster correctly).

Confirmed live Aug 5/6 2026: dippa777@gmail.com, a confirmed
participant (not organizer) on Deally's Owl's Nest match, does not see
that match on his own Confirmed Matches page at all, despite
matches.status='full' and both match_responses rows being 'in' —
verified directly via a live Supabase query (see Bug 9 STATUS above),
not inferred.

Also explains a related symptom: the confirmedMatchesBadge briefly
showed the correct count then reverted to a lower one. Two different
functions write this badge independently — loadAllMatchBadges()
(app.js:5675-5698) computes confirmedCount by trusting
matches.status='full' directly, with no roster re-verification step,
so it is not affected by this undercount. loadConfirmedMatches() then
overwrites the badge (app.js:4865, updateConfirmedBadge(allMatches.length))
with the undercount-filtered value once it runs — whichever of the two
resolves last wins, producing the observed flash from a correct count
down to a wrong one.

Status: not fixed, not scheduled. Fix: migrate the roster
re-verification step (app.js:4853-4864) to the same
/api/check-match-status service-role endpoint the Bug 9 fix
introduced, same pattern as the other call sites (or, since this loop
already has all candidate match ids in hand, a batched service-role
equivalent) rather than a client-side RLS-scoped match_responses read.

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
