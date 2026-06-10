# CLAUDE.md — PBallConnect Reference

_Last updated: June 10, 2026_

---

## Related Documentation
- [CLAUDE-RULES.md](CLAUDE-RULES.md) — all 56 numbered coding rules
- [CLAUDE-SCHEMA.md](CLAUDE-SCHEMA.md) — full database schema, architecture patterns, feature behavior specs, UI patterns
- [CLAUDE-SMS.md](CLAUDE-SMS.md) — SMS infrastructure and match invite SMS system architecture
- [CLAUDE-FLOWS.md](CLAUDE-FLOWS.md) — all user flow definitions, regression checklist

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

5. **Bug C — phone/link invite paths: IC connection never established.** `icPostPendingConnection()` stores `pending_TOKEN` as a placeholder `recipient_email` for phone and link invite paths (no recipient email known at invite time). `handlePostRegistrationInvite()` PATCHes `connections` where `recipient_email = newPlayerEmail` — this matches zero rows for the placeholder. The IC connection is never approved for these paths. Email invite path works correctly (recipient email is known at invite time). Fix required before phone/link invite paths are reliable.

6. ~~**Goal rating slider track fill not rendering**~~ — fixed May 31. See Resolved list.

**Resolved (do not re-introduce):**
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
16. ~~**Emergency Fill screen**~~ ✅ — organizer tool built; see CLAUDE-SMS.md Emergency Fill Screen section.
17. ~~**Verify: organizer SMS on player cancellation**~~ ✅ — verified with a verified Twilio number: drop a player, organizer receives SMS notification, `sms_log` shows `event_type:'player_dropped'`.
18. ~~**Verify: match time in cancellation notification email**~~ ✅ — confirmed organizer notification email includes match time; `send-email.js` `match_update` template verified.
19. ~~**Consent log Part 2**~~ ✅ — `doSaveProfile()` and `_qcSave()` both call `POST /api/log-sms-consent` on opt-in. All three registration paths now write to `sms_consent_log`.
20. ~~**Fix stray Send Invites button in Step 4 of Set Up a Match wizard**~~ ✅ — `smInviteContinueBtn` removed from `buildSmInviteGrid()`; real send button is `matchSendBtn` in the sticky progress bar.
21. ~~**End-to-end SMS invite test**~~ ✅ — full flow verified with a verified Twilio number: organizer sends match invite → SMS delivered → recipient RSVPs → `match_responses` updated → `invites` row updated.
22. ~~**Staging environment**~~ ✅ — staging branch/deployment configured on Cloudflare Pages.

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
5. Deploy: `git push --force origin main` → Cloudflare Pages auto-deploys. The **pre-push hook** amends HEAD to inject the build badge hash into `version.json` — this rewrite requires `--force`. Never use `--force-with-lease` (it rejects the amended push). Never put a `git push` call inside the pre-push hook itself (causes infinite loop).
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

### Session learnings — May 16, 2026

Claude Chat must proactively identify compliance gaps without waiting to be asked. When a feature involves legal or financial exposure — SMS, TCPA, data privacy, consent records — Claude Chat must think three steps ahead and flag issues before they become problems. Examples from this session that should have been caught proactively:

- **`sms_opt_out_at` timestamp** — when `sms_opt_in_at` was added, the matching opt-out timestamp should have been specified in the same instruction without the user asking.
- **Supabase SQL must always be listed FIRST** in any instruction that requires a schema change — Claude Code cannot run SQL, only the user can. If the column does not exist when the code tries to write to it, the insert fails silently. Format is: _"Do this in Supabase SQL Editor FIRST before Claude Code touches any code."_
- **Verification steps must always follow every significant change** — Layer 1 (Supabase dashboard), Layer 2 (live functional test), Layer 3 (SQL query). Always specify all three layers explicitly in the instruction.
- **When a session runs long, precision degrades.** If context is running low, say so and recommend starting a fresh session rather than continuing with reduced accuracy.

Instruction format reminders:

- SQL schema changes always listed first with explicit "Do this in Supabase SQL Editor FIRST" heading
- Verification steps always included at the end of every instruction
- Never ask the user to dig through Network tabs or DevTools unless absolutely necessary — add `console.log` via Claude Code instead
- Always include `node --check app.js` and `git push --force origin main` at the end

### Session learnings — May 17, 2026

- **Break long Claude Code instructions into Part 1 and Part 2 proactively.** Never let a single instruction exceed what the chat window can transmit cleanly. If implementation spans more than ~3 functions or 2 files, split it before sending.
- **Call for a fresh Claude Code session at 20% context remaining** — not at 7%. Precision degrades before the context limit is reached. Start fresh early enough to re-brief cleanly.
- **Always confirm each part is complete and pushed before sending the next part.** Never queue Part 2 until Part 1 is verified (node --check passes, push confirmed, live behavior tested).
- **Fire-and-forget `sendEmail()` and `fetch()` calls keep reappearing.** Before accepting any new implementation, explicitly check every `sendEmail()` and outbound `fetch()` call for `await` and `try/catch`. This is a recurring pattern — do not assume it was done correctly without checking.
- **`doSaveProfile()` — SMS opt-in flag is `_smsOptIn`, not `S.smsOptIn`.** `_smsOptIn` is a local variable computed at ~line 1168 (`_phoneDigits.length === 10 && !!(smsOptIn checkbox checked)`). `S.smsOptIn` does not exist. Use `_smsOptIn` in any future edits to this function.
- **When investigating a stray or misplaced button, check `onclick` before trusting the label.** `smInviteContinueBtn` was labeled "Send Invites →" but its `onclick` was `_smInviteContinue()` which only called `smUpdateProgress(5)` and scrolled to the next step — a Continue button, not a send. The comment in the code even said "Continue button." Read what the button does, not what it says.
- **`_qcSave()` — SMS opt-in flag is `_qcSmsOptIn`; player email is `email.toLowerCase()`; consent log method is `'quick_connect'`.** `_qcSmsOptIn` is a local variable computed at ~line 11453 (`ph.length === 10 && !!(qcSmsOptIn checkbox checked)`). Player email comes from the outer closure variable `email` — use `email.toLowerCase()`, not `S.email` or `v('email')`. Consent log `method` field must be `'quick_connect'`, not `'registration'`.

### Session learnings — May 20, 2026

**Schema changes:**
- **`dob` renamed to `age_range`** in `registrations` — stores bucket strings like `'41-45'`, not a date of birth. Actual DOB not collected (PII concern). `age_range` is the authoritative column name everywhere — `dob` is gone.
- **`schedule` column dropped** from `registrations` and removed from `public_profiles` view — replaced by `avail_*` booleans. All dead code (`toggleCell`, `toggleColumn`, `toggleDay`, schedule IIFE, `S.schedule`, `schedStr`, `schedule:` write) removed from `app.js` and `index.html`.
- **`avail_weekday_morning/afternoon/evening`, `avail_weekends`** — DB columns kept, UI removed to reduce registration friction. `doSaveProfile()` still writes `false` for all four on every save. Restore UI when match scheduling logic is built.

**Bug fixes:**
- **Base64 phone encoding in `_qcSave()`** — `encodePhone(ph)` replaced with `ph || null`. `decodePhone()` left in place to handle existing encoded rows gracefully.
- **Duplicate IC request cards** — removed redundant `loadIcPending()` call in `showIcSection()`; added `_icPendingLoading` in-flight guard with `finally` block. Root cause was two concurrent async calls racing on `list.innerHTML`.
- **Stray Send Invites button in Step 4** — `smInviteContinueBtn` removed from `buildSmInviteGrid()`.
- **160-character SMS limit removed** — `send-sms.js` no longer caps message length; Twilio handles multipart SMS automatically.
- **Age range selector** — individual year options (18–25) replaced with uniform `'18-25'` bucket in both `index.html` (`#playerAge`) and Quick Connect form in `app.js`.

**SMS pipeline status:**
- End-to-end flow verified and working — token signed, SMS sent, Twilio accepted.
- Blocked only by Twilio trial mode (Error 30034 — A2P 10DLC unregistered number).
- Fix: upgrade Twilio to Pay-as-you-go + complete A2P 10DLC brand registration (~$4 one-time) and campaign registration (~$15 one-time + ~$10/month) before launch.

**TCPA consent log — all three paths confirmed wired:**
- `doSaveProfile()` — method: `'registration'`, flag: `_smsOptIn`
- `_qcSave()` — method: `'quick_connect'`, flag: `_qcSmsOptIn`, email: `email.toLowerCase()`
- `sms-register.js` — method: `'sms_invite'`

**Database cleanup:**
- 19 fake/test registrations deleted; 78 `match_responses` and 7 `connections` rows removed.
- **`connections` table** — correct column names are `requester_email` and `recipient_email`. NOT `player_email` or `connection_email`. CLAUDE-SCHEMA.md corrected. Do not revert.
- **`player_group_members`** — correct column is `player_email`. Confirmed in Supabase.

**Pre-launch checklist additions:**
- Upgrade Twilio trial → Pay-as-you-go before any production SMS.
- Complete A2P 10DLC brand registration (~$4 one-time) and campaign registration (~$15 one-time + ~$10/month).
- Configure and verify staging environment on Cloudflare Pages before Twilio upgrade.

**UI simplification decisions:**
- Availability toggles removed from profile registration form — too much friction for onboarding. DB columns preserved for future match scheduling logic. Do not re-add until match scheduling requires them.
- `schedule` field fully removed — dead code, superseded by `avail_*` booleans (which are themselves hidden for now).

### Session learnings — May 24, 2026

**Organic signup gate:**
- **`join.html` created** — standalone gate page (no app.js/styles.css dependency). Uninvited first-time users are redirected here from `doLogin()` when: `isNewUser === true` AND no `?invite=` or `?qr=` in URL AND `PENDING_INVITE === null`. Four pre-screen fields: email, skill slider, playing since, age range. Cloudflare Turnstile bot protection (same sitekey as `landing.html`).
- **sessionStorage pre-population** — `join.html` stores `organic_email`, `organic_skill`, `organic_playing_since`, `organic_age_range`, `organic_source='organic'` before sending the magic link. `emailRedirectTo` points to `https://pballconnect.com/?organic=1`. After auth, `startNewRegistration()` reads these keys, pre-populates the registration form via DOM + `S.*` + `updatePersonalRating()`, then clears the four field keys. `organic_source` is intentionally kept until `doSaveProfile()` reads and clears it.
- **`invite_source` column** — added to `registrations` table with CHECK constraint `('organic','qr','token','sms')`. Run in Supabase SQL Editor: `ALTER TABLE registrations ADD COLUMN invite_source text CHECK (invite_source IN ('organic','qr','token','sms'));`. `doSaveProfile()` derives the value at save time: checks `sessionStorage.organic_source` first (organic path), then `PENDING_INVITE.invite_type`/`invite_token` (invited paths), defaults to `'organic'`.

**Admin alert enhanced:**
- Organic signups get 🚨 subject prefix: `"🚨 Organic Signup — [Name]"`. Invited signups keep existing format.
- `personal_note` now includes `Invite Source` and `Age Range` fields on all full-profile registrations.

**IC invite section relabeled (May 24):**
- `index.html` line 1256: `"Requests to Join Your Circle"` → `"Inner Circle Invites to Me"`.
- Subtitle updated to `"These players have invited you to their Inner Circle."` — reflects that the section shows invites the current user received, not requests they sent.

**Post-registration redirect to IC page:**
- After accept/decline in `handlePostRegistrationInvite()` → `showStep2()`, app now navigates to `showPage('innerCircle')` then `setTimeout(() => showIcSection('requests'), 400)`. Fires for both Yes and No.
- `doSaveProfile()` new-user path: `handlePostRegistrationInvite()` delay extended from 1500ms → 2500ms.
- `_qcSave()`: captures `_hadPendingInvite = !!PENDING_INVITE` before calling `handlePostRegistrationInvite()`. If true, navigates to IC requests tab instead of dashboard (welcome toast skipped).

**Known open bug logged (Bug C):**
- Phone and link invite paths store `pending_TOKEN` as placeholder `recipient_email` in `connections`. `handlePostRegistrationInvite()` PATCH matches zero rows for these paths — IC connection is never established. Email invite path is unaffected. Do not attempt to fix by reusing `handlePostRegistrationInvite()` — requires a separate lookup strategy at registration time.

### Session learnings — May 30, 2026

**doLogin() gate removed (critical bug fix):**
- The pre-auth `registrations` check used `SUPABASE_ACCESS_TOKEN` which equals `SUPABASE_ANON_KEY` before login. RLS silently returns HTTP 200 with `[]` for anon queries — not a 403. This caused `isNewUser = true` for all existing users, redirecting them to `join.html`. The fix: `doLogin()` now sends the magic link unconditionally for any valid email. New vs. existing user routing happens in `onAuthStateChange` → `restoreSession()` where a real session token satisfies RLS. **Do not re-add any pre-auth DB check to `doLogin()`.**
- The May 24 session note about `doLogin()` redirecting to `join.html` is superseded. `join.html` is now reached only via the "Join PBallConnect" banner button.

**`organic_signups` table created in Supabase:**
- Stores pre-screen data (email, skill_level, playing_since, age_range) keyed by email. `/api/organic-signup.js` Pages Function handles GET, POST, and DELETE. Used to persist join.html pre-screen data server-side so it survives the magic link redirect back to the app.

**Beta banner rebuilt:**
- Three-button layout: "Join PBallConnect" (→ `/join.html`), "Ask a member" (→ `/invite.html`), "Notify me at launch" (→ `/landing.html#waitlist`). Replaces old two-button layout.
- `icon-192.png` logo replaces emoji in banner header.
- Banner now fires synchronously with `showPage('welcome')` — no more 1500ms flash. `maybeShowBetaBanner()` converted from async (removed `getSession()` call) to synchronous, called directly after `showPage('welcome')` in `initApp()`.
- `?reset_banner=dev` clears the `pb_beta_banner_seen` localStorage flag for testing.

**Supabase redirect URLs updated to wildcards:**
- `https://pballconnect.com/*` and `https://pickleball-registry.pages.dev/*` added to the Supabase Auth allow list to support all magic link return paths.

**Dashboard button suppressed during new user registration:**
- `_newUserRegistrationStarted` gate added to `showBackToDashboard()` — back-to-dashboard button does not appear while a new user is mid-registration.

**Sign In button hidden during registration:**
- `#navLoginBtn` hidden in `startNewRegistration()`, restored in `doSaveProfile()` and `_qcSave()`. Prevents a logged-in new user from opening the login modal mid-flow.

**Mobile scroll fix:**
- `#profileStickyHeader` set to `position:relative` on mobile to fix iOS touch-scroll dead zone caused by `position:sticky` interacting with the iOS scroll container.

**Known issue — gender data migration pending:**
- Run in Supabase SQL Editor before any gender-based matching logic is used: `UPDATE registrations SET gender='Man' WHERE gender='Male'; UPDATE registrations SET gender='Woman' WHERE gender='Female';`. Users with `null` gender need outreach or a login-time prompt.

**Known issue — organic pre-population needs live test:**
- ~~Age range dropdown mismatch suspected~~ — confirmed matching (May 31). Root cause was `id="lbl3\"` crashing `goTo()`. All 4 fields pre-populate correctly end-to-end. Debug console.log removed.

**Database cleanup completed (May 30):**
- 16 test/incomplete accounts deleted from all related tables: `sms_consent_log`, `sms_log`, `match_responses`, `player_group_members`, `invites`, `connections`, `matches`, `organic_signups`, `registrations`. 6 clean accounts remain.
- **Gender migration completed** — `'Female'` → `'Woman'`, `'Male'` → `'Man'` normalized across `registrations`. Known Bug #6 resolved.
- **`invites` table schema correction** — the inviter column is `inviter_email`, not `organizer_email`. Update any query or code that references `organizer_email` on the `invites` table.

### Session learnings — May 31, 2026

**Organic pre-population — verified working:**
- Root cause of pre-population failure: `id="lbl3\"` in `index.html` (backslash before closing quote on `lbl3` span) caused `goTo()` to crash with a null dereference before the pre-population IIFE ever ran. Fixed to `id="lbl3"`.
- DELETE ordering fixed in `startNewRegistration()` — server DELETE (`/api/organic-signup` POST with `{ delete: true }`) now fires after all 4 DOM writes via `_needsServerDelete` flag, not before.
- Silent fetch failures now log `[organic] server fetch failed:` with status + body to the console. Network errors also logged.
- All 4 fields (email, skill, age range, playing since) confirmed pre-populating correctly end-to-end.

**Slider tick marks fixed:**
- `buildGoalTicks()` updated to use `calc(11px + ratio * (100% - 22px))` — same formula as `buildStaticSliderTicks()`. Thumb radius is 11px (22px wide thumb per CSS).
- Goal rating thumb label (`goalThumbLabel`) and ✕ marker (`goalRedLabel`) positions also corrected with the same formula — they were using raw `pct%` which misaligned by up to 11px at range extremes.

**"Both" chip defaults fixed:**
- Play Format, Match Type Preference, Venue Preference, Play Style all initialize with full "Both" active state on `DOMContentLoaded`: all siblings get `.on` class, the Both chip gets dark red styles (`background:#991b1b`), matching exactly what `selChip()` does when Both is tapped.

**Goal rating slider track fill — root cause found and fixed:**
- `updateGoalRedBar()` bailed at `if(!redBar) return` because `goalSliderRedBar`, `goalSliderGreenBar`, and `goalRedLabel` were never in `index.html`. Added as empty `position:absolute` divs inside the `position:relative` slider wrapper before the `<input>` (so slider thumb stays on top in stacking order).
- Bar styles: `top:50%; transform:translateY(-50%); height:6px` — vertically centered on the 6px track regardless of browser-rendered input height.
- Colors: red bar `#dc2626` (floor below personal rating), blue bar `#2563eb` (goal range above personal rating). JS in `updateGoalRedBar()` drives `width`, `left`, `borderRadius` dynamically.

**Slider tick timing fixed:**
- `buildStaticSliderTicks` was called at `DOMContentLoaded` before the profile section was visible — sliders had zero layout width, so ticks rendered at position 0. Moved all three tick builds (`duprTicks`, `personalRatingTicks`, `buildGoalTicks(0)`) to the end of `unlockProfileForm()`, which fires after `showPage('playerProfile')`.
- `buildGoalTicks(0)` now called at form unlock so goal ticks render immediately (all grey, no personal rating set yet) without requiring the user to touch the slider first.

**Privacy policy updated (May 31):**
- SMS Notifications section added with full TCPA-compliant language: STOP/HELP opt-out, message frequency disclosure, "message and data rates may apply."
- Stale "Play schedule" row removed from What We Collect table — field was dropped from the DB in May 2026.
- Phone storage description corrected: "encoded before storage" → "stored as plain text digits and used only for SMS notifications you have explicitly opted into."
- Email vendor corrected: EmailJS → Resend.
- Last updated changed to May 2026.

**Registration form collapsed from 3 steps to 2 (May 31):**
- Step 1 combines Personal Info + Player Profile as one scrolling form. Step 2 is Waiver only.
- Progress indicator: 3 dots → 2 dots ("Profile" → "Waiver"). `dot3`, `lbl3`, `line2` removed from HTML.
- `next1` button removed. `next2` is the single Continue → `goTo(2)`.
- `chk1()` now validates all required fields in one pass: `firstName` + `email` + `phone` + `gender` + `playingSince` + `personalRating > 0`. Gates `next2`.
- `chk2()` delegates to `chk1()` — all 8 existing call sites unchanged.
- `goTo()` iterates `[1,2]` instead of `[1,2,3]`; `populateSummary` gates on `n===2`.
- `lockProfileForm()` / `unlockProfileForm()` iterate `['step1','step2']`.
- Waiver Back button updated: `goTo(2)` → `goTo(1)`.
- `clearForm()`: stale `next1.disabled` reference removed.

**`join.html` skill slider styled (May 31):**
- Added `-webkit-appearance:none`, green fill via `--pct` CSS variable, circular white/green thumb matching the app's slider style. `jBuildSkillTicks()` builds 22-stop tick marks using `calc(11px + ratio * (100% - 22px))`. All self-contained — no app.js or styles.css dependency.

**Privacy policy link audit (May 31):**
- `landing.html` line 624: `href="/index.html#page-privacy"` — links to a hash fragment that won't work (page-section is hidden until `showPage()` fires). **Needs to change to `href="/privacy.html"`.**
- `join.html`: no privacy policy link anywhere. **Needs a footer link.**
- Inline `#page-privacy` in `index.html` is out of sync with `privacy.html` — needs the same 5 updates applied to `privacy.html` (SMS section, "currently" qualifier on payment statement, play schedule row removed, phone encoding corrected, EmailJS → Resend).
- Correct links confirmed: waiver consent in `index.html` (line 729) → `privacy.html` ✓; Quick Connect consent in `app.js` (line 11237) → `privacy.html` ✓.

**Confirmed working (May 31):**
- `join.html` skill slider — styled, ticks aligned, green fill ✓
- 2-step registration collapse — complete and working ✓
- Organic pre-population — verified end-to-end ✓

### Session learnings — June 8, 2026

**`is_organizer` gating removed — all members are organizers:**
- Decision: every registered member gets full organizer access. No self-selection, no founder promotion flow.
- Removed from app.js: `S.isOrganizer` state var, `restoreSession()` assignment, chip restore, `doSaveProfile()` payload, `smLoadGroupSelect()` early return, `injectNamedGroupOptions()` hide check, all opacity/pointer-events gating in `updateNavForUserType()`, `isOrg` condition in `updateOrganizerNav()`.
- Removed from app.html: `isOrganizerChips` chip group and hint text from Step 1 of registration form.
- DB column retained for back-office reporting. SQL run: `UPDATE registrations SET is_organizer = true WHERE is_organizer = false`.
- `organizer_email` on matches table is unrelated — do not confuse with `is_organizer` flag.
- See Rule 55.

**Registration flow regressions fixed (June 8, 2026):**
- Root cause: `const _isNewRegistration = !SESSION_PLAYER` declared inside `try{}` — silent ReferenceError after save. Fixed: declared before `try{}`. See Rule 54.
- No-invite path: `showFoundingMemberOverlay` callback now hides `confirmOverlay` and calls `showPage('dashboard')` directly when `!PENDING_INVITE`.
- `handlePostRegistrationInvite()` → changed `showPage('innerCircle')` to `showPage('dashboard')`.
- `confirmOverlay` button copy updated to "Taking you to your dashboard..."
- Beta banner: "Sign In" moved to full-width green button at TOP of stack above join CTAs. Email pre-fill added to login modal from `localStorage.pb_email`.

**CLAUDE-FLOWS.md created:**
- 11 flows documented: email IC invite, QR invite, link/text invite, existing user, returning member new device, post-registration success, SMS match invite, Can't Make It drop flow.
- Includes global state variable reference table and regression prevention checklist.
- Must be updated any time a flow chain function is modified.

**Reciprocal IC connection bug fixed (June 10, 2026):**
- Bug: when a new user accepted an IC invite during registration, the reciprocal connection row was created as `status='approved'` — counting in the inviter's "My IC" without their consent.
- Fix: app.js line 11754 — reciprocal row now created as `status='pending'`.
- Flow: inviter sends → pending. Invitee accepts → original row approved, reciprocal row pending. Inviter accepts reciprocal → both sides approved. True mutual consent on both sides.
- Tile counts were already correct — `loadInnerCircle()` filters approved only, `loadIcPending()` filters pending inbound only. No tile count changes needed.
- See CLAUDE-FLOWS.md Flow 1 step 18.

**SMS registration reciprocal connection fixed (June 10, 2026):**
- Bug: `sms-register.js` was creating the reciprocal connection row as `status='approved'` — bypassing organizer consent entirely. Both sides showed My IC = 1 with no invite flow.
- Fix: `sms-register.js` line 205 — `status:'approved'` → `status:'pending'`. SMS path now matches email path exactly.
- `_syncIcSentCount()` reads sent count from `connections` table directly — no `invites` row insert needed for My IC Invites to Others to show correctly.
- See CLAUDE-FLOWS.md Flow 10.

**Re-invite pre-check added to `sendIcEmailInvite()` (June 10, 2026):**
- Before sending an IC email invite, `sendIcEmailInvite()` now queries `connections` for any existing row where `requester_email = SESSION_PLAYER.email` AND `recipient_email = entered email`.
- If an `approved` row exists → toast "They're already in your Inner Circle." and abort.
- If a `pending` row exists → toast "You already have a pending invite to this person." and abort.
- Only if no row exists → proceed with `icCreateSingleUseInvite()` + `sendEmail()`.
- Prevents duplicate invite emails and duplicate `invites` rows. See Rule 56.
