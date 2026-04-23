# CLAUDE.md — PBallConnect Reference

_Last updated: April 22, 2026_

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

---

## File Structure

| File | Size | Purpose |
|---|---|---|
| `app.js` | ~10,500 lines | Entire application: state, rendering, navigation, Supabase calls, feature logic |
| `index.html` | ~2,200 lines | Shell HTML — all `page-*` sections + CDN script tags |
| `styles.css` | — | All styles |
| `invite.html` | — | Standalone invite landing page — no app.js dependency |
| `functions/api/send-email.js` | — | Cloudflare Pages Function for transactional email via Resend |
| `supabase_rls_policies.sql` | — | RLS policy definitions — run in Supabase SQL editor after schema changes |
| `manifest.json` | — | PWA manifest (also injected inline at runtime in app.js) |

---

## Running Locally

```
npx serve .
# or
python -m http.server
```

No tests, no linter, no build commands.

---

## Database Schema

### Key Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `registrations` | Player profiles — primary record, keyed by `email` | `email`, `first_name`, `last_name`, `zip_code`, `city`, `state`, `lat`, `lon`, `skill_self`, `dupr_rating`, `gender`, `age_range`, `play_style`, `is_organizer`, `wants_organizer`, `profile_complete`, `qr_invite_id`, `avail_weekday_morning`, `avail_weekday_afternoon`, `avail_weekday_evening`, `avail_weekends` |
| `connections` | Inner Circle relationships | `player_email`, `connection_email`, `status` |
| `matches` | Match events | `id`, `organizer_email`, `match_date`, `time_start`, `time_end`, `court_id`, `court_name`, `format`, `num_courts`, `gender_pref`, `max_players` |
| `match_responses` | Per-player responses | `match_id`, `player_email`, `response` ('in'/'out'/'pending'/'waitlist') |
| `match_results` / `match_scores` | Recorded scores | — |
| `courts` | Court locations | `id`, `name`, `address`, `is_private`, `court_count`, `lat`, `lon` |
| `player_courts` | Courts a player uses | `player_email`, `court_id` |
| `invites` | App invite links | `invite_token`, `invite_type` ('single'/'qr'), `is_used`, `inviter_email`, `inviter_name`, `invitee_email`, `invitee_name`, `invite_method`, `status` |
| `player_feedback` | Post-match feedback | — |
| `player_groups` | Named groups | `id`, `organizer_email`, `name`, `max_players`, `group_type` ('set'/'random'), `match_type` ('singles'/'doubles') |
| `player_group_members` | Group members | `group_id`, `player_email`, `role` ('primary'/'sub') |
| `recurring_matches` | Recurring schedules | `id`, `organizer_email`, `group_id`, `court_id`, `days_of_week`, `time_start`, `duration`, `auto_invite_hours`, `gap_alert_hours` |

### Views

| View | Purpose |
|---|---|
| `public_profiles` | Player-facing queries — excludes sensitive fields (phone, DOB, waiver data). Exposes `qr_invite_id`. Use for find-players / IC lookups. |
| `invite_tokens` | Anonymous-safe invite link reads |

> **CRITICAL:** `public_profiles` is a VIEW on `registrations`. Never ALTER the view directly. Always `ALTER TABLE registrations` first, then update the view definition in Supabase SQL editor.

---

## Architecture Patterns

### Navigation

`showPage(page)` is the sole navigation function. Toggles `.active` on `.page-section` elements and fires a page-specific loader. Calls `window.scrollTo(0, 0)` on every navigation.

Page IDs: `dashboard`, `playerProfile`, `findPlayers`, `playerStats`, `innerCircle`, `myCourts`, `myGroups`, `lessons`, `myLessons`, `setupMatch`, `confirmedMatches`, `recordScores`, `myInvites`, `invitedByOthers`, `recurringMatches`, `tos`.

Floating "← Dashboard" pill: removed and re-added on every `showPage()` call. Calls `showBackToDashboard()` for all pages except dashboard.

### Auth

Supabase magic link (`_supabase.auth.signInWithOtp`). On sign-in, `restoreSession(email)` fetches the player row from `registrations` and populates `SESSION_PLAYER`. Email persisted to `localStorage('pb_email')`.

Login modal: title "Welcome to PBallConnect", button "Send Magic Link →", success "Check your inbox!"

### Global State

| Variable | Purpose |
|---|---|
| `S` | Registration/form state — location, skills, preferences, availability, consent flags |
| `SESSION_PLAYER` | Authenticated player's DB row. `null` if not logged in. |
| `SUPABASE_ACCESS_TOKEN` | JWT from Supabase auth — included in every REST call |
| `IC_MEMBERS` | Inner Circle array — populated on IC page visit, fetched on demand for modals |
| `_icCurrentView` | Active IC list view: `'alpha'` (default), `'favorites'`, `'grid'` |
| `_groups` | Organizer's named groups — loaded by `loadMyGroups()` and `loadRecurringMatches()` |
| `PENDING_INVITE` | Set by `checkInviteToken()` from `?invite=TOKEN` or `?qr=QR_ID`. Consumed by `startNewRegistration()`. |
| `window._pendingInviteRef` | Parallel reference to `PENDING_INVITE` for inline onclick handlers in dynamic HTML |
| `MS` | Set Up a Match wizard state — `format`, `numCourts`, `selectedCourts`, `genderPref`, `date`, `timeStart`, `timeEnd`, `duration`, `courtId`, `courtName`, `inviteMode`, `hasOverlapConflict`, etc. |

### Supabase Integration

All DB access uses the Supabase REST API via direct `fetch` calls — NOT the Supabase JS query builder.

Every request includes:
```js
headers: {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + SUPABASE_ACCESS_TOKEN
}
```

Supabase join syntax (`table(col,col)`) only works when FK relationships are configured in PostgREST. Use the two-step pattern when joins are unreliable: fetch IDs first, then `?id=in.(...)`.

### Email

`sendEmail({to_email, type, personal_note, invite_url, inviter_name, match_date_str})` in `app.js` calls `POST /api/send-email` (Cloudflare Pages Function).

Email types:
- `app_invite` — white-card template, CTA points to `invite.html?token=TOKEN`
- `match_invite` — dark-card, dynamic subject: "[FirstName] invited you to play pickleball on [Day], [Month] [Date]"
- `match_update` — dark-card
- `match_decline` — dark-card
- `ic_invite` — dark-card

`sendEmail()` is called with `await` in match invite send loops to prevent Resend rate limit drops. Each call wrapped in per-email try/catch with a failure toast.

### Invite Polling

`startInvitePolling()` runs every 30 seconds. Supabase Realtime is not used.

---

## Two-Tier Invite System

### Tier 1 — Single-Use Tokens

- Created by `icCreateSingleUseInvite(recipient, method)` for Text/Email/Copy channel invites
- Token: 20 chars from `crypto.getRandomValues(new Uint8Array(16))`
- Written to `invites` table: `invite_type: 'single'`, `is_used: false`, `invitee_name`, `invitee_email`
- URL: `https://pballconnect.com/invite.html?token=TOKEN`
- On registration: PATCH token row with `is_used: true, status: 'registered'`
- `invite.html` checks `is_used` before showing the card; shows "already used" error if true

### Tier 2 — Permanent QR Tokens

- One per player, stored as `qr_invite_id` on `registrations` (and exposed via `public_profiles`)
- Created lazily by `getOrCreateQrId()` — checks `SESSION_PLAYER.qr_invite_id`, generates via `crypto.getRandomValues` if null, PATCHes `registrations`
- URL: `https://pballconnect.com/invite.html?qr=QR_ID`
- On registration: POST new row to `invites` with `invite_type: 'qr'`, `is_used: true` — original QR row is NOT mutated
- Reset: `resetQrCode()` uses `confirm()` dialog, sets `SESSION_PLAYER.qr_invite_id = null`, calls `getOrCreateQrId()` for a new ID
- `invite.html` does NOT check `is_used` for QR flow — QR tokens are always valid until reset

### `invite.html` Implementation

Handles both flows:
- `?token=TOKEN` — fetches `invites` table directly for `is_used` check; falls back to `invite_tokens` view on RLS failure
- `?qr=QR_ID` — fetches `public_profiles?qr_invite_id=eq.QR_ID`; shows owner name + 📱 QR badge

`_redirectParam` set to `invite=TOKEN` or `qr=QR_ID` for magic link `emailRedirectTo`.

No app.js dependency. Uses `var` + plain function declarations (no ES modules).

### Invite Flow (full)

1. User arrives at `invite.html?token=TOKEN` or `invite.html?qr=QR_ID`
2. Card shown with inviter name, optional personal note, email input
3. Submit → `signInWithOtp` with `emailRedirectTo = https://pballconnect.com/?newuser=1&invite=TOKEN` (or `&qr=QR_ID`)
4. User clicks magic link → lands on pballconnect.com
5. `checkInviteToken()` fires — reads `?invite=` or `?qr=`, sets `PENDING_INVITE`
6. Because `newuser=1`: banner skipped entirely
7. `restoreSession` → no row found → `startNewRegistration(email)`
8. `startNewRegistration` → `showInviteLandingChoice()` (Full Profile or Quick Connect)

`icGetRecipient()` validates the recipient name input before invite creation — red border + `ic-shake` CSS animation if blank.

---

## Registration / Profile

### Step 1 Fields
Email (readonly), First Name, Last Name, Phone, Zip Code (geocodes via Nominatim to city/state/lat/lon)

### Step 2 Fields (in order)
1. Match Type Preference
2. DUPR Rating (with "What's DUPR?" tooltip)
3. Personal Skill Rating
4. Play Style chips (Just for Fun / Competitive / **Both** — Both is default)
5. Goal Rating (shown only when Play Style = Competitive or Both)
6. Age Range
7. Gender
8. Playing Hand (Right / Left only — Ambidextrous removed)
9. Playing Since
10. Availability toggles

### Consent at Registration (dual checkbox gate)

Two separate checkboxes required before Submit:
- `checkBoxTos` — ToS + Privacy Policy agreement (`S._tosConsent`)
- `checkBoxRisk` — Liability Waiver agreement (`S._riskConsent`)

`toggleConsent(type)` gates submit: `S._tosConsent && S._riskConsent` both must be true.

### Removed Fields (do NOT re-add)
- T-Shirt Size
- City / State inputs (replaced by zip)
- Street / Address / County
- Ambidextrous playing hand
- Had a Lesson / Wants a Lesson
- Wants to Improve buttons

### Location (zip-only)
`onZipChange(val)` calls Nominatim at 5+ digits. Stores `S.city`, `S.state`, `S.addrLat`, `S.addrLon`. Hidden `#addrCity` / `#addrState` fields kept for JS compatibility. Status shown in `#zipGeoStatus`.

### Play Style Chips
`selChip(gid, el, key)` via `key === 'playStyle'` branch. Maps: Fun / Competitive / Both → `S.playStyle`.

### Availability
4 toggles: `avail_weekday_morning`, `avail_weekday_afternoon`, `avail_weekday_evening`, `avail_weekends`.
UI: `toggleAvail(key)`, `updateAvailToggles()`.

### Quick Connect
Minimal overlay — email (readonly), first name, phone, zip, skill slider, age, playing since, waivers. Saves to `registrations`. No `quick_connect` column exists — do not add one. Goes directly to dashboard with welcome toast. No organizer question.

---

## Legal Pages

### Terms of Service (`page-tos`)
Full 12-section ToS with NH governing law. Placeholders: `[OWNER NAME / LLC NAME]` and `[YOUR EMAIL ADDRESS]` — leave as-is until LLC is formed. Accessible from nav and from registration consent row.

### Liability Waiver (`waiverModal`)
7-clause legal waiver. Section 2 cites RSA 508:13 (NH recreational activity liability release statute). Includes Print/Save button (`window.print()`).

### Privacy Policy (`page-privacy`)
Last updated: April 2026.

---

## Navigation Structure

### Left Nav Sections
- **MATCHES:** Confirmed Matches, Players Wanting to Play, Recurring Matches
- **ORGANIZER:** Set Up a Match, My Match Invites, My Groups, Recurring Matches _(grayed at 40% opacity for non-organizers)_
- **INNER CIRCLE:** Members, Invite, Requests, Find Players _(no badge numbers)_
- **MY COURTS:** Private (`#navCourtPrivate` / `#navCourtPrivateNum`) + Public (`#navCourtPublic` / `#navCourtPublicNum`) — wrappers hidden when count = 0

`updateNavCourtBadges(publicCount, privateCount)` writes to inner `*Num` spans.

### Organizer Nav Gating (`updateNavForUserType()`)
- `is_organizer=true` → full access
- `wants_organizer=true` (not yet organizer) → 40% opacity, clicking shows Court Captain nudge
- Neither → 40% opacity, clicking shows toast "These tools are for Court Captains"
- Gated items: `setupMatch`, `myInvites`, `myGroups`, `recurringMatches`

### Dashboard Containers
- Matches: "My Match Invites to Others" (orange) + "Match Invites from Others" (blue) — no arrows
- Inner Circle: "My IC" (green), "My IC Invites to Others" (amber), "Others IC Invites to Me" (purple)

### IC Page Navigation
`showIcSection(section)` is the sole IC nav function. Sections: `members`, `invite`, `requests`, `find`.
`showIcView(mode)` is kept for backward compatibility only — delegates to `showIcSection()`.
`loadNearbyPlayers()` is lazy — only fires when `showIcSection('find')` is called.

### IC Member List Views
`switchIcMemberView(view)` — sole toggle. `_icCurrentView` persists across sort/filter.
- `'alpha'` (default) — A–Z compact rows: avatar, name, nickname, skill pill, favorite star. No Play button.
- `'favorites'` — same rows, starred only
- `'grid'` — Level Grid: 5 columns (Far Below / Below / My Level / Above / Far Above), ±0.125 tolerance

---

## Groups

`player_groups` has `group_type` ('set'/'random') and `match_type` ('singles'/'doubles') columns.

**Set groups** — fixed priority roster + sub pool. Organizer controls who plays.
**Random groups** — first-to-respond fills spots. Sub list not shown in modal.

`buildGroupCard(group, members, profileMap)`:
- Gender breakdown uses `m.player_email` (NOT `m.email`) for IC_MEMBERS lookup
- Members not in IC_MEMBERS → batch-fetched via `public_profiles` into `profileMap`
- Organizer tile: red chip, always first, non-clickable
- Type badge shown on card: 🎯 Set or 🎲 Random

`_openGroupModal()`:
- `window.gModalType` — 'set' or 'random'
- `window.gModalMatchType` — 'doubles' or 'singles'
- Sub Pool section hidden when `gModalType === 'random'`

**Auto-update in Set Up a Match** (`smOnStep3GroupSelect`, `toggleMatchGroup`):
When a named group is selected, `MS.format` and `MS.numCourts` auto-update based on the group's `match_type` and `max_players`.

---

## Set Up a Match

Single-scroll 7-container page (`page-setupMatch`). No Next/Back buttons.

### Container Order
1. Match Type — Doubles / Singles pills
2. Courts & Players — 1–4 pills + red "needed players" box. Label: "Players needed (you're in):"
3. Date & Time — date + start time + duration (±15 min, 0.5h–4h) + end time display
4. Court — Public/Private toggle + saved courts + nearby + Add new
5. Play Structure — Open / Mixed / Same Gender
6. Invite — Entire IC / Specific Players / Named Group + live Needed/Invited grid
7. Review & Send — summary rows + note textarea + Send button

Sticky progress bar: `['Match Type','Number of Courts','Date & Time','Court','Play Structure','Invite','Review & Send']`

### Key Helpers
- `smUpdateNeededBox()` — red needed-players count
- `smUpdateSendBtn()` — gates Send on date + time + court + no overlap
- `smUpdateNeededGrid()` — gender-aware rows for Mixed/Same
- `smUpdateSummary()` — 4 summary rows in Container 7
- `smCheckConflict()` — async overlap detection; sets `MS.hasOverlapConflict`
- `smSetCourtType(type)` — Public/Private toggle
- `smSelectInvite(mode)` — switches invite mode

### Organizer Always Plays
`matchMaxNeeded()` always subtracts 1. No "I'll be playing" checkbox — it was removed.

### Conflict Detection
`toMins()` formula: `start1 < end2 AND start2 < end1`.
- True overlap → `MS.hasOverlapConflict = true`, dark red box (`#7f1d1d`), Send disabled
- Same-day non-overlap → yellow advisory only, Send not blocked

### Court Count Validation
`null`/`0`/`undefined` court_count → gray neutral note only. Red warning only if confirmed positive number < `MS.numCourts`.

---

## Recurring Matches

`_openRecurringModal()` — async, fetches courts before rendering.
Time picker: three `<select>` dropdowns (hour 1–12, minute 0/15/30/45, AM/PM). `:00`/`:30` in dark green.
Duration: ±15 min, 0.5h–4h.
Required fields: Group, Start Time, Court — validated before confirm overlay.
`window._rmSetGroup` — not inline onchange.
Auto-invite default: ≥2 days/week → 24h; 1 day/week → 72h.
Gap alert options: 12h, 24h, 48h, 72h. Default 24h.

---

## UI Patterns

### Desktop Layout
Max-width 600px centered. All pages: `max-width:600px;margin:0 auto`.

### Toasts
`showToast(message, color)` — bottom of screen, auto-dismiss.

### In-Progress Match Detection
`.pb-pulse-green` + `@keyframes pulse-green` — green pulse on currently-in-progress matches.

### Countdown Colors
`getCountdown(matchDate, timeStart)` returns `{text, urgent, urgency}`:
- `urgency:'urgent'` — <24h → red `#dc2626` + pulse
- `urgency:'caution'` — 24–48h → amber `#f59e0b`
- `urgency:'normal'` — >48h → gray `#9ca3af`
- Returns `null` if past

### Inline onclick Handlers
Dynamically generated HTML runs in global scope. Always expose as `window.functionName` (e.g., `window._gTogglePlayer`, `window._rmSetHour`).

### Profile Edit Mode
`lockProfileForm()` / `unlockProfileForm()`. `_editModeActive` flag gates lock. `startChangeDetection` runs on interval — new fields must be added to BOTH `startChangeDetection` AND `showProfileDiff`.

---

## Known Bugs

1. **Dashboard "Invited" box count can diverge from nav badge.** `loadDashTileCounts()` fetches its own count for subtitle text — verify it also filters past matches and self-organized matches.

2. **Duplicate courts in "Other Public Courts Nearby".** Double-dedup fix applied (API `id=not.in.(allExcludeIds)` + client-side `.filter`). Confirm no regressions with empty saved list.

---

## Pre-Launch Checklist

- [x] Terms of Service page
- [x] Privacy Policy page
- [x] Liability waiver with RSA 508:13 language at registration
- [ ] LLC formation — replace `[OWNER NAME / LLC NAME]` and `[YOUR EMAIL ADDRESS]` placeholders in ToS
- [ ] Insurance (General Liability, E&O, Cyber)
- [ ] SPF + DKIM + DMARC fully configured in Resend
- [ ] Landing page at pballconnect.com (marketing, not the app)
- [ ] App moved to pballconnect.com/app or subdomain
- [ ] Google indexing updated to landing page
- [ ] Liability waiver reviewed by actual attorney
- [ ] GDPR / CCPA compliance review
- [ ] Rate limiting on magic link sends
- [ ] Rate limiting on /api/send-email
- [ ] Error monitoring (Sentry or Cloudflare Logpush)
- [ ] Uptime monitoring
- [ ] Backup / point-in-time recovery confirmed in Supabase
- [ ] App tested on iOS Safari + Android Chrome
- [ ] PWA install prompt tested
- [ ] QR code invite flow end-to-end tested
- [ ] Single-use token "already used" error state tested

---

## Next to Build

1. **Play Structure reorder** — make Play Structure the first container; Set Group path auto-calculates courts; Open/Mixed/Same runs full 7-container wizard
2. **Set Group vs Random Group send logic** — Set groups: priority roster in order, subs auto-activate on primary decline. Random groups: first-to-respond fills spots.
3. **My Match Invites: tappable status boxes** — In/Pending/Waitlist/Out boxes reveal player name list. `_miResponseCache` and `toggleInvitePanel()` already scaffolded.
4. **Find Players / Browse Nearby on IC page** — `showIcSection('find')` and `loadNearbyPlayers()` are stubbed. Surface nearby non-IC players with add/invite actions.
5. **Profile complete flag + Court Captain celebration** — set `profile_complete = true` on `doSaveProfile()`; show celebration overlay when `is_organizer` first becomes true.
6. **Landing page at pballconnect.com** — marketing page. App moves to subdomain.
7. **Web push notifications** — browser push for match invites, IC requests, gap alerts.
8. **Post-match invite prompt** — "Now invite someone YOU want to play with" after confirming attendance or recording scores.
9. **Recurring match gap alert delivery** — currently stored in DB; need a Cloudflare Cron Worker to fire alerts.
10. **Match result / score recording UX** — `recordScores` page needs polish and post-match flow.

---

## Development Workflow

1. Edit `app.js`, `index.html`, or `styles.css` directly — no build step.
2. Test locally with `npx serve .` or `python -m http.server`.
3. For Supabase schema changes: run SQL in Supabase SQL editor, update `supabase_rls_policies.sql`, and update the `public_profiles` view if new columns need to be exposed.
4. For Cloudflare Pages Function changes: edit `functions/api/send-email.js`. Environment variable `RESEND_API_KEY` is set in Cloudflare Pages dashboard.
5. Deploy: `git push origin main` → Cloudflare Pages auto-deploys.
6. Verify deploy at https://pballconnect.com — Cloudflare typically deploys within 60 seconds.

---

## Important Rules for Claude Code

1. **Read before writing.** Always read a file with the Read tool before editing or overwriting it.

2. **`public_profiles` is a VIEW.** Never `ALTER VIEW public_profiles` directly. Always `ALTER TABLE registrations` first, then update the view SQL in Supabase.

3. **`player_group_members` uses `player_email`.** NOT `email`. Use `m.player_email` in all member lookups.

4. **No `quick_connect` column exists.** Do not add it. Quick Connect saves to `registrations` like any other registration.

5. **Organizer always plays.** `matchMaxNeeded()` always subtracts 1. Do not add an "I'll be playing" checkbox.

6. **Removed fields stay removed.** T-shirt size, city/state inputs, street address, Ambidextrous, Had/Wants Lesson, Wants to Improve buttons — do not re-add any of these.

7. **Inline onclick handlers need `window.*`.** Dynamic HTML runs in global scope — always expose as `window.functionName`.

8. **New profile fields need two registrations.** Add to BOTH `startChangeDetection` AND `showProfileDiff` or the save button won't work.

9. **ToS/Waiver placeholders are intentional.** `[OWNER NAME / LLC NAME]` and `[YOUR EMAIL ADDRESS]` in ToS and Waiver are left blank until LLC formation. Do not fill them in.

10. **Court count null = unknown.** `null`/`0`/`undefined` `court_count` → gray neutral note only. Only show red capacity error for confirmed positive number < `MS.numCourts`.
