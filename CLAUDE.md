# CLAUDE.md — PBallConnect Reference

_Last updated: July 3, 2026_

---

## Related Documentation
- [CLAUDE-RULES.md](CLAUDE-RULES.md) — all 57 numbered coding rules
- [CLAUDE-SCHEMA.md](CLAUDE-SCHEMA.md) — full database schema, architecture patterns, feature behavior specs, UI patterns
- [CLAUDE-SMS.md](CLAUDE-SMS.md) — SMS infrastructure and match invite SMS system architecture
- [CLAUDE-FLOWS.md](CLAUDE-FLOWS.md) — all user flow definitions, regression checklist
- [CLAUDE-ARCHIVE.md](CLAUDE-ARCHIVE.md) — resolved session learnings from May–June 2026, archived for historical reference

---

## Project Overview

**PBallConnect** — a pickleball player-matching PWA. Players register, find others nearby, manage an Inner Circle, set up matches, and respond to invites.

Deployed on **Cloudflare Pages** at `pballconnect.com`. No build step, no bundler, no npm. The app is a single-page vanilla JS app served as static files.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JS, HTML, CSS — no framework, no bundler |
| Hosting | Cloudflare Pages |
| Database + Auth | Supabase (PostgreSQL + REST API + magic link auth) |
| Transactional Email | Resend (via Cloudflare Pages Function) |
| Geocoding | Nominatim (OpenStreetMap) for zip-to-lat/lon |
| Maps | D3.js + TopoJSON for state/county selection |
| QR Codes | `qrcode` library (CDN) |
| PWA | Service worker + inline manifest |
| Bot Protection | Cloudflare Turnstile (on waitlist form) |
| Rate Limiting | Cloudflare KV (`RATE_LIMIT_KV` binding) — used by both Pages Functions |
| SMS | Twilio — outbound via `/api/send-sms.js`; STOP/HELP/START handled by `/api/twilio-webhook.js` |

---

## File Structure

| File | Size | Purpose |
|---|---|---|
| `app.js` | ~10,500 lines | Entire application: state, rendering, navigation, Supabase calls, feature logic |
| `index.html` | ~2,200 lines | Shell HTML — all `page-*` sections + CDN script tags |
| `styles.css` | — | All styles |
| `landing.html` | — | Public marketing landing page — standalone, no app.js/styles.css dependency. Hero, features, skill level guide, waitlist form with Turnstile bot protection. |
| `invite.html` | — | Standalone invite landing page — no app.js dependency |
| `join.html` | — | Gated beta application form — standalone, no app.js/styles.css dependency. Collects first name, email, city, state, skill level, playing since, age range, heard from, beta tester interest, video call interest. Submits to /api/beta-apply. Does NOT send magic link — applicant waits for founder approval. Waitlist path (wants_beta=false) uses existing waitlist flow. |
| `functions/api/send-email.js` | — | Cloudflare Pages Function for transactional email via Resend. IP rate-limited (5/hr) via `RATE_LIMIT_KV`. |
| `functions/api/send-sms.js` | — | Cloudflare Pages Function for SMS via Twilio. Consent-gated (`sms_opt_in` required), three-tier rate limited (player/match/global via KV), logs all attempts to `sms_log`. Always returns 200 — SMS errors never crash callers. No message length cap — Twilio handles multipart SMS automatically. |
| `functions/api/twilio-webhook.js` | — | Receives Twilio STOP/HELP/START keyword callbacks. Validates X-Twilio-Signature (HMAC-SHA1), syncs `sms_opt_in` in Supabase, logs to `sms_log`. |
| `functions/api/sms-register.js` | — | Handles SMS-invite registration: validates token, creates Supabase auth user (no email sent), saves registration row, auto-approves IC connection, returns sign-in URL. |
| `functions/api/match-invite-token.js` | — | Generates a signed HMAC-SHA256 token for match invites. Accepts `{ matchId, inviteePhone, inviteeName, organizerEmail }`, returns `{ token, signature, url }`. Uses `MATCH_INVITE_SECRET`. |
| `functions/api/match-invite-lookup.js` | — | Validates a match invite token + signature, checks expiry, returns invitee registration status and match details. Called by `match-invite.html` on load. |
| `functions/api/match-invite-respond.js` | — | Records a YES/NO response to a match invite via HMAC token. Upserts `match_responses`, updates `invites` row by `match_id` + `invitee_phone`. |
| `functions/api/match-invite-sms-data.js` | — | Server-side lookup of `phone` and `sms_opt_in` for a player by email using `SUPABASE_SERVICE_KEY`. Keeps sensitive fields off `public_profiles` and out of the client. |
| `functions/api/log-sms-consent.js` | — | POST endpoint for TCPA consent audit logging. Validates body, inserts to `sms_consent_log` via `SUPABASE_SERVICE_KEY`. Returns 200 always — callers must not block on consent log failures. |
| `match-invite.html` | — | Standalone mobile-first RSVP page for SMS match invites. Three states: (1) registered player — YES/NO buttons; (2) unregistered YES — mini registration form; (3) unregistered NO — warm decline + sign-up pitch. No app.js dependency. |
| `functions/api/organic-signup.js` | — | Cloudflare Pages Function for organic signup pre-screen data. GET returns stored row by email; POST upserts `organic_signups` table (email, skill_level, playing_since, age_range); DELETE removes row. Used to persist join.html pre-screen data server-side so it survives the magic link redirect. |
| `functions/api/waitlist.js` | — | Cloudflare Pages Function for waitlist form submissions. IP rate-limited (3/hr), Turnstile-verified, saves to `waitlist` table via service role key, sends confirmation email via Resend. |
| `functions/api/beta-apply.js` | — | Cloudflare Pages Function for beta applications. Validates fields, Turnstile-verified, IP rate-limited (3/hr), inserts to beta_applications via SUPABASE_SERVICE_KEY, sends admin notification emails to zorro@pballconnect.com and dippa777@gmail.com, attempts SMS to FOUNDER_PHONE. Always returns { ok: true } after validation. |
| `supabase_rls_policies.sql` | — | RLS policy definitions + waitlist table DDL — run in Supabase SQL editor after schema changes |
| `manifest.json` | — | PWA manifest (also injected inline at runtime in app.js) |
| `icon-512.png`, `icon-192.png` | — | PWA home screen icons |
| `apple-touch-icon.png` | — | iOS home screen icon |
| `favicon-32.png` | — | Browser tab favicon |

> **NOTE on file naming:** index.html is the public marketing/landing page (formerly landing.html). app.html is the app shell (formerly index.html). This rename was made to ensure pballconnect.com/ serves the public marketing page and the app lives at pballconnect.com/app.html. All magic link redirects, invite URLs, and auth redirects point to app.html.

> **FUTURE:** Supabase Site URL is set to https://pballconnect.com/app.html. All redirectTo and emailRedirectTo values in invite flows point to app.html. Never revert these to / or index.html.

---

## Running Locally

```
npx serve .
# or
python -m http.server
```

No tests, no linter, no build commands.

---

## Known Bugs

1. **Dashboard "Invited" box count can occasionally diverge from nav badge.** `loadDashTileCounts()` fetches its own count — verify it filters past matches and self-organized matches consistently.

2. **Mobile portrait left nav not working as slide-in drawer on iPhone.** The left nav should slide in from the left on mobile (hamburger toggle), but does not work correctly on iPhone. CSS position/transform approach needs a fresh pass.

3. **Non-member match invite flow not built.** Organizers can only invite IC members. Inviting players outside the IC (by email or name) is not yet implemented.

4. **Create Group: Mixed gender count may not update correctly in all cases.** `buildGroupSummaryGrid()` uses a case-insensitive email Map for gender lookup — verify gender fields are consistent across all IC members. Data is clean as of May 30 (`'Man'`/`'Woman'` normalized); this is a code-path verification gap only.

5. ~~**Goal rating slider track fill not rendering**~~ — fixed May 31. See Resolved list.

6. **IC member count includes pending connections.** New user's "My IC" tile shows 1 immediately after joining via invite, before the organizer accepts the reciprocal connection. Count should only include `status = 'approved'` rows where the current user is requester or recipient. Affects all paths.

8. **`saveMyCourts()` OSM courts write null court_id.** Courts sourced from Overpass/OSM proximity search have `osm_`-prefixed IDs which are not valid UUIDs. `saveMyCourts()` correctly guards against writing these as `null` — but any OSM court a user checks will be silently skipped. OSM courts need to be inserted into the `courts` table with a real UUID before they can be saved to `player_courts`. Not yet fixed.

**Open Items — July 22–23, 2026 session:**

9. **`match-invite-respond.js`: a real user's (Lindsy) "Yes, I'm In!" tap failed to record her response** — she saw "Could not record your response. Please try again." Error logging was added and deployed (`console.error` on `!upsertRes.ok`) but the actual root cause was **never confirmed** — we ran out of time trying to access Cloudflare Function logs live. **This is the explicit #1 priority for the next session.** Leading unconfirmed hypothesis: the `match_responses` UPSERT's `Prefer: resolution=merge-duplicates` has no `on_conflict=` parameter specified, and may be conflicting against the primary key (`id`) instead of the actual `(match_id, player_email)` uniqueness — unverified.
10. **`sms-register.js` validates against `invites.invite_token`, but SMS match-invite rows never populate that column.** Pre-existing, unrelated to tonight's work, not fixed.
11. **The `ic_invite_existing` email template's CTA hardcodes a bare `https://pballconnect.com` link with no token** — by apparent original design, for "existing members," since they should just log in. This interacts badly if the recipient's registration was ever deleted/doesn't exist, and was the proximate cause of tonight's "Sean can't log in" investigation. Worth revisiting the design now that the underlying sign-in bugs are fixed.
12. **RLS security review.** Supabase Security Advisor shows 3 errors (all benign — 2 intentional Security Definer views on `invite_tokens`/`public_profiles`, 1 PostGIS system table `spatial_ref_sys`) and 42 warnings, the significant majority being permissive `anon_all`/`WITH CHECK(true)` RLS policies on core tables (`matches`, `match_responses`, `invites`, `connections`, `courts`, `registrations`, `player_availability`, `player_courts`, `player_feedback`, `beta_feedback`) — meaning the public anon key currently has broad direct write access to nearly the whole database via raw API calls, bypassing all app logic. Confirmed **not new tonight** — this has been the posture the whole time the app has had real users. User has explicitly stated security hardening is the top priority for the next dedicated session. `rls_auto_enable()` (flagged as a warning) was reviewed and confirmed to be a protective event-trigger function (only ever enables RLS on new tables, never disables anything) — not a real exploit path.
13. **`action_tokens` has no purge/cleanup logic for expired rows yet.** Fine at current scale, revisit later.
14. **Two separate, independent Sign In modal implementations exist** — `app.html`'s `#loginModal`/`doLogin()` and `index.html`'s `#signInModal`/`doSignIn()`. User has expressed wanting to consolidate to one. Logged as a future cleanup item, not done tonight.
15. **Timezone handling audit needed** — how `match_date`/`time_start` are stored and displayed was never systematically reviewed. Not urgent, just flagged.
16. **Future feature ideas logged, not built:** a roster-health digest/48-hour status table with threshold alerts and a multi-court first-come-first-served fill algorithm; SMS (not just email) as an IC invite channel; staging environment (Cloudflare Preview env vars + separate Supabase project + GitHub branch protection/PRs). All discussed conceptually tonight but explicitly deferred.
17. **SMS RSVP flow has no pre-check for match fullness.** `match-invite-respond.js` attempts the `match_responses` UPSERT unconditionally on any `'in'` response, relying entirely on the DB-level `prevent_match_overfill` trigger to reject overfill at write time. When the trigger correctly rejects a late acceptance (`MATCH_FULL`), the SMS flow shows the same generic "Could not record your response. Please try again." message as a real failure — no waitlist redirect, unlike the in-app flow's `handleMatchFullRace()`. Confirmed live tonight (Prosper's second test, 10:26:37 PM, error code `P0001 MATCH_FULL`). Needs: pre-check confirmed count vs. `max_players` before attempting the write, and/or graceful `MATCH_FULL`-specific messaging with a waitlist option.
18. **`invites.status` vocabulary mismatch in `match-invite-respond.js` step 7.** Step 7 writes `'accepted'`/`'declined'` to `invites.status`, but the actual constraint (`invites_status_check`) and every other write site in the codebase (`app.js`) use a different, invite-lifecycle vocabulary: `'sent'` → `'opened'` → `'registered'`. All 20 most recent `invites` rows confirmed still at `'sent'` — the PATCH has never once succeeded, silently failing every time (caught safely by tonight's step 7 try/catch fix, so it doesn't block the user-facing success response, but the `invites` table is not being updated as intended). Needs a deliberate design decision: either fix step 7 to write correct lifecycle values, or remove the step entirely since the actual RSVP outcome is already fully captured in `match_responses.response`, which is what the rest of the app reads for in/out/waitlist state.
19. ~~**Waitlist-promotion success screen missing "See Match Details" button.**~~ — fixed July 2026. See Resolved list.
20. **Step 3's `resolveActionToken()` call is unguarded (no try/catch) in `match-invite-respond.js`**, same class of gap as the step 7 issue fixed tonight (commit `55141fe`). Not confirmed to have caused any incident yet, but same risk profile — an exception here would propagate uncaught and produce a false-failure message. `_shared/action-tokens.js`'s `resolveActionToken()` itself also has no internal try/catch around its `fetch()`, unlike `markActionTokenUsed()` in the same file which explicitly handles this ("Observability only — never throw").
21. **Auth `access_token` exposed in marketing page URL fragment (`index.html`) after magic-link/OAuth redirect.** Observed in browser URL bar as `pballconnect.com/#access_token=eyJ...`. Standard for Supabase implicit-flow auth (fragment isn't sent to server logs), but the raw token remains visible in browser history/screenshots. Consider whether the app clears the URL fragment via `history.replaceState()` after consuming the token.
22. **RLS audit incomplete.** `matches` table confirmed to have an overly permissive `WITH CHECK(true)` write policy (already logged as item #12) — demonstrated live tonight via a direct anon-key PATCH that should have required organizer authorization. `registrations` table confirmed to correctly have restrictive SELECT policy (anon key query returned empty as expected — good). Policies for `connections`, `match_responses`, `invites`, and `action_tokens` have NOT yet been audited for either read or write permissiveness. This should be prioritized before any real user/beta testing begins, given the demonstrated real exposure on `matches`.
23. **`matches` SELECT exposure — untracked "Anyone can read matches" policy (public role) found during RLS audit, scoped fix planned for next session.** During tonight's RLS hardening, dropped `anon_all` from `matches`/`match_responses` (safe, no dependencies found), but `matches` still has an untracked "Anyone can read matches" policy (role `public`, qual `true`) that `checkMatchToken()` (`app.html` deep-link handler, consumed by SMS/email match links and tonight's new "See Match Details" buttons) currently depends on for logged-out visitors. Two options were scoped:
    - **Option A (scoped anon-SELECT view, rejected):** narrows exposed columns via a `match_public_details` view (same pattern as `public_profiles`/`invite_tokens`), but does NOT close the real gap — still allows bulk enumeration/scraping of all match date/time/location data with no per-request authorization. Does not meet the stated priority of maximum data protection.
    - **Option B (token-gated lookup via Function, CHOSEN):** replace `checkMatchToken()`'s direct client-side `matches` query with a server-side Function using the service key, following the exact `resolveActionToken()` pattern already proven in `match-invite-respond.js`/`waitlist-promo-respond.js`. Closes the gap entirely — no valid token for a specific match means no data returned, period.

    Implementation plan for next session:
    1. New lookup Function (`match-view-lookup.js`, mirroring `match-invite-lookup.js`) resolving `match_invite`/`waitlist_promo` tokens (broaden `resolveActionToken()`'s `expectedType` check to accept either) to return the safe match-detail field subset.
    2. Rewrite `checkMatchToken()` (`app.js:7842`): read `?t=TOKEN` instead of `?match=ID`, call the new lookup Function instead of querying `matches` directly. The two "See Match Details" buttons built tonight (`match-invite.html`, `waitlist-promo.html`) already carry a valid per-recipient token — their deep links change from `?match=ID` to `?t=TOKEN` with minimal extra work.
    3. Retrofit the two broadcast-notification email loops (`app.js:4451` initial invite emails, `app.js:5332` edit/cancellation notifications) — currently build one shared un-tokenized `?match=ID` link reused across all recipients in a `for` loop. Needs: new minting Function (`match-view-token.js`, mirroring `match-invite-token.js`) to issue a per-recipient `match_view`-type `action_tokens` row, and restructuring both loops to mint + build the link once per recipient inside the loop rather than once outside it.
    4. **No dual-format support for legacy `?match=ID` links (explicit decision)** — once shipped, old links stop resolving via the old path entirely, by design, to fully close the security gap rather than leave it partially open during a transition window.
    5. Add a friendly fallback message in `checkMatchToken()` for anyone landing with an old/unrecognized link format: explain the security upgrade, and prompt them to log in to see current matches — e.g. *"This link has expired. We've upgraded our security to better protect your match details. Please log in to see your current matches."* If already logged in, skip the login prompt and route straight to their dashboard instead.
    6. Verify Postgres view/Function privilege behavior live in Supabase before considering done (not just assumed from documentation), same diligence tonight's other fixes required.

    **RLS hardening phase status:** Phase 1 (`matches`/`match_responses`) — `anon_all` dropped live tonight; the six untracked `"Anyone can ..."` policies (3 per table, see this item) still need the Option B fix above before `matches` SELECT is fully closed, `match_responses`'s three "Anyone can..." policies have no known dependency and can be dropped once confirmed. **Phase 2 (`connections`) — DONE.** Four untracked anon-role policies (`anon_all`, "Allow public inserts", "Allow public reads", "Allow public updates") dropped live and confirmed via `pg_policies` — full trace of every `connections` read/write in `app.js` found no code dependency on anon-role access; tracked in `supabase_rls_policies.sql`. **Phase 3 (`invites`) — DONE.** Base table `invites` now has zero anon/public-role policies — all 5 confirmed untracked policies dropped (`anon_all`, "Anyone can insert invites", "Anyone can read by token", "Public can read invite by token", "Anyone can update status"). A second, previously-unknown exposure was found and closed in the same pass: the `invite_tokens` view — the safe, column-limited surface `checkInviteToken()` (`app.js`) already used for pre-auth reads — turned out to have live `anon`/`authenticated` grants for INSERT, UPDATE, DELETE, and TRUNCATE, not just SELECT. Since it's a plain single-table view with no `security_invoker` and no DISTINCT/GROUP BY/joins, Postgres treats it as automatically updatable — a write sent to the view would pass straight through to the base `invites` table, completely bypassing whatever RLS policies existed there, `status` included. Fixing only the base table's policies would **not** have closed this — the view's own grants had to be independently locked to SELECT-only for both roles. The one genuine anon write need (invite-opened tracking, the `status:'opened'` PATCH previously at `app.js` ~line 11840) was moved server-side into a new `mark-invite-opened.js` Function using the service role, replacing the direct client-side write entirely — so the base table needs no anon-role replacement policy at all. All three changes (base-table drops, view grant lockdown, new Function + `app.js` update) tracked together in `supabase_rls_policies.sql`, committed as `e4b6071`. Verified live via `pg_policies` and `information_schema.role_table_grants`.

    **All three phases of tonight's RLS hardening pass are now complete.** Two things remain open: the `matches` SELECT exposure (Option B build, already scoped above in this same item) — still not built — and a new follow-up worth flagging: **`action_tokens` was only ever checked for RLS-*enabled* status early in tonight's session** (confirmed enabled, zero policies, service-role only — see CLAUDE-SCHEMA.md's `action_tokens` entry), but never got the same deep per-policy `pg_policies` audit the other four tables received. Given how much bigger the `invites` exposure turned out to be once actually dug into, `action_tokens` shouldn't be assumed clean without the same scrutiny.

**Resolved (do not re-introduce):**
- ~~**Waitlist-promotion success screen missing "See Match Details" button (item #19)**~~ — Fixed July 2026 (commit `1594025`). Confirmed a genuinely separate code path from `match-invite-respond.js`/`match-invite.html` — `waitlist-promo.html`/`waitlist-promo-respond.js`/`waitlist-promo-lookup.js` are their own standalone page + Functions with their own `showConfirm()`, never touched by the match-invite button fix. Ported the same three-part change: added `id` to `waitlist-promo-lookup.js`'s `matches` select (was missing, same gap `match-invite-lookup.js` had), stored it client-side as `_matchDetails`, and wired a `See Match Details` button into `#stateConfirm`'s `response === 'in'` success branch only (`'out'`/`MATCH_FULL`/error states unaffected) — same `/app.html?match=ID` deep-link convention as the match-invite fix.
- ~~**Bug C — link/text invite paths: IC connection never established**~~ — Fixed June–July 2026. `handlePostRegistrationInvite()` runs two PATCHes: (1) primary PATCH by `recipient_email=eq.NEW_PLAYER_EMAIL` (email invite path); (2) fallback PATCH by `recipient_email=eq.pending_TOKEN` (link/text invite path — writes real email + `approved` in one shot). `inviter_email` fetched from `invites` table directly via `invite_token=eq.TOKEN`, never from `invite_tokens` view. Two RLS policies added to `connections` table: SELECT and UPDATE for `recipient_email ILIKE 'pending_%'`. QR path unaffected.
- ~~**`handlePostRegistrationInvite()` PATCH returning 400**~~ — Fixed July 2026 (commit `2c43072`). Root cause: `encodeURIComponent` was encoding `@` to `%40` in the PostgREST filter values, causing bad request errors. Also a stale `&status=eq.pending` filter was silently excluding rows whose status had been changed. Fixed by using raw email strings in both PATCH URLs and removing the status filter entirely. If this regresses: check the PATCH URL in `handlePostRegistrationInvite()` — ensure format is `requester_email=eq.EMAIL&recipient_email=eq.EMAIL` with no status filter and no percent-encoding on the email values.
- ~~**Registration flow regression (June 2026)**~~ — `const _isNewRegistration` declared inside `try{}` caused silent `ReferenceError` after save; new users saw "You're All Set" then were dumped to `page-welcome`. Fixed by moving the declaration before `try{}`.
- ~~`invites` table RLS INSERT policy missing~~ — policy added in Supabase; invites now write correctly
- ~~`invite_token` missing from INSERT payload~~ — client-side token generated via `crypto.getRandomValues` and included in payload
- ~~`+` addressed Gmail accounts blocked by silent filter in `sendEmail()`~~ — filter removed; only `@example.com` and `@test.com` are blocked
- ~~`icPostPendingConnection()` 409 Conflict on duplicate~~ — handled with `resolution=ignore-duplicates`
- ~~`sendEmail()` missing `return` keyword~~ — fixed; function now returns the fetch response
- ~~IC connection stays `pending` after new user accepts invite~~ — original row now PATCHed to `approved`; reciprocal row created as `approved`; `inviteMutualOverlay` with broken requester logic removed
- ~~Duplicate invite cards in incoming requests view~~ — `loadIcPending()` deduplicates by `requester_email` before rendering; race condition fixed (May 20) by removing redundant call in `showIcSection()` and adding `_icPendingLoading` in-flight guard with `finally` block
- ~~"Welcome back" shown on first login~~ — per-email `localStorage` flag (`pb_welcomed_<email>`) distinguishes first vs. returning logins
- ~~Full Profile button doing nothing on registration choice screen~~ — `startNewRegistration` now sets `_newUserRegistrationStarted = true` on first call; dual auth events (both `onAuthStateChange` and `getSession()` fire on magic link arrival) no longer stack two overlays
- ~~IC tab shows 0 on arrival from dashboard~~ — fixed by syncing counts in `showIcSection()`
- ~~+ Add to my IC showing for existing IC members in outbound accepted group~~ — removed from that group
- ~~Duplicate courts in nearby list~~ — `normalizeCourtName()` fuzzy match + double-dedup applied
- ~~Level grid column headers showing raw diff ranges (`< 3.88`, `3.88 – 4.13`) instead of IC Level Structure labels~~ — fixed in `buildGroupInviteGrid()` and `buildSmInviteGrid()`; now shows `.5+ Below My Level` / `.25 Below My Level` / `My Level` / `.25 Above My Level` / `.5+ Above My Level` with `≤/≥` reference values at 0.25 increments
- ~~Emergency Fill overwrote `IC_MEMBERS` with flat objects when IC data was fetched on demand~~ — fixed by using local `_efMemberFlat` variable; `IC_MEMBERS` global is never written to by Emergency Fill. See Rule 47.
- ~~Gender data in `registrations` used legacy values `'Male'`/`'Female'`~~ — one-time migration run May 30: `UPDATE registrations SET gender='Man' WHERE gender='Male'; UPDATE registrations SET gender='Woman' WHERE gender='Female';`. All rows now use `'Man'`/`'Woman'`. Users with `null` gender still need outreach or a login-time prompt.
- ~~Organic signup pre-population failing~~ — root cause: `id="lbl3\"` in `index.html` (backslash before closing quote) caused `goTo()` to crash before the pre-population IIFE ran. Fixed May 31. All 4 fields (email, skill, age range, playing since) confirmed pre-populating correctly end-to-end.
- ~~Goal rating slider track fill not rendering~~ — `updateGoalRedBar()` bailed immediately because `goalSliderRedBar`, `goalSliderGreenBar`, `goalRedLabel` were never added to `index.html`. Added as `position:absolute` overlays inside the `position:relative` slider wrapper (May 31). Bars: `top:50%; transform:translateY(-50%); height:6px`. Red bar (#dc2626) = floor below personal rating; blue bar (#2563eb) = goal range above personal rating. Tick builds also moved from `DOMContentLoaded` to `unlockProfileForm()` to fix zero-width timing.
- ~~Courts: `addCustomCourt()` wrote `null` `court_id` to `player_courts`~~ — Fixed June 2026. Function generated a synthetic `custom_`+timestamp ID that `saveMyCourts()` could not resolve. Fixed by generating a real UUID via `crypto.randomUUID()` client-side before the `courts` INSERT and writing it directly to `player_courts` immediately — no reliance on SELECT-back. `saveMyCourts()` now silently skips courts with `null` or `osm_`/`custom_`-prefixed IDs (logs warning).
- ~~Courts: Phase 1 fetch used PostgREST embedded join with no FK~~ — Fixed June 2026. `loadMyCourts()` Phase 1 used `player_courts?select=*,courts(*)` but no FK exists between the tables; PostgREST silently returned no joined data. Replaced with a two-step fetch: query `player_courts` for saved IDs, then `courts?id=in.(...)` for court details.
- ~~Courts: Phase 1 fetch used wrong column names `lat`/`lon`~~ — Fixed June 2026. `courts` table stores `latitude`/`longitude`; Phase 1 was reading `c.lat`/`c.lon` which were `undefined`. Fixed column references to `c.latitude`/`c.longitude`.
- ~~Courts: nav badge count overwritten by proximity search~~ — Fixed June 2026. `loadMyCourts()` Phase 2 (proximity search) was calling `updateNavCourtBadges()` directly with the nearby count, overwriting the saved-courts badge. Fixed by making `loadCourtBadgesForNav(email)` the exclusive owner of the badge; Phase 2 no longer touches it.
- ~~Courts: saved courts not showing when user is outside their saved court's search radius~~ — Fixed June 2026. `loadMyCourts()` Phase 1 now renders saved courts immediately from `player_courts` before Phase 2 runs. Saved courts always appear regardless of the user's current location radius.

---

## Pre-Launch Checklist

- [x] Terms of Service page
- [x] Privacy Policy page
- [x] Liability waiver with RSA 508:13 language at registration
- [x] Two-tier invite system (single-use tokens + QR) live
- [x] IC invite email via Resend API (no email app required)
- [x] `invites` table RLS INSERT policy added
- [x] PWA icons added (icon-512, icon-192, apple-touch-icon, favicon-32)
- [x] Welcome/landing screen (`page-welcome`) + auth gate in `showPage()`
- [x] `landing.html` — public marketing landing page live at `/landing.html`
- [x] Waitlist form with Cloudflare Turnstile bot protection
- [x] `/api/waitlist` Cloudflare Pages Function — rate-limited, Turnstile-verified, saves to Supabase
- [x] Rate limiting on `/api/send-email` (5/hr per IP via KV)
- [x] Skill level guide modal (`skillGuideModal`) + "What's my level?" trigger on all skill sliders
- [x] SMS notification system — `send-sms.js` + `twilio-webhook.js` + TCPA opt-in UI
- [x] "Can't Make It" drop flow — organizer notified, waitlist promoted (scramble mode if <24h)
- [x] `sms_consent_log` table + `/api/log-sms-consent` Pages Function — TCPA append-only audit trail
- [x] Admin registration alert email to `david@pballconnect.com` on every new signup (all 3 paths)
- [ ] **Run waitlist table SQL** — SQL is in `supabase_rls_policies.sql`; must be run manually in Supabase SQL editor before waitlist goes live
- [ ] **Complete Turnstile setup** — replace `TURNSTILE_SITE_KEY_PLACEHOLDER` in `landing.html`; add `TURNSTILE_SECRET_KEY` to Cloudflare Pages env vars
- [ ] **Add `SUPABASE_SERVICE_KEY` to Cloudflare Pages env vars** — needed by `/api/waitlist`
- [ ] **Bind `RATE_LIMIT_KV`** — create KV namespace in Cloudflare, bind as `RATE_LIMIT_KV` in Pages settings
- [ ] **Twilio: upgrade to Pay as you go** — trial mode only sends to verified numbers; required before launch
- [ ] **Twilio: A2P 10DLC registration** — required for production US SMS sending
- [x] **End-to-end SMS test** — full match invite flow verified end-to-end with verified Twilio number
- [ ] **Twilio STOP webhook test** — send STOP, verify sms_opt_in=false in Supabase; send START, verify sms_opt_in=true
- [ ] **Fix mobile portrait left nav** — slide-in drawer not working on iPhone
- [ ] **Non-member match invite flow** — invite players outside IC by email
- [ ] **Test full invite flow end to end:**
  - Single-use token → register → IC connection created ✓ (tested April 27)
  - QR token → register → IC connection created
  - Reset QR → old link invalid → new QR works
- [ ] LLC formation — replace `[OWNER NAME / LLC NAME]` and `[YOUR EMAIL ADDRESS]` placeholders in ToS
- [ ] Attorney review of ToS + Liability Waiver
- [ ] NH RSA 508:13 waiver language verified by NH attorney
- [ ] Insurance (General Liability, E&O, Cyber)
- [ ] SPF + DKIM + DMARC fully configured in Resend
- [ ] `hello@pballconnect.com` sender address verified in Resend (used by waitlist confirmation email)
- [ ] App moved to pballconnect.com/app or subdomain; `landing.html` promoted to root
- [ ] Google indexing updated to landing page
- [ ] GDPR / CCPA compliance review
- [ ] Rate limiting on magic link sends
- [ ] Error monitoring (Sentry or Cloudflare Logpush)
- [ ] Uptime monitoring
- [ ] Backup / point-in-time recovery confirmed in Supabase
- [ ] App tested on iOS Safari + Android Chrome
- [ ] PWA install prompt tested
- [x] **Consent log wired to all paths** — `doSaveProfile()`, `_qcSave()`, and `sms-register.js` all write to `sms_consent_log` on opt-in
- [x] **Staging environment configured** — staging branch live on Cloudflare Pages
- [ ] **ToS placeholders filled** — replace `[OWNER NAME / LLC NAME]` and `[YOUR EMAIL ADDRESS]`
- [ ] **Android + cross-browser test pass**

---

## Next to Build

1. **End-to-end test: Set Up a Match** — test all four Play Structure paths (Open, Mixed, Same Gender, Set Group). Verify step order, invite grid, conflict detection, and post-send navigation on each path.
2. **End-to-end test: Create Group** — test both Set Group and Open Group creation. Verify size auto-calculation, level grid selection, sub pool (Set), Open Group messaging, and button gate.
3. **Review & Send step — group roster** — verify that the group roster displays correctly in Container 7 when a Set Group is selected.
4. **Match detail page** — post-send experience after navigating to Dashboard; players need a way to view match details.
5. **Dashboard amber tile pulse** — brief pulse animation on the amber "Pending" tile after a successful match creation (`submitMatch()` success).
6. **Fix mobile portrait left nav** — slide-in drawer via hamburger toggle not working on iPhone. CSS `position:fixed` + `transform:translateX` approach needs a clean-room pass.
7. **Non-member match invite flow** — organizer enters email/name for players not in their IC; app sends invite email with magic link to join + RSVP.
8. **Promote `landing.html` to root** — rename `index.html` → `app.html`, `landing.html` → `index.html`, update `_redirects`. Requires Cloudflare setup steps (Turnstile, waitlist table SQL, service key, KV binding) to be complete first.
9. **Play Structure as Step 1 with branching** — Set Group path auto-calculates courts and skips steps 2–3; Open/Mixed/Same runs full 7-container wizard.
10. **My Groups UI** — organizer chip red/white, gender lookup fix (`player_email` not `email`), Set vs Random toggle in create modal.
11. **Match Invites — status pill dropdowns** — In/Pending/Waitlist/Out boxes reveal player name list. `_miResponseCache` and `toggleInvitePanel()` already scaffolded.
12. **Onboarding flow for new users** — guided setup after first login.
13. **Recurring matches v2** — gap alert delivery via Cloudflare Cron Worker.
14. **Web push notifications** — browser push for match invites, IC requests, gap alerts.
15. **Player statistics dashboard** — `playerStats` page needs data and UX.
16. **Unified Add Court modal** — `window.showAddCourtModal(type)` replacing the old `addCustomCourt()`. Collects name, street address, city, state, indoor/outdoor/both chip buttons, num courts, notes, and a member checkbox (private courts only). Geocodes via Nominatim before saving. Saves immediately with a client-generated UUID — no reliance on SELECT-back. Built June 2026.
17. **OSM court save flow** — Courts returned by the Overpass/OSM proximity search carry `osm_`-prefixed IDs that are not valid UUIDs. `saveMyCourts()` currently silently skips them (logs warning). These courts must first be inserted into the `courts` table with a real UUID before they can be linked in `player_courts`. Requires UX decision: auto-insert on Save, or explicit "Add this court to registry" button.
18. ~~**Emergency Fill screen**~~ ✅ — organizer tool built; see CLAUDE-SMS.md Emergency Fill Screen section.
19. ~~**Verify: organizer SMS on player cancellation**~~ ✅ — verified with a verified Twilio number: drop a player, organizer receives SMS notification, `sms_log` shows `event_type:'player_dropped'`.
20. ~~**Verify: match time in cancellation notification email**~~ ✅ — confirmed organizer notification email includes match time; `send-email.js` `match_update` template verified.
21. ~~**Consent log Part 2**~~ ✅ — `doSaveProfile()` and `_qcSave()` both call `POST /api/log-sms-consent` on opt-in. All three registration paths now write to `sms_consent_log`.
22. ~~**Fix stray Send Invites button in Step 4 of Set Up a Match wizard**~~ ✅ — `smInviteContinueBtn` removed from `buildSmInviteGrid()`; real send button is `matchSendBtn` in the sticky progress bar.
23. ~~**End-to-end SMS invite test**~~ ✅ — full flow verified with a verified Twilio number: organizer sends match invite → SMS delivered → recipient RSVPs → `match_responses` updated → `invites` row updated.
24. ~~**Staging environment**~~ ✅ — staging branch/deployment configured on Cloudflare Pages.

---

## Post-Beta Roadmap

### Authentication Improvements
- Add Google Sign In and Apple Sign In via Supabase OAuth as alternatives to Magic Link
- Both are free for web apps (no App Store fees apply — PBallConnect is a browser-based web app)
- Benefits: one-tap login, fixes iOS PWA session persistence issue, more intuitive for 50+ demographic
- Supabase OAuth setup is relatively straightforward — enable Google/Apple providers in Supabase Auth settings
- Keep Magic Link as fallback for users without Google/Apple accounts
- Priority: medium — implement after beta feedback confirms login friction is a real user pain point

---

## Future Features

### Cross-match waitlist conflict detection
If a player is on the waitlist for Match A, and separately becomes confirmed (`'in'`) for a different Match B whose time window overlaps Match A's, the system should:
1. Notify the player that they're now double-booked and ask whether they want to remain on Match A's waitlist or be removed from it — do not auto-remove them without asking, since they may prefer Match A if it comes through.
2. If the player chooses to leave Match A's waitlist (or a future decision is made to auto-remove), notify Match A's organizer specifically that this player is no longer available, so the organizer has accurate visibility into their real waitlist rather than a stale one.
3. Time-overlap detection logic likely already exists for this purpose in `smCheckConflict()` (Rule 28) and could potentially be reused or adapted rather than built from scratch.
4. Open design question, not yet decided: should this check run in real time whenever a player's `match_responses` changes anywhere in the app, or only at specific trigger points (e.g. right after a new `'in'` confirmation)? Real-time is more thorough but has more performance/complexity cost.

This is a clear communication/respect-for-organizer-time feature — the guiding principle is that all parties (the player, and especially the organizer who is planning around a real roster) should always have accurate, current information rather than finding out someone's unavailable only when they don't show up.

---

## Admin Registration Alerts

An alert email fires to `david@pballconnect.com` on every new player registration, regardless of path. Three code paths:

| Path | Function | Location |
|---|---|---|
| Full profile | `doSaveProfile()` | `app.js` |
| Quick Connect | `_qcSave()` | `app.js` |
| SMS invite | `sms-register.js` | `functions/api/sms-register.js` |

Email includes: player name, email, registration path, invite source, skill level, age range, zip code, gender, `sms_opt_in` status, and UTC timestamp. Subject prefixed with 🚨 for organic signups. Always `await sendEmail()` in `try/catch`. Never fire-and-forget. See Rule 50.

---

## Product Decisions

- **Find Players / Browse Nearby removed from Inner Circle (April 2026)** — `icSectionFind` HTML removed from `index.html`; `loadNearbyPlayers`, `filterNearbyGrid`, `switchFindTab` stubbed as no-ops in `app.js`. Player discovery via IC invite flow (email/text/link/QR) is sufficient. Do not re-add the Find section to the IC page.

- **Pending Matches system (April 2026)** — The `invitedByOthers` page (`page-invitedByOthers`) serves as the unified "Pending Matches" page. Do not rename or remove the page ID — navigation throughout the app depends on it. Three sections rendered (each only if data exists): (1) **Open Invites** — `match_responses.response = 'pending'`, `player_email = SESSION_PLAYER.email`, upcoming — shows Accept/Decline buttons, expanded by default; (2) **Matches You've Joined** — `response = 'in'`, `organizer_email != SESSION_PLAYER.email`, roster not full, upcoming — amber "Pending roster" badge, no action buttons; (3) **Matches You're Organizing** — `organizer_email = SESSION_PLAYER.email`, roster not full, upcoming — amber "Organizing" badge. Dashboard amber tile counts all three sections deduplicated by `match_id`. Roster-full check: count `match_responses` rows where `response = 'in'`; a match is pending if in-count < `max_players`. Date comparisons: always local date with en-CA locale — never UTC. Dashboard count and page render must use identical logic (console logs intentionally left in both loaders for debugging). Do not combine the three section queries into one Supabase query — keep them as independent fetches. Do not use `status=neq.full` or `status=neq.cancelled` in DB queries for pending logic — PostgREST `neq` excludes NULL-status rows; filter cancelled in JS with `(m.status||'') !== 'cancelled'` instead.

---

## Infrastructure & Business

### Twilio
- Spending alerts set at $10 (email) and 100 outbound SMS
- Running on prepaid balance model — natural hard stop when balance hits $0
- Auto-recharge is OFF — do not enable
- Load $20–30 at a time manually via Twilio Console

### Google Workspace
- Business Starter plan at `zorro@pballconnect.com`
- MX records configured in Cloudflare DNS for Google Workspace (5 records: `aspmx.l.google.com` + 4 alt records)
- Resend bounce MX record preserved separately — do not overwrite

### Business Entity
- PBallConnect LLC filed with NH Secretary of State — under review
- EIN obtained from IRS
- NAICS code: 713990 (Other Amusement and Recreation Industries)

---

## Development Workflow

1. Edit `app.js`, `index.html`, or `styles.css` directly — no build step.
2. Test locally with `npx serve .` or `python -m http.server`.
3. For Supabase schema changes: run SQL in Supabase SQL editor, update `supabase_rls_policies.sql`, and update the `public_profiles` view if new columns need to be exposed.
4. For Cloudflare Pages Function changes: edit files in `functions/api/`. Environment variables (`RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TURNSTILE_SECRET_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `MATCH_INVITE_SECRET`) are set in the Cloudflare Pages dashboard. `RATE_LIMIT_KV` is a KV namespace binding (not an env var — set under Settings → Functions → KV namespace bindings).
5. Deploy: `git push origin main` → Cloudflare Pages auto-deploys. A pre-commit hook (not pre-push) automatically writes the current commit hash into `version.json` and self-stages it as part of every commit — no amend, no rewrite of HEAD, no `--force` needed or wanted. A plain `git push origin main` is correct and safe.
6. Verify deploy at https://pballconnect.com — Cloudflare typically deploys within 60 seconds.

### Debugging on Mobile

No USB DevTools access on iPhone. Use an **on-screen debug panel** for mobile debugging — a fixed `<div>` at the bottom of the screen with monospace green text that appends log lines via JS. Remove it before the final commit. Private/incognito tabs bypass Cloudflare's edge cache when testing a fresh deploy.

### Session Handoff Pattern
Design and planning happens in Claude.ai (claude.ai/code or chat). Implementation happens in Claude Code (CLI or desktop app). When handing off from a planning session:
- Summarize the spec in a prompt and paste into Claude Code
- Claude Code reads the relevant files, implements, commits, and pushes
- Cloudflare Pages picks up the push and deploys automatically (~60s)

---

## Working Relationship — Claude Chat vs Claude Code

Claude Chat (claude.ai) acts as the architect and project manager. It never writes implementation code directly. Its role is to analyze problems, design solutions, and provide precise unambiguous instructions for Claude Code to execute. Claude Code is the implementer — it reads the instructions, finds the exact lines, and writes the code.

When Claude Chat provides instructions they should follow this format:

- Start with "Read CLAUDE.md first" for any multi-part or risky change
- Reference the exact function name, not just a line number
- State the rule in plain logic — including what to check first and what to leave unchanged
- Include "If it already says X make no change" to prevent unnecessary edits
- End with `node --check app.js` for any JS change and `git push --force origin main`

_Past session learnings (May 16 – June 8, 2026) archived in [CLAUDE-ARCHIVE.md](CLAUDE-ARCHIVE.md)._

---

## Session Log — July 3, 2026

- Fixed `handlePostRegistrationInvite()` 400 error (commit `2c43072`) and verified the full invite→register→IC-approve flow live end to end.
- Fixed "My IC" count to be requester-directional per Model B (commit `126f4dd`) — was incorrectly counting recipient-side approved connections; fixed in `loadInnerCircle()`, the Emergency Fill fallback, and the `showCreateGroupModal()` fallback. Verified live on both inviter and invitee sides.
- Added database-level match overfill protection: `prevent_match_overfill` trigger on `match_responses`, tested and confirmed live in Supabase.
- Built client-side race handling: `showMatchFullConfirm()` + `handleMatchFullRace()`, unified across both the early-detection (`spotsLeft<=0`) and late database-trigger-rejection paths — both now show the same "Someone claimed that spot" confirmation with a real Yes/No choice.
- Fixed Pending Matches page (`.ibo-respond-btn` handler) to show the real accept/waitlist outcome instead of an optimistic false "You're in!" message.
- Fixed a `submitFeedback()` naming collision between the beta feedback modal and post-match peer review — renamed the latter to `submitPostMatchFeedback`.
- Added a collapsible, beta-tester-gated debug log dropdown (red/green error summary, copy button) in place of the always-expanded bottom log bar; `console.error` is now captured (previously only `console.log`/`console.warn` were).
- Built a complete waitlist promotion tap-to-respond feature in 5 steps: new signed-link Pages Functions (`waitlist-promo-token`/`lookup`/`respond.js`, email-keyed, expires at match start + 12h buffer), a standalone no-login response page (`waitlist-promo.html`), wiring into all three real promotion notification paths (with safe fallback to the old plain URL if link generation fails), and full in-app parity on a new "⏳ Waitlist" nav page (dual red/green badge, Promoted section with IN/OUT buttons, existing Waiting section with Leave Waitlist).
- Added `filled_from_waitlist` tracking (boolean column, already existed but was unused) for future admin/KPI reporting on how many spots get filled from the waitlist with zero organizer action.
- Documented two future features: cross-match waitlist conflict detection, and an Admin/KPI dashboard (not yet built).
- Known open items: verify Stats & History pages (Player Statistics, Record/View Scores) are real vs. stub before deciding on nav restructuring into a "Future Features" section; nav restructuring itself (Future Features container, grayed-out with interest-tracking) discussed but not yet built; `app.js` modularization discussed as a post-beta initiative.

---

## Session Log — July 22–23, 2026

- **Replaced the HMAC-signed SMS invite link pattern** (match-invite + waitlist-promo) **with a new opaque-token system** — new `action_tokens` table + `functions/_shared/action-tokens.js` (`createActionToken`, `resolveActionToken`, `markActionTokenUsed`). This fixed a real, confirmed link-corruption-in-transit bug affecting real users: a real player's phone number and the HMAC signature were both corrupted somewhere in transit inside the long, plaintext, pipe-delimited HMAC URL during actual SMS delivery. URLs are now `?t=TOKEN` only, resolved server-side against `action_tokens` — nothing meaningful travels in the URL anymore. See CLAUDE-SCHEMA.md § `action_tokens` and CLAUDE-FLOWS.md Flow 9 for the new mechanism.
- **Found and fixed 5 additional real bugs during live testing of the new system:**
  1. `match-invite-lookup.js` queried nonexistent `matches.location`/`matches.start_time` columns — aliased to the real `court_name`/`time_start` columns via PostgREST's `alias:column` select syntax.
  2. **`matches.format` does NOT exist**, despite being listed in CLAUDE-SCHEMA.md's `matches` Key Columns — confirmed via a live Supabase query returning Postgres error `42703 undefined_column`. Removed from all queries. This means CLAUDE-SCHEMA.md's `matches` column list is confirmed unreliable and needs a full re-audit against the live schema — see the correction and new warning added to CLAUDE-SCHEMA.md.
  3. `match-invite.html` displayed `format` instead of `gender_pref` for the match-type label — fixed to read `details.gender_pref`.
  4. `doLogin()` in `app.js` used `window.location.pathname` for its magic-link `emailRedirectTo` instead of a hardcoded `/app.html` path — violated Rule 51. Real bug: caused existing users' sign-in from the marketing page to bounce back to the marketing page instead of into the app. Fixed and verified live.
  5. `doSignIn()` in `index.html` — a **separate, independent** sign-in modal from `app.html`'s (different file, different function, raw `fetch()` bypassing the Supabase JS SDK entirely) — was sending its redirect target nested in the JSON body (`options.emailRedirectTo`) instead of as a `?redirect_to=` URL query parameter, which the raw GoTrue REST endpoint requires. Fixed and verified live with a real successful login. See new CLAUDE-RULES.md Rule 64 — this exact pattern (a fix in one sign-in implementation not covering the other) was the cause of this bug going undetected after bug #4 was already fixed.
- **Twilio A2P 10DLC campaign resubmitted and now APPROVED** as of this session — SMS should now work for any real phone number, not just Twilio-verified ones. See CLAUDE-SMS.md's updated campaign status.
- **Production data cleanup:** two test accounts (`yorksean2003@yahoo.com`, `syork@kriegerkenney.com`) were fully deleted from production, including one organized match and its other players' `match_responses` rows, via direct SQL. Real production data cleanup, not a code change.
- See "Open Items — July 22–23, 2026 session" in Known Bugs above for the full list of what's still open, including the #1 priority for next session (`match-invite-respond.js` write failure, root cause unconfirmed).

---

## Session Log — July 25–26, 2026

**Fixed & verified live (the July 22-23 session's #1 priority, root-caused and closed):**
- **`match_responses` UPSERT 409 error** — root cause of the original bug report (Lindsy's failed RSVP): the `Prefer: resolution=merge-duplicates` UPSERT had no `on_conflict=match_id,player_email` parameter, so PostgREST fell back to conflicting against the primary key (`id`) instead of the real `(match_id, player_email)` uniqueness, and every retry hit a genuine `23505` duplicate-key error. Confirmed live via a real-time `wrangler pages deployment tail` capture of Lindsy's actual failing request. Fixed — commit `e81daab`.
- **`matches.status` never flipping to `'full'` via the SMS RSVP path** — a feature-parity gap against the in-app flow's `checkAndUpdateMatchStatus()`, which the SMS flow never had an equivalent of. Matches filled entirely via SMS silently stayed `status:'open'` forever, invisible on both parties' Confirmed Matches pages despite a complete roster. Ported the same confirmed-count-vs-`max_players` check and `status:'full'` PATCH into `match-invite-respond.js`. Fixed — commit `5cb34ab`. One already-affected live match (Garrison Elementary, Jul 25) manually corrected via a one-off PATCH after read-only verification.
- **Step 7's unguarded invite-status PATCH causing false "Could not record your response" errors** — even after the two fixes above, a real player (Prosper) still saw the exact same failure message despite his `match_responses` row having actually written successfully. Root cause: step 7's `fetch()` call (updating `invites.status`) had no try/catch around it, unlike every other step in the file — an exception there (unrelated to the actual RSVP write) would propagate uncaught and produce the same generic failure text client-side. Wrapped in try/catch, matching the pattern already proven in step 6. Fixed — commit `55141fe`.
- **"See Match Details" button** added to `match-invite-respond.js`'s success confirmation screen, deep-linking IC-invited users into `app.html?match=ID` for the specific match (commit `47d4626`), then ported to the genuinely separate `waitlist-promo.html`/`waitlist-promo-respond.js` code path once confirmed it hadn't inherited the fix automatically (commit `1594025`, resolves Known Issue item #19).

**RLS security hardening — all 3 planned phases completed tonight.** Not triggered by any Supabase built-in advisory tool — discovered by accident while diagnosing an unrelated bug, when a direct anon-key `PATCH` to `matches.status` succeeded with zero authentication. That prompted a fully manual audit from there: the user ran `pg_policies` and `information_schema.role_table_grants` queries directly in the Supabase SQL Editor (not accessible to Claude Code directly — PostgREST doesn't expose Postgres system catalogs, so every policy/grant finding tonight came from the user running these queries and sharing the results back):
- **Phase 1 (`matches`, `match_responses`)** — `anon_all` dropped from both tables (untracked live drift, no code dependency found). Demonstrated live before the fix: a direct anon-key `PATCH` to `matches.status` succeeded with zero authentication, proving the exposure was real, not theoretical.
- **Phase 2 (`connections`)** — 4 untracked anon-role policies dropped (`anon_all`, "Allow public inserts", "Allow public reads", "Allow public updates"). Fully clean result: exhaustive trace of every `connections` read/write in `app.js`, including `icPostPendingConnection()` and `handlePostRegistrationInvite()`'s reciprocal-connection writes, confirmed all of them run as `authenticated`, never `anon` — no dependency, no exceptions.
- **Phase 3 (`invites`)** — the trickiest of the three, correctly flagged going in as the one table with genuine anon-role dependencies. 5 untracked anon/public policies dropped (`anon_all`, "Anyone can insert invites", "Anyone can read by token", "Public can read invite by token", "Anyone can update status"). A second, independent exposure was found mid-investigation: the `invite_tokens` view — believed to be the safe, already-scoped read surface — turned out to have live `anon`/`authenticated` grants for INSERT, UPDATE, DELETE, and TRUNCATE, not just SELECT. Because it's a plain auto-updatable view (single table, no `security_invoker`, no DISTINCT/GROUP BY/joins), writes through it passed straight through to the base `invites` table regardless of whatever RLS policies existed there — fixing only the base table's policies would not have closed this. Locked the view to SELECT-only for both roles, and moved the one genuine anon write (the `status:'opened'` tracking PATCH) server-side into a new `mark-invite-opened.js` Function using the service role, so the base table needs zero anon-role policies at all. Commits `e4b6071` (fix), `c7df9df` (hash backfill into item #23).

**New Known Issues logged (items #17-23; see Known Bugs above for full text):**
- #17 — SMS RSVP flow has no pre-check for match fullness (relies entirely on the DB trigger, shows a generic error instead of a waitlist option on `MATCH_FULL`).
- #18 — `invites.status` vocabulary mismatch: step 7 writes `'accepted'`/`'declined'`, but the real constraint and every other write site use `'sent'`/`'opened'`/`'registered'` — the PATCH has never once succeeded.
- #19 — waitlist-promo missing "See Match Details" button — **resolved this session**, see above.
- #20 — step 3's `resolveActionToken()` call is unguarded (no try/catch), same class of gap as the step 7 issue fixed tonight.
- #21 — auth `access_token` exposed in the marketing page URL fragment after magic-link/OAuth redirect.
- #22 — RLS audit incomplete (superseded by tonight's full 3-phase pass, see #23).
- #23 — `matches` SELECT is still exposed to the `public` role (`checkMatchToken()`'s deep-link dependency). Full Option B design (token-gated lookup Function, replacing the direct client-side query) already scoped in detail and ready to implement — this is the last open piece of tonight's security work.
- **New, not yet numbered:** `action_tokens` was only ever checked for RLS-*enabled* status early in tonight's session (confirmed enabled, zero policies, service-role only) — never got the same deep per-policy `pg_policies` audit the other four tables received. Flagged given how much bigger the `invites` exposure turned out to be once actually dug into.

**Next session priority:** build Option B for the `matches` SELECT exposure (item #23) — fully designed, nothing left to scope, just implement.

**Process note:** this session ended as the conversation approached Claude Code's auto-compact context limit. The next session will begin as a new chat with Claude — no memory of this conversation's turn-by-turn history carries over automatically, so anything load-bearing from tonight needs to live in this file (or the other CLAUDE-*.md docs), not just in the prior chat transcript.

---

## Session Log — July 26-27, 2026

### Item #23, Option B — mostly complete, one dependency chain opened up

Built and verified: match-view-token.js, match-view-lookup.js,
checkMatchToken() rewritten to use ?t=TOKEN instead of ?match=ID, all six
matchUrl-minting call sites (initial invite emails, edit/cancellation
notices, efSendInvites, nudgePendingPlayers, both waitlist-promo fallback
sites) retrofitted to mint per-recipient tokens with '' fallback on mint
failure (no dead ?match=ID links ship on failure). All changes verified via
fresh Read after each edit, node --check clean throughout. STAGED, NOT
COMMITTED.

Mid-implementation, found match-view-token.js has zero authorization check —
anyone can mint a token for any matchId with no verification of a real
relationship to that match (narrower exposure than the original SELECT gap,
but same shape: guess an ID, get data back). Also found match-view-token.js
performs no existence check on matchId before minting (open write /
action_tokens table-fill vector, separate from the read-exposure issue).

This blocks Option B from being called fully closed. Fix design (confirmed
via investigation, not yet built): two paths, since 8 call sites split into
3 trust categories —
  Path A (6 call sites, authenticated app.js session): verify caller via
    new functions/_shared/verify-caller.js (see below), check email is
    either matches.organizer_email or has a match_responses row for that
    matchId.
  Path B (2 call sites, match-invite.html/waitlist-promo.html, no app
    session): pass along the already-resolved match_invite/waitlist_promo
    token as proof, verify server-side via resolveActionToken().

### Mission Critical Item #1 — COMPLETE

functions/_shared/verify-caller.js written: resolves Authorization header to
a verified email via Supabase's /auth/v1/user (GoTrue), never trusts a
client-claimed email. Confirmed via live testing against real tokens: 200
response has `email` at top level, non-200 means invalid full stop (no
independent JWT/exp decode needed — GoTrue already does this server-side).
Fails closed on missing header, invalid token, and network error. Tested
against: no header (null, correct), garbage token (null, correct), real
valid token (correct email returned, exact match).

Deployment gap found and fixed: SUPABASE_ANON_KEY was not configured as a
Cloudflare Pages env var in either Production or Preview — added to both
this session. Without this the function would have failed closed in
deployment (safe direction, but silent).

### Item #2 (next session's starting point) — build Path A/B into
match-view-token.js and match-view-lookup.js using verify-caller.js, per the
design above. Then update all 8 call sites to pass the right proof. Then
re-verify #3.

### Item #3 (not started) — audit match-invite-token.js and
waitlist-promo-token.js for the same open-mint gap match-view-token.js had
— they were the template it was built from, may share the issue.

### New bug found during live testing, unrelated to security work — SMS
invite landing page (match-invite.html) doesn't detect a match is already
full before showing "Yes, I'm in!" — submission then fails with a generic
"Link unavailable" error instead of offering the waitlist. The logged-in
app dashboard handles this correctly (shows "Join Waitlist"); only the
standalone SMS-link landing page doesn't. Root cause not yet investigated —
likely in match-invite.html's accept/decline branching and/or
match-invite-respond.js's response handling, neither touched by tonight's
Option B work. Confirmed NOT a regression from tonight's changes (files
weren't touched); appears pre-existing, just not previously exercised by
two sequential responses to the same singles invite.

Confirmed working end-to-end tonight: match creation, initial single accept,
and — notably — full waitlist promotion flow including the new
match-view-token-based "See Match Details" link, tested live with real
users (Lindsy accept -> Lindsy cancel -> Prosper promoted via SMS -> accept
-> magic link -> dashboard shows confirmed, waitlist count updated
correctly on web and mobile).

### Site-wide RLS audit — logged, not started (see prior entry this
session for full prioritized list, Priority 1-3, tables and specific policy
gaps).

### UPDATE — same session, continued: Items #2 and #3 RESOLVED

Both follow-up gaps found during Option B's implementation are now closed,
built, and verified LIVE against production (not just code review):

**Item #2 — match-view-token.js — RESOLVED, deployed (commit 892a974)**
Added Path A (verifyCaller() + organizer-or-participant check) and Path B
(re-resolve the caller's already-proven match_invite/waitlist_promo
response token) authorization, plus a match-existence check, before
minting. Live-tested against production: unauthenticated request for a
real matchId -> 401 "Not authorized..."; fake matchId -> 404 "Match not
found." Both confirm the new logic is genuinely live, not a stale/cached
old build.

**Item #3 — match-invite-token.js and waitlist-promo-token.js — RESOLVED,
deployed (commit 0d77e8d)**
These had NO authorization check at all (worse than #2's original gap —
enabled forged WRITES to real match_responses rows, not just reads: an
attacker could fabricate/overwrite a real player's RSVP, or discover
whether an arbitrary phone number belonged to a registered player).
- match-invite-token.js: now strictly organizer-only via verifyCaller().
- waitlist-promo-token.js: same Path A check as match-view-token.js, plus
  a new check that playerEmail has an actual match_responses row in the
  post-promotion state (response='pending', filled_from_waitlist=true)
  before minting — prevents minting a promo token for an arbitrary email
  never actually promoted.
- All 3 real call sites (app.js:4499, 8362, 8553) updated to send
  Authorization: 'Bearer '+SUPABASE_ACCESS_TOKEN.
Live-tested against production: unauthenticated requests to both
endpoints with arbitrary phone/email -> 401 "Authentication required."
in both cases. Fix confirmed live.

**Item #23 / Option B — now fully closed**, including both follow-up gaps
discovered during its own implementation.

**Still open, unchanged from earlier this session:** the SMS full-match
waitlist bug (match-invite.html doesn't detect a full match before
showing "Yes, I'm in!"), and the full site-wide RLS audit list
(Priority 1-3, logged earlier this session).

---

### Priority 1 RLS — investigation complete, no fixes applied yet

Full audit source (was previously only in chat history, not in this file
— corrected now): pg_policies query run manually in Supabase SQL editor
(CC cannot query pg_policies directly — PostgREST doesn't expose system
catalogs; any future re-verification of live policies requires running SQL
in the Supabase editor and pasting results back to CC, not assuming CC can
self-check).

**player_feedback** — anon_all (ALL) has no found legitimate write
dependency (submitPostMatchFeedback always self-attributes reviewer_email).
ONE OPEN UNKNOWN before fixing: fetchPlayerStats() does a cross-player SELECT
(reviewed_email=in.(...)) with no self-scoping — whether this currently
depends on anon_all vs. an already-adequate scoped policy is NOT confirmed;
requires a live pg_policies re-check (exact USING clause on the
non-anon_all SELECT policy) before dropping anon_all.

**registrations** — INSERT side ("Allow public inserts", true) has no
legitimate dependency, safe to narrow to email=auth.email() only. SELECT
side ("Authenticated users can read registrations", true) CANNOT simply be
narrowed — loadCommunitySnapshot() (~app.js:11077) is a real, live feature
that bulk-reads every registrant in a state (email, skill_level, gender,
lat, lon) with no relationship/roster scoping, for a distance-based
community view. RLS is row-level, not column-level, so a "safe" columns
answer isn't expressible as a simple policy fix. Real fix: route this
feature through a dedicated view/Function exposing only the needed
non-sensitive columns (excluding phone, age_range, waiver fields),
replacing the direct base-table read. This is real design work, not a
one-line policy change.

**match_results** — anon_all (ALL) has no found legitimate write
dependency (srConfirmGame(), saveWalkOnMatch() both self-attribute
recorded_by). BUT: zero server-side authorization exists today anywhere —
every write/read path only checks caller identity/relationship
CLIENT-SIDE, not via RLS. Dropping anon_all with no real replacement
policy would leave this table with no authorization at all (either fully
locked or fully open depending on what remains) rather than a functioning
authorized-participant model. A real fix needs a genuine scoped policy
(e.g. organizer_email match or match_responses participation), not just
policy removal.

**Structural finding**: no admin/staff role concept exists anywhere in
this codebase (confirmed via repo-wide grep). is_organizer is
reporting-only per CLAUDE-SCHEMA.md's June 2026 note — all registered
members already have full "organizer" UI access. Relevant for any future
access-control design.

**Not yet fixed — next session's starting point**: none of the above has
been changed. Recommend, in order: (1) live pg_policies re-check to
resolve player_feedback's open unknown, (2) design the registrations
community-snapshot view/Function, (3) design match_results' real
authorization policy, (4) THEN drop the anon_all/overly-broad policies
with real replacements in place, verified live same as items #2/#3.
