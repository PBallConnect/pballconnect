# CLAUDE.md — PBallConnect Reference

_Last updated: May 9, 2026_

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

## Database Schema

### Key Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `registrations` | Player profiles — primary record, keyed by `email` | `email`, `first_name`, `last_name`, `zip_code`, `city`, `state`, `lat`, `lon`, `skill_self`, `dupr_rating`, `gender`, `age_range`, `play_style`, `is_organizer`, `wants_organizer`, `profile_complete`, `qr_invite_id`, `avail_weekday_morning`, `avail_weekday_afternoon`, `avail_weekday_evening`, `avail_weekends`, `phone` (10-digit string), `sms_opt_in` (boolean, default false) |
| `sms_log` | Audit trail for all SMS attempts | `player_email`, `match_id`, `event_type`, `status` ('sent'/'failed'/'rate_limited'/'not_opted_in'/'no_phone'/'no_player'), `sent_at`, `error_code` |
| `connections` | Inner Circle relationships | `player_email`, `connection_email`, `status` |
| `matches` | Match events | `id`, `organizer_email`, `match_date`, `time_start`, `time_end`, `court_id`, `court_name`, `format`, `num_courts`, `gender_pref`, `max_players` |
| `match_responses` | Per-player responses | `match_id`, `player_email`, `response` ('in'/'out'/'pending'/'waitlist') |
| `match_results` / `match_scores` | Recorded scores | — |
| `courts` | Court locations | `id`, `name`, `address`, `is_private`, `court_count`, `lat`, `lon` |
| `player_courts` | Courts a player uses | `player_email`, `court_id` |
| `invites` | App invite links | `invite_token`, `invite_type` ('single'/'qr'), `is_used` (boolean, default false), `inviter_email`, `inviter_name`, `invitee_email`, `invitee_name`, `invite_method`, `status` |
| `waitlist` | Public marketing waitlist | `id`, `first_name`, `email` (unique), `zip_code`, `requested_at`, `invited_at` (nullable — set when invite sent), `notes` (internal) |
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

**Welcome screen + auth gate (April 2026):** `page-welcome` is the default active page (`page-playerProfile` no longer starts active). `showPage()` checks `SESSION_PLAYER` at the top — unauthenticated users navigating to any protected page are silently redirected to `welcome`. Unprotected pages: `['welcome', 'tos', 'privacy']`. The back-button pill is suppressed on `welcome` (same as `dashboard`). `initApp()` replaces the bare `getSession()` block — on load it attempts to restore an existing session; if no session exists and no new-user registration is in progress, it explicitly calls `showPage('welcome')`. `showLoginModal()` is an alias for `openLoginModal()` (supports inline onclick handlers).

### Global State

| Variable | Purpose |
|---|---|
| `S` | Registration/form state — location, skills, preferences, availability, consent flags |
| `SESSION_PLAYER` | Authenticated player's DB row. `null` if not logged in. |
| `SUPABASE_ACCESS_TOKEN` | JWT from Supabase auth — included in every REST call |
| `IC_MEMBERS` | Inner Circle array — populated on IC page visit, fetched on demand for modals |
| `_icCurrentView` | Active IC list view: `'grid'` (default), `'favorites'`, `'alpha'` |
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

### Waitlist Function (`/api/waitlist`)

`POST /api/waitlist` is handled by `functions/api/waitlist.js`. Pipeline in order:
1. **IP rate limit** — max 3/hr via `RATE_LIMIT_KV`; skipped gracefully if KV not bound
2. **Validate** — `firstName`, `email`, `zip` (5 digits), `turnstileToken` all required
3. **Turnstile verify** — POST to `https://challenges.cloudflare.com/turnstile/v0/siteverify` using `env.TURNSTILE_SECRET_KEY`; skipped if key is missing/placeholder (safe for pre-launch testing)
4. **Save** — POST to `waitlist` table via `env.SUPABASE_SERVICE_KEY` (bypasses RLS); 409 conflict (duplicate email) is silently treated as success
5. **Confirm email** — sends from `hello@pballconnect.com` via Resend; failure is non-fatal (wrapped in try/catch)
6. Return `{ ok: true }`

### Rate Limiting Pattern (both functions)

Both `send-email.js` and `waitlist.js` use the same KV pattern:
```js
const key = `<prefix>:<ip>`;
const count = parseInt(await env.RATE_LIMIT_KV.get(key) || '0', 10);
if (count >= N) return 429;
await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 3600 });
```
- `send-email.js` prefix: `send-email:` — limit 5/hr
- `waitlist.js` prefix: `waitlist:` — limit 3/hr
- Both skip gracefully if `RATE_LIMIT_KV` binding is not configured

### Email

`sendEmail({to_email, type, personal_note, invite_url, inviter_name, invitee_name, match_date_str})` in `app.js` calls `POST /api/send-email` (Cloudflare Pages Function).

Email types:
- `app_invite` — white-card template, CTA points to `invite.html?token=TOKEN`
- `ic_invite` — white-card template, personalized greeting using `invitee_name`, CTA "Join PBallConnect →" points to `invite.html?token=TOKEN`
- `match_invite` — dark-card, dynamic subject: "[FirstName] invited you to play pickleball on [Day], [Month] [Date]"
- `match_update` — dark-card
- `match_decline` — dark-card

`sendEmail()` is called with `await` in match invite send loops to prevent Resend rate limit drops. Each call wrapped in per-email try/catch with a failure toast.

### Invite Polling

`startInvitePolling()` runs every 30 seconds. Supabase Realtime is not used.

---

## Two-Tier Invite System

**Status: LIVE**

### Tier 1 — Single-Use Tokens

- Created by `icCreateSingleUseInvite(recipient, method)` — shared helper for all single-use channels (email, text, copy link)
- Token: 16 chars generated client-side via `crypto.getRandomValues(new Uint8Array(12))` — included in INSERT payload as `invite_token`
- Written to `invites` table: `invite_type: 'single'`, `is_used: false`, `invite_token`, `invitee_name`, `invitee_email`
- URL: `https://pballconnect.com/invite.html?token=TOKEN`
- On registration: PATCH token row with `is_used: true, status: 'registered'`
- `invite.html` checks `is_used` before showing the card; shows friendly "already used" error if true (asks user to request a fresh invite)
- INSERT throws on failure (no silent catch) — invite channels abort if DB write fails so no orphaned invite URLs are shared

### Tier 2 — Permanent QR Tokens

- One per player, stored as `qr_invite_id` on `registrations` (and exposed via `public_profiles`)
- Created lazily by `getOrCreateQrId()` — checks `SESSION_PLAYER.qr_invite_id`, generates via `crypto.getRandomValues` if null, PATCHes `registrations`, caches on `SESSION_PLAYER`
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

### SMS / Text Invite Flow

When `?channel=sms` is present in the URL, `invite.html` skips the magic link card entirely and shows the single-screen SMS registration form (`pbShowSmsRegScreen()`). The form collects First Name, Last Name, skill level, email, and dual consent, then POSTs to `/api/sms-register`.

- `/api/sms-register` creates the Supabase auth user via Admin `generate_link` (no email sent), upserts `registrations`, marks invite used, patches the pending connection to the real email + `approved`, creates reciprocal connection, and returns `{ ok: true, signInUrl }`.
- Browser follows `signInUrl` directly — establishes a session without email.
- `invite_method` for SMS invites must be `'sms'` — the `invites_invite_method_check` constraint allows: `'email'`, `'link'`, `'qr'`, `'ic'`, `'sms'`, `'text'`.
- New users arriving at `invite.html` are always unauthenticated — the `invites` table has an **anon SELECT policy** so the token can be validated without a JWT. Do not remove it.
- `invite_tokens` is a **VIEW**, not a table — RLS policies cannot be applied to it directly. It exists as an anon-safe fallback for token reads.

### Invite Flow (full)

1. User arrives at `invite.html?token=TOKEN` or `invite.html?qr=QR_ID`
2. Card shown with inviter name, optional personal note, email input
3. Submit → `signInWithOtp` with `emailRedirectTo = https://pballconnect.com/?newuser=1&invite=TOKEN` (or `&qr=QR_ID`)
4. User clicks magic link → lands on pballconnect.com
5. `checkInviteToken()` fires — reads `?invite=` or `?qr=`, sets `PENDING_INVITE`
6. Because `newuser=1`: banner skipped entirely
7. `restoreSession` → no row found → `startNewRegistration(email)`
8. `startNewRegistration` → `showInviteLandingChoice()` (Full Profile or Quick Connect)

**Double-call guard:** `startNewRegistration` sets `_newUserRegistrationStarted = true` on first call and returns immediately if called again (both `onAuthStateChange` and `getSession()` fire on magic link arrival, which previously stacked two choice overlays). The flag is cleared by `_inviteChoiceFull` and `_inviteChoiceQuick` before navigating away.

**Post-registration IC connection:** `handlePostRegistrationInvite(email, name)` fires after the new user saves their profile. If they tap "Yes — Join [inviter]'s IC!":
- PATCH original connection row (inviter → new user, status:pending) → `status:'approved'`
- POST reciprocal row (new user → inviter, status:'approved') — auto-approved since inviter initiated
- Both sides are immediately mutual IC members
If they tap "Maybe Later": original row stays pending; new user can accept from IC → Requests later.

### IC Invite UI Flow (in-app)

The IC invite panel lives inside `icSectionMembers` (not a separate section).

**Element order in icSectionMembers:**
1. ✉️ **Send an Invite** button — full width, green, toggles `icInvitePanel`
2. `icInvitePanel` — expandable, hidden by default
3. View toggle row: `[📊 Level Grid][⭐ Favorites][A–Z]`
4. MY INNER CIRCLE label row
5. `icLevelGrid` — rendered here when grid view active
6. `icColHeaders` — hidden in grid view
7. `icApprovedList` — hidden in grid view
8. `icInvitesCard` — shown below list when pending invites exist

**`icInvitePanel` contains 3 channel buttons:**
- ✉️ **Email via PBallConnect** — always shown
- 💬 **Send a Text** — mobile only (shown by JS on panel open)
- 🔗 **Copy Invite Link** — always shown
- "At the court? Show your QR code instead →" (`icQrLine`)

**Channel behavior:**
- `selectIcChannel('email')` — hides Text + Link buttons + QR line, shows `icEmailFields` (name + email inputs + Send button). Recipient name required; email required.
  - `sendIcEmailInvite()` calls `icCreateSingleUseInvite()` + `sendEmail({type:'ic_invite'})` via Resend API directly (no email app). After success, shows inline confirm + "Send another?" prompt after 1200ms. Each awaiting invite card shows the invitee's email below their name.
  - `icSendAnother()` — clears fields, keeps panel open for batch inviting
  - `icDoneInviting()` — closes panel, resets form, reloads IC page state, scrolls top, shows toast
- `selectIcChannel('text')` — shows `icTextFields` (name input + Open Messages button). Recipient name required.
  - `sendIcTextInvite()` generates token, opens `sms:` URI on mobile
  - Desktop fallback: shows WhatsApp Web link + Copy Message Text panel
- `selectIcChannel('link')` — shows `icLinkFields` (name input + Copy Link button). Recipient name required.
  - `sendIcLinkInvite()` generates token, copies URL to clipboard, shows confirm, auto-calls `icDoneInviting()` after 3500ms
- `resetIcChannelForm()` — restores all channel buttons, clears inputs, hides form, uses `_icIsMobile` to decide whether to show Text button

**`icGetRecipient()` is REMOVED.** Each channel has its own inline form with its own input.

**`_icIsMobile`** const: `/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)` — defined once, used in `toggleIcInvitePanel` and `resetIcChannelForm`.

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
Minimal overlay — email (readonly), **First Name** (label: "First Name", placeholder: "Your first name", required), phone, zip, skill slider, age, playing since, waivers. Saves to `registrations`. No `quick_connect` column exists — do not add one. Goes directly to dashboard with welcome toast. No organizer question. No nickname field — do not add one.

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
- **INNER CIRCLE:** Members, Invite, Requests _(no badge numbers; Find Players removed)_
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

`showIcSection(section)` is the sole IC nav function. Sections: `members`, `invite`, `requests`.
`showIcView(mode)` is kept for backward compatibility only — delegates to `showIcSection()`.
`loadNearbyPlayers()`, `filterNearbyGrid()`, `switchFindTab()` are no-op stubs — `icSectionFind` HTML was removed.

**`showIcSection('invite')` redirects immediately** — it hides all sections, shows `icSectionMembers`, opens `icInvitePanel` if closed, calls `switchIcMemberView('grid')`, and returns early. `icSectionInvite` is never shown; it is a legacy stub only.

### IC Member List Views

`switchIcMemberView(view)` — sole toggle. `_icCurrentView` persists across sort/filter. **Default is `'grid'`** — both `renderInnerCircleList()` and `showIcSection('members')` call `switchIcMemberView('grid')`.

- `'grid'` (default) — shows `icLevelGrid`, hides `icApprovedList` + `icColHeaders`. Calls `_buildIcLevelGrid()`. 5 columns by skill: Far Below / Below / My Level (center, green) / Above / Far Above. Names only — no cards, no avatars, no skill pills. Click → `openPlayerCard()`.
- `'favorites'` — shows `icApprovedList` (filtered to `IC_FAVORITES`), hides `icLevelGrid`, shows `icColHeaders`
- `'alpha'` — shows `icApprovedList` sorted A–Z, hides `icLevelGrid`, shows `icColHeaders`

**IC sticky header** (`id="icStickyHeader"`): `position:sticky; top:52px; z-index:100; background:#fff; border-bottom:2px solid #e5e7eb`. Sits inside the normal page content flow — no fixed positioning, no left/right offsets, no inner centering wrapper. On mobile the header stays inside the content container and is overridden to `position:static` so it doesn't escape the layout.

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
- `window.gModalNumCourts` — 1–4; `window.gModalSize` always derived from it at top of `render()`
- Sub Pool section hidden when `gModalType === 'random'`

### Create Group Modal — Section Order

1. Group Name
2. Match Type (Doubles / Singles)
3. Number of Courts (1 / 2 / 3 / 4) → auto-calculates group size
4. Group Type (Set / Open Group)
5. Players → Organizer pill → Who to Invite (Specific / Same Gender / Mixed / Everyone) → Needed/Selected summary grid → Level grid → Sub pool (Set Group only)
6. Notes
7. Create Group button

### Group Size Rules

- No manual 4/8/12/16 size buttons — size is auto-calculated
- Formula: `numCourts × playersPerCourt` (Doubles = 4/court, Singles = 2/court)
- `render()` recalculates `gModalSize = gModalNumCourts * ppc` at the top of every call
- Summary line: "X courts · Y players total · Z spots open"
- Players header: "1 / Y · Z spots remaining" (organizer always fills slot 1)

### Create Group Level Grid Rules

- Column labels match IC Level Structure exactly: `.5+ Below My Level` / `.25 Below My Level` / `My Level` / `.25 Above My Level` / `.5+ Above My Level`
- Reference values use `≤/≥` at nearest 0.25 increment (e.g. `≤ 3.75`, `4.0`, `4.25`, `4.5`, `≥ 4.75`)
- Set Group: column headers NOT tappable — individual selection only
- Open Group: column header tap-to-select-all enabled, no ceiling cap
- "Everyone" selection auto-selects all pills immediately (Open Group only)
- Switching invite filter clears all selections and re-renders grid (clean slate)
- Mutually exclusive: player in primary grid cannot be in sub pool and vice versa

### Sub Pool Rules (Set Group Only)

- Not shown on Open Group path
- Same 5-column level grid layout, individual selection only — no column tap-to-select
- Labeled "SUB POOL · Optional Backups"
- No minimum required

### Open Group Messaging Rules

- Never use the word "subs" on the Open Group path
- At minimum: show "Select at least X more player(s) to continue."
- Just above minimum: show "For best results, invite more players than the minimum. Open Groups fill spots first-come-first-serve — extra invites ensure you always have enough players for a great match."
- Well above minimum: hide advisory

### Create Group Button Rules

- Set Group: disabled until summary grid all green AND group name not empty
- Open Group: disabled until `openSelected.size >= (gModalSize - 1)` AND group name not empty

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

### Wizard Step Order

**Non-Set Group path (Open / Mixed / Same Gender):**
1. Play Structure
2. Match Type
3. Number of Courts
4. Invites (level grid)
5. Date & Time
6. Court
7. Review & Send

**Set Group path:**
1. Play Structure (group selected)
2. Auto-set Match Type
3. Auto-set Courts & Players
4. Auto-complete banner "Invites set by your group · X players"
5. Date & Time
6. Court
7. Review & Send (shows group roster)

### Play Structure Selection States

- **State 1:** Nothing selected — all options lit
- **State 2:** "One of My Set Groups" tapped but no group chosen — others dimmed, tap again to return to State 1
- **State 3:** Specific group selected — fully locked, Steps 1–4 complete

### Step 4 Invite Grid Rules

- 5-column level grid using IC_MEMBERS
- Column labels match IC Level Structure: `.5+ Below My Level` / `.25 Below My Level` / `My Level` / `.25 Above My Level` / `.5+ Above My Level`
- Column header tap = select all / deselect all / partial (amber) state
- Unrated row below grid for players with no `skill_self`
- Summary grid above level grid for all paths:
  - Open/Specific: `[👥 Players]` Needed / Invited
  - Mixed: `[👨 Men]` + `[👩 Women]` + Total
  - Same Gender: relevant gender row only
- Continue locked until minimum met: `(numCourts × playersPerCourt) - 1`
- Mixed path: hard stop until gender balance met
- No "subs" language anywhere in match wizard

### Court Step Rules

- "+ Add a new court" hidden when a court is already selected
- Court list shows max 3 most recent courts
- Waterfall order: recent match history → My Courts alphabetical → all courts if no history
- Single-line compact list format
- "Show all courts ▼" toggle beneath short list
- Once selected: collapsed card + Change button
- Public/Private tabs apply to expanded view only

### Browser Navigation

- Browser back button logs user out entirely — no in-app browser navigation
- In-wizard navigation is forward-only
- Back buttons must be built explicitly if needed

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

### Mobile First

The majority of users are on mobile (iPhone). All new features must be designed and tested mobile-first. Desktop is secondary. Key constraints:
- All `<input>` elements must have `font-size: 16px` minimum — iOS Safari auto-zooms when font-size is below 16px, causing the viewport to unexpectedly enlarge on tap.
- Tap targets must be large enough for thumbs (min 44px height).
- Test on iPhone Safari before considering a feature done.

### Known Constraints

- **`invites_invite_method_check`** — allowed values: `'email'`, `'link'`, `'qr'`, `'ic'`, `'sms'`, `'text'`. Sending any other value causes a 400 constraint violation and the INSERT fails silently.
- **iOS font-size auto-zoom** — any `<input>` with `font-size < 16px` triggers viewport zoom on focus in iOS Safari. Always use `font-size: 16px` minimum on inputs.
- **Smart/curly quotes in inline JS** — U+2018 `'` and U+2019 `'` are not valid JS string delimiters. They cause a `SyntaxError` that silently prevents the entire `<script>` block from executing. Always use straight ASCII single quotes `'` in JavaScript. This is especially dangerous in inline HTML `<script>` blocks where the browser gives no visible error.
- **`Prefer: return=representation`** — after a Supabase INSERT, this header causes PostgREST to SELECT the inserted row back. If the SELECT RLS policy blocks the row (e.g. `auth.email() = invitee_email` where `invitee_email IS NULL`), the response is `[]` — silent failure. Use `Prefer: return=minimal` and rely on client-side data when possible.

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

### Fixed IC Header
```
id="icStickyHeader"
position:fixed; top:52px; left:240px; right:0; z-index:100
background:#fff; padding:8px 16px
border-bottom:2px solid #e5e7eb; box-shadow:0 2px 8px rgba(0,0,0,0.06)
Inner div: max-width:600px; margin:0 auto
Mobile override: @media (max-width:768px) { #icStickyHeader { left:0 !important; } }
Spacer below header: height:140px
```

### Level Grid (`_buildIcLevelGrid`)
5-column skill table rendered into `id="icLevelGrid"`. Buckets IC members by `skill_level` relative to viewer's level (±0.125 tolerance bands):

| Column | Threshold | Style |
|---|---|---|
| Far Below | diff ≤ −0.375 | bg `#f1f5f9`, color `#374151` |
| Below | diff ≤ −0.125 | bg `#f1f5f9`, color `#374151` |
| My Level | −0.125 < diff ≤ 0.125 | bg `#d1fae5`, color `#1a7a3a`, font-weight 800 |
| Above | diff ≤ 0.375 | bg `#f1f5f9`, color `#374151` |
| Far Above | diff > 0.375 | bg `#f1f5f9`, color `#374151` |

Names only — no cards, no avatars, no skill pills. Click → `openPlayerCard()`. If viewer has no skill level set, shows "Add your skill level to your profile" message.

### Send an Invite Button
Full width, `background:#1a7a3a`, `color:#fff`, `font-size:16px`, `font-weight:800`, `border-radius:14px`, `padding:16px`. Hover: `#15652f`. Toggles `icInvitePanel` via `toggleIcInvitePanel()`.

### Dashboard Container Styles
- Green (My IC): `background:rgba(26,122,58,0.08); border:1.5px solid rgba(26,122,58,0.2)`
- Amber (IC Invites to Others): `background:rgba(245,158,11,0.08); border:1.5px solid rgba(245,158,11,0.25)`
- Purple (Others' IC Invites to Me): `background:rgba(124,58,237,0.08); border:1.5px solid rgba(124,58,237,0.2)`
- Orange (My Match Invites to Others): `background:rgba(234,88,12,0.08); border:1.5px solid rgba(234,88,12,0.2)`
- Blue (Match Invites from Others): `background:rgba(37,99,235,0.08); border:1.5px solid rgba(37,99,235,0.2)`

### Skill Level Guide Modal (`skillGuideModal`)

Reusable modal showing 5 USA Pickleball skill levels (1.0–2.5 Beginner through 4.5+ Advanced/Elite). Opened by `window.showSkillGuide()`, closed by `window.hideSkillGuide()` or clicking the backdrop. Uses the existing `modal-overlay` / `modal` CSS class pattern (same as waiver modal). Displayed in the app via "❓ What's my level?" link (color `#16a34a`, font-size 0.85rem, underlined) placed directly below the Personal Skill Rating slider in registration step 2 and the Quick Connect skill slider. The link is also displayed inline (no modal) on `landing.html` as a dedicated "Know Your Game / Find Your Level" section between features and waitlist.

### Build Badge

Fixed bottom-right corner of every page. Format: `β build XXXXXXX` (7-char git hash, links to GitHub commit). Auto-injected by `inject-build.sh` on every `git push` via `.git/hooks/pre-push` (amend). Font size 10px, color `#999`, z-index 9999.

### ic-shake Animation
CSS class `ic-shake` applied to recipient input on validation failure (blank name before invite creation):
```css
@keyframes ic-shake {
  0%,100% { transform: translateX(0); }
  20%,60% { transform: translateX(-6px); }
  40%,80% { transform: translateX(6px); }
}
.ic-shake { animation: ic-shake .35s ease; border-color: #dc2626 !important; }
```
Applied via JS: `el.classList.add('ic-shake'); setTimeout(()=>el.classList.remove('ic-shake'), 400);`

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
- [ ] **Run waitlist table SQL** — SQL is in `supabase_rls_policies.sql`; must be run manually in Supabase SQL editor before waitlist goes live
- [ ] **Complete Turnstile setup** — replace `TURNSTILE_SITE_KEY_PLACEHOLDER` in `landing.html`; add `TURNSTILE_SECRET_KEY` to Cloudflare Pages env vars
- [ ] **Add `SUPABASE_SERVICE_KEY` to Cloudflare Pages env vars** — needed by `/api/waitlist`
- [ ] **Bind `RATE_LIMIT_KV`** — create KV namespace in Cloudflare, bind as `RATE_LIMIT_KV` in Pages settings
- [ ] **Twilio: upgrade to Pay as you go** — trial mode only sends to verified numbers; required before launch
- [ ] **Twilio: A2P 10DLC registration** — required for production US SMS sending
- [ ] **End-to-end SMS test** — test send-sms.js with verified numbers, verify sms_log entries
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
16. **Emergency Fill screen** — organizer tool when a spot opens with no waitlist; lets organizer quickly re-invite from IC.

---

## Product Decisions

- **Find Players / Browse Nearby removed from Inner Circle (April 2026)** — `icSectionFind` HTML removed from `index.html`; `loadNearbyPlayers`, `filterNearbyGrid`, `switchFindTab` stubbed as no-ops in `app.js`. Player discovery via IC invite flow (email/text/link/QR) is sufficient. Do not re-add the Find section to the IC page.

- **Pending Matches system (April 2026)** — The `invitedByOthers` page (`page-invitedByOthers`) serves as the unified "Pending Matches" page. Do not rename or remove the page ID — navigation throughout the app depends on it. Three sections rendered (each only if data exists): (1) **Open Invites** — `match_responses.response = 'pending'`, `player_email = SESSION_PLAYER.email`, upcoming — shows Accept/Decline buttons, expanded by default; (2) **Matches You've Joined** — `response = 'in'`, `organizer_email != SESSION_PLAYER.email`, roster not full, upcoming — amber "Pending roster" badge, no action buttons; (3) **Matches You're Organizing** — `organizer_email = SESSION_PLAYER.email`, roster not full, upcoming — amber "Organizing" badge. Dashboard amber tile counts all three sections deduplicated by `match_id`. Roster-full check: count `match_responses` rows where `response = 'in'`; a match is pending if in-count < `max_players`. Date comparisons: always local date with en-CA locale — never UTC. Dashboard count and page render must use identical logic (console logs intentionally left in both loaders for debugging). Do not combine the three section queries into one Supabase query — keep them as independent fetches. Do not use `status=neq.full` or `status=neq.cancelled` in DB queries for pending logic — PostgREST `neq` excludes NULL-status rows; filter cancelled in JS with `(m.status||'') !== 'cancelled'` instead.

---

## SMS Notification System

_Added May 9, 2026_

### Twilio Account
- **Account email:** app@pballconnect.com
- **Sending number:** +1 978 945 3787
- **Cloudflare env vars:** `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` (all Secret)
- **Status:** Trial mode — can only SMS verified numbers. Upgrade to Pay as you go before launch.

### Google Workspace
- **Primary:** zorro@pballconnect.com
- **Aliases:** app@, noreply@, david@, support@pballconnect.com

### SMS Architecture
- `sendSms({ player_email, message, match_id, event_type })` — client-side wrapper in `app.js` that POSTs to `/api/send-sms`
- `/api/send-sms` — consent-gated (checks `sms_opt_in`), rate-limited, sends via Twilio REST API, logs to `sms_log`
- `/api/twilio-webhook` — receives Twilio keyword callbacks; STOP sets `sms_opt_in=false`, START sets `sms_opt_in=true`
- Signature validation: HMAC-SHA1 over `url + sorted(key+value)` via Web Crypto API — skips gracefully if `TWILIO_AUTH_TOKEN` is missing/placeholder
- Webhook URL: `https://pballconnect.com/api/twilio-webhook` (configure in Twilio Console → Phone Numbers → +1 978 945 3787)

### SMS Rate Limits (via `RATE_LIMIT_KV`)
- Per-player: `sms_player_{email}` — 10/24h (86400s TTL)
- Per-match: `sms_match_{match_id}` — 20/match total (604800s TTL)
- Global daily: `sms_global_{YYYY-MM-DD}` — 500/day; logs warning above 400 but continues sending

### Phone Storage Convention
- Stored as **10-digit string** (digits only, no +1, no formatting) in `registrations.phone`
- `/api/send-sms` normalizes to E.164 (`+1xxxxxxxxxx`) before calling Twilio
- Do not change this convention

### Can't Make It Drop Flow
`window.cantMakeIt(matchId)` — shows confirmation dialog using `window._cmCache[matchId]` (populated at card render time).
`window.confirmCantMakeIt(matchId)` — full drop flow:
1. PATCHes `match_responses` → `'out'`
2. Toast + page reload
3. Notifies organizer (email + SMS, both in separate try/catch)
4. Fetches waitlist; if `hoursUntilMatch <= 24` → scramble (all waitlisted → `'pending'`, urgent notifications); if `>= 24h` → standard (first only)

---

## Development Workflow

1. Edit `app.js`, `index.html`, or `styles.css` directly — no build step.
2. Test locally with `npx serve .` or `python -m http.server`.
3. For Supabase schema changes: run SQL in Supabase SQL editor, update `supabase_rls_policies.sql`, and update the `public_profiles` view if new columns need to be exposed.
4. For Cloudflare Pages Function changes: edit files in `functions/api/`. Environment variables (`RESEND_API_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `TURNSTILE_SECRET_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`) are set in the Cloudflare Pages dashboard. `RATE_LIMIT_KV` is a KV namespace binding (not an env var — set under Settings → Functions → KV namespace bindings).
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

11. **`icGetRecipient()` is gone.** Each IC invite channel has its own inline form. Do not recreate a shared recipient input or call `icGetRecipient()`.

12. **`showIcSection('invite')` redirects to members.** `icSectionInvite` is a legacy stub — it is never shown. The invite panel lives in `icSectionMembers`.

13. **Level Grid is the default IC view.** `switchIcMemberView('grid')` is called on every IC page load. Do not change the default to `'alpha'`.

14. **Always `await sendEmail()`.** Never fire-and-forget. In loops (match invite sends), `await` each call sequentially to avoid Resend rate limit drops. Wrap in per-recipient try/catch with a failure toast — never let one failure abort the loop.

15. **Call `smUpdateProgress()` after every user action in Set Up a Match.** Any change to format, courts, date, time, court selection, play structure, or invite mode must call `smUpdateProgress()` so the sticky progress bar stays in sync.

16. **Single-use tokens: check `is_used` before allowing registration.** `invite.html` fetches the `invites` row and blocks with a friendly error if `is_used === true` and `invite_type !== 'qr'`. Never skip this check.

17. **QR invites use `?qr=` not `?token=`.** The URL parameter for QR flow is `?qr=QR_ID`. Single-use token flow uses `?token=TOKEN`. These are distinct code paths — do not conflate them.

18. **Never display raw token strings in any UI.** Tokens appear only in URLs (invite links). Never render the token value as visible text in the app or email body.

19. **`_icIsMobile` detection is required before showing the Text channel.** The 💬 Send a Text button must only be shown on mobile devices. Use `_icIsMobile` (set once at module load) — never show the SMS button unconditionally.

20. **`startNewRegistration` has a double-call guard.** It sets `_newUserRegistrationStarted = true` on first call and returns immediately on any subsequent call. Both `onAuthStateChange` and `getSession()` fire on magic link arrival — without the guard, two choice overlays stack. `_inviteChoiceFull` and `_inviteChoiceQuick` clear the flag before navigating away. Do not remove this guard.

21. **Quick Connect uses First Name only — no nickname.** The `qcFirstName` field (label: "First Name", placeholder: "Your first name") is the only name field. There is no nickname field and no auto-generation from email. Do not add a nickname field or fall back to `email.split('@')[0]` for display names in this flow.

22. **`loadIcPending()` deduplicates by `requester_email`.** Multiple connection rows can exist for the same (inviter, invitee) pair from repeat sends or test runs. The function deduplicates before rendering, keeping the most recent row per `requester_email`. Do not remove this deduplication.

23. **`landing.html` is fully standalone.** No dependency on `app.js` or `styles.css`. All styles are inline or in a `<style>` block within the file. Do not import app styles into landing.html or vice versa.

24. **Waitlist uses `SUPABASE_SERVICE_KEY`, not anon key.** The `waitlist` table has RLS enabled with no public policies — only the service role can write to it. The waitlist function must use `env.SUPABASE_SERVICE_KEY` in both `apikey` and `Authorization` headers. Never use the anon key for waitlist writes.

25. **Turnstile verification is skippable during development.** `waitlist.js` skips Turnstile verification if `TURNSTILE_SECRET_KEY` is missing or starts with `TURNSTILE_`. This lets the form work end-to-end before Turnstile is configured. Once the real secret key is set, verification is enforced automatically.

26. **`window.showSkillGuide` / `window.hideSkillGuide` must stay on `window`.** The "❓ What's my level?" links use inline `onclick` in both static HTML (index.html) and dynamically generated HTML (Quick Connect in app.js). Both require global scope — do not move these to module scope.

27. **Open Group invite pool has no hard cap.** Never enforce `max_players` as a selection limit for Open Groups (`group_type === 'random'`). The pool size is intentionally uncapped — it's an invite pool, not a fixed roster. Show "X players in invite pool" as informational text only. The save validation enforces `pool > max_players` (must have at least one sub), not an upper bound.

28. **Same-day match banner — conflicts only.** `smCheckConflict()` may only show the red conflict banner when a true time overlap is detected (`start1 < end2 && start2 < end1`). Never show a green "No time conflict — you're good to go!" or any positive confirmation banner. Same-day non-overlapping matches → amber advisory only, Send not blocked. No overlap at all → no banner, no message.

29. **Post-Send Invites navigation.** After `submitMatch()` succeeds (match created + invites sent), always navigate to Dashboard (`showPage('dashboard')`) with a success toast and a brief amber tile pulse. Do not navigate to `myInvites`, `confirmedMatches`, or any other page.

30. **`isMatchWizardDirty()` guard.** Any navigation away from `page-setupMatch` while the wizard has state (date set, court selected, invites configured, etc.) must show a leave-confirmation dialog before proceeding. The guard is bypassed only when `submitMatch()` completes successfully. Do not silently discard wizard state on nav.

31. **Level filter math for Open Group uses `skill_self` as center.**

32. **Always `git push --force origin main`.** The pre-push hook amends HEAD to write `version.json` — this rewrites the commit, requiring `--force`. Never use `--force-with-lease`. Never place a `git push` inside the pre-push hook.

33. **SMS invite flow uses `invite_method: 'sms'`.** The `invites_invite_method_check` DB constraint defines the allowed set. Passing `'text'` causes a 400 error. Allowed values: `'email'`, `'link'`, `'qr'`, `'ic'`, `'sms'`, `'text'`.

34. **All inputs must be `font-size: 16px` minimum.** iOS Safari auto-zooms any input below 16px. Never set input font-size to 13px or 14px.

35. **Never use smart/curly quotes in JavaScript.** U+2018/U+2019 (`'`/`'`) cause a silent `SyntaxError` that prevents the entire script block from executing. Use straight ASCII `'` always. Run `node --check` on extracted JS to verify before committing inline scripts.

36. **Use `Prefer: return=minimal` for Supabase INSERTs when you already have the data client-side.** `return=representation` triggers a SELECT-back that can silently return `[]` if the SELECT RLS policy blocks the row. Generate tokens client-side and use them directly — do not rely on reading them back from the DB. `SESSION_PLAYER.skill_self` is the organizer's skill level. Bucket thresholds (matching the IC level grid): Far Below diff ≤ −0.375 · Below −0.375 < diff ≤ −0.125 · My Level −0.125 < diff ≤ 0.125 · Above 0.125 < diff ≤ 0.375 · Far Above diff > 0.375. Use `(ic_skill - organizer_skill)` for the diff. Players with no skill level set are excluded from all level-filtered pools.

37. **Never send SMS without verifying `sms_opt_in = true`.** Always check consent before calling `send-sms.js`. The function returns a silent 200 if not opted in — caller falls back to email. Never pre-check or auto-enable the checkbox.

38. **SMS is always best-effort.** Never let SMS failure break the calling flow. Every `sendSms()` call must be in its own `try/catch`. Always `await` — never fire and forget.

39. **TCPA compliance is non-negotiable.** `sms_opt_in` must be set explicitly by the player via an unchecked-by-default checkbox with full consent disclosure language. Never pre-check or auto-enable SMS opt-in.

40. **Phone numbers stored as 10 digits.** No `+1`, no formatting — raw digits only (e.g. `9789453787`) in `registrations.phone`. `send-sms.js` normalizes to E.164 (`+1xxxxxxxxxx`) before calling Twilio. Do not change this convention.

41. **Twilio trial mode — verified numbers only.** Upgrade to Pay as you go before launch. A2P 10DLC registration required for production US SMS sending.

42. **STOP/HELP/START are handled by `twilio-webhook.js` automatically.** STOP sets `sms_opt_in = false` in Supabase. START sets `sms_opt_in = true`. Never handle these manually in app code.

43. **Scramble mode threshold is exactly 24 hours.** If match is less than 24 hours away and a spot opens — notify ALL waitlisted players simultaneously (all → `'pending'`). If 24+ hours — notify first waitlisted player only.

44. **"Can't Make It" never shows to the organizer.** Organizer uses Edit Match to cancel. If organizer somehow triggers `cantMakeIt()` — block with toast, do not process the drop.

45. **Organizer is always notified when a player drops.** Email + SMS (if `sms_opt_in`). Both in separate `try/catch`. Drop completes even if both notifications fail.
