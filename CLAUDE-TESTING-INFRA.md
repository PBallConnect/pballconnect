# Testing Infrastructure Recommendations — PBallConnect

*Written Aug 7 2026, based on a full-day live testing session that surfaced Bugs 3, 7, 14, and 15. Purpose: capture what made testing slow today, so this can be revisited and built out when there's time to invest in it.*

## The problem

Today's testing process, repeated for every new test case, looked like this:

1. Pick a new email alias (`overlay4`, `overlay5`, ...) to guarantee a genuinely unused identity.
2. Open a fresh incognito window, to avoid leftover session/cookie interference from a prior test.
3. Send an invite email from the "inviter" test account.
4. Switch to Gmail, find the email, click through.
5. Enter the email again on the invite page.
6. Switch back to Gmail, wait for and click the magic link.
7. Fill out a multi-step registration form by hand.
8. Watch for several overlays in sequence — some appear and auto-advance fast enough that they had to be screen-recorded rather than screenshotted.
9. Separately, open the Supabase SQL editor and hand-write a query to check what actually happened in the database — because the UI alone could not be trusted (see Bug 15: the UI reported success while the database still showed `pending`).

That's roughly 5–10 minutes of careful manual work per test case, and it's fragile: a stray leftover browser tab, a stale cached session, or a mistyped alias invalidated an entire test run more than once today.

## Why this matters

Several real, production-affecting bugs (14, 15, the depth of 7) were only found *because* testing was this thorough — clean sessions, real database checks, not just trusting the UI. The rigor was the right call. But the same rigor, done by hand every time, doesn't scale — and it's exactly the kind of overhead that eats hours without directly producing bug fixes.

## Recommended tooling (roughly in order of impact)

### 1. Seed/reset script
One command (e.g. `npm run test:reset`) that wipes all test accounts and their related rows (`connections`, `invites`, etc.) in one shot — instead of manually hunting down and cleaning up stuck `pending` rows one at a time (as happened today with DEC-1 through DEC-9).

### 2. Test-user factory
A script or admin-only endpoint that creates a fully-registered test user directly via the database/API — skipping the email round-trip, magic link, and multi-step form entirely, since most tests aren't actually testing the registration form itself. Something like:

```
create-test-user.js --email=test1 --with-pending-invite-from=david
```

This alone would have turned most of today's 5–10 minute setup sequences into a few seconds.

### 3. "Log in as" / impersonation tool (dev-only)
A way to instantly authenticate as any test user, bypassing the magic-link email round-trip — a standard pattern in dev/staging environments, always disabled in production. Removes the Gmail-tab-switching step entirely.

### 4. Automated assertions instead of manual screenshot verification
A script that does the equivalent of: *register user → accept invite → query the database → assert the row is `approved`* — runs in seconds, isn't affected by how fast an overlay flashes on screen, and can be re-run after every future code change to catch a regression immediately instead of discovering it live, weeks later, during another manual session like today's.

### 5. Dedicated staging environment
Separate from whatever environment is used for anything resembling real/demo usage, so test data doesn't accumulate in the same tables real users (or demos) will eventually touch.

## Honest cost/benefit

Building items 1–2 (seed script + test-user factory) is plausibly **10–20 hours** of work. Today alone likely lost **1–2 hours** to session/cache fighting and manual setup overhead. That pays for itself within a handful of sessions like today — and every future testing session (which, given today's bug count, will happen often) gets faster and more reliable from then on.

## Suggested next step

Revisit this before the next major testing push — ideally build at minimum the seed/reset script and test-user factory (items 1–2) before doing the planned RLS/encoding audit and completeness testing pass on Match Setup, Waitlist, Groups, and Subs. Those upcoming tests will otherwise hit the exact same manual overhead documented here, at larger scale.
