# CLAUDE.md — PBallConnect Reference

_Last updated: May 17, 2026_

---

## Related Documentation
- [CLAUDE-RULES.md](CLAUDE-RULES.md) — all 50 numbered coding rules
- [CLAUDE-SCHEMA.md](CLAUDE-SCHEMA.md) — full database schema, architecture patterns, feature behavior specs, UI patterns
- [CLAUDE-SMS.md](CLAUDE-SMS.md) — SMS infrastructure and match invite SMS system architecture

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
| `functions/api/send-email.js` | — | Cloudflare Pages Function for transactional email via Resend. IP rate-limited (5/hr) via `RATE_LIMIT_KV`. |
| `functions/api/send-sms.js` | — | Cloudflare Pages Function for SMS via Twilio. Consent-gated (`sms_opt_in` required), three-tier rate limited (player/match/global via KV), logs all attempts to `sms_log`. Always returns 200 — SMS errors never crash callers. |
| `functions/api/twilio-webhook.js` | — | Receives Twilio STOP/HELP/START keyword callbacks. Validates X-Twilio-Signature (HMAC-SHA1), syncs `sms_opt_in` in Supabase, logs to `sms_log`. |
| `functions/api/sms-register.js` | — | Handles SMS-invite registration: validates token, creates Supabase auth user (no email sent), saves registration row, auto-approves IC connection, returns sign-in URL. |
| `functions/api/match-invite-token.js` | — | Generates a signed HMAC-SHA256 token for match invites. Accepts `{ matchId, inviteePhone, inviteeName, organizerEmail }`, returns `{ token, signature, url }`. Uses `MATCH_INVITE_SECRET`. |
| `functions/api/match-invite-lookup.js` | — | Validates a match invite token + signature, checks expiry, returns invitee registration status and match details. Called by `match-invite.html` on load. |
| `functions/api/match-invite-respond.js` | — | Records a YES/NO response to a match invite via HMAC token. Upserts `match_responses`, updates `invites` row by `match_id` + `invitee_phone`. |
| `functions/api/match-invite-sms-data.js` | — | Server-side lookup of `phone` and `sms_opt_in` for a player by email using `SUPABASE_SERVICE_KEY`. Keeps sensitive fields off `public_profiles` and out of the client. |
| `functions/api/log-sms-consent.js` | — | POST endpoint for TCPA consent audit logging. Validates body, inserts to `sms_consent_log` via `SUPABASE_SERVICE_KEY`. Returns 200 always — callers must not block on consent log failures. |
| `match-invite.html` | — | Standalone mobile-first RSVP page for SMS match invites. Three states: (1) registered player — YES/NO buttons; (2) unregistered YES — mini registration form; (3) unregistered NO — warm decline + sign-up pitch. No app.js dependency. |
| `functions/api/waitlist.js` | — | Cloudflare Pages Function for waitlist form submissions. IP rate-limited (3/hr), Turnstile-verified, saves to `waitlist` table via service role key, sends confirmation email via Resend. |
| `supabase_rls_policies.sql` | — | RLS policy definitions + waitlist table DDL — run in Supabase SQL editor after schema changes |
| `manifest.json` | — | PWA manifest (also injected inline at runtime in app.js) |
| `icon-512.png`, `icon-192.png` | — | PWA home screen icons |
| `apple-touch-icon.png` | — | iOS home screen icon |
| `favicon-32.png` | — | Browser tab favicon |

> **FUTURE:** When ready to make `landing.html` the root page: rename `index.html` → `app.html`, rename `landing.html` → `index.html`, update `_redirects` accordingly.

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

4. **Create Group: Mixed gender count may not update correctly in all cases.** `buildGroupSummaryGrid()` uses a case-insensitive email Map for gender lookup — verify that IC_MEMBERS gender fields are consistent across all IC members after the fix.

**Resolved (do not re-introduce):**
- ~~`invites` table RLS INSERT policy missing~~ — policy added in Supabase; invites now write correctly
- ~~`invite_token` missing from INSERT payload~~ — client-side token generated via `crypto.getRandomValues` and included in payload
- ~~`+` addressed Gmail accounts blocked by silent filter in `sendEmail()`~~ — filter removed; only `@example.com` and `@test.com` are blocked
- ~~`icPostPendingConnection()` 409 Conflict on duplicate~~ — handled with `resolution=ignore-duplicates`
- ~~`sendEmail()` missing `return` keyword~~ — fixed; function now returns the fetch response
- ~~IC connection stays `pending` after new user accepts invite~~ — original row now PATCHed to `approved`; reciprocal row created as `approved`; `inviteMutualOverlay` with broken requester logic removed
- ~~Duplicate invite cards in incoming requests view~~ — `loadIcPending()` deduplicates by `requester_email` before rendering
- ~~"Welcome back" shown on first login~~ — per-email `localStorage` flag (`pb_welcomed_<email>`) distinguishes first vs. returning logins
- ~~Full Profile button doing nothing on registration choice screen~~ — `startNewRegistration` now sets `_newUserRegistrationStarted = true` on first call; dual auth events (both `onAuthStateChange` and `getSession()` fire on magic link arrival) no longer stack two overlays
- ~~IC tab shows 0 on arrival from dashboard~~ — fixed by syncing counts in `showIcSection()`
- ~~+ Add to my IC showing for existing IC members in outbound accepted group~~ — removed from that group
- ~~Duplicate courts in nearby list~~ — `normalizeCourtName()` fuzzy match + double-dedup applied
- ~~Level grid column headers showing raw diff ranges (`< 3.88`, `3.88 – 4.13`) instead of IC Level Structure labels~~ — fixed in `buildGroupInviteGrid()` and `buildSmInviteGrid()`; now shows `.5+ Below My Level` / `.25 Below My Level` / `My Level` / `.25 Above My Level` / `.5+ Above My Level` with `≤/≥` reference values at 0.25 increments
- ~~Emergency Fill overwrote `IC_MEMBERS` with flat objects when IC data was fetched on demand~~ — fixed by using local `_efMemberFlat` variable; `IC_MEMBERS` global is never written to by Emergency Fill. See Rule 47.

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
- [ ] **Staging environment configured** — test Twilio flows before upgrading to Pay-as-you-go
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
22. **Staging environment** — configure a staging branch/deployment on Cloudflare Pages before upgrading Twilio to Pay-as-you-go.

---

## Admin Registration Alerts

An alert email fires to `david@pballconnect.com` on every new player registration, regardless of path. Three code paths:

| Path | Function | Location |
|---|---|---|
| Full profile | `doSaveProfile()` | `app.js` |
| Quick Connect | `_qcSave()` | `app.js` |
| SMS invite | `sms-register.js` | `functions/api/sms-register.js` |

Email includes: player name, email, registration path, skill level, zip code, gender, `sms_opt_in` status, and UTC timestamp. Always `await sendEmail()` in `try/catch`. Never fire-and-forget. See Rule 50.

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
