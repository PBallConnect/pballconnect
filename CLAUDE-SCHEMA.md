# CLAUDE-SCHEMA.md — Database Schema & Technical Reference

_Full database schema, architecture patterns, feature behavior specs, and UI patterns._
_Cross-reference: CLAUDE.md (overview), CLAUDE-RULES.md (rules), CLAUDE-SMS.md (SMS system)._

_Last updated: June 13, 2026_

---

## Database Schema

### Key Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `registrations` | Player profiles — primary record, keyed by `email` | `email`, `first_name`, `last_name`, `zip_code`, `city`, `state`, `lat`, `lon`, `skill_self`, `dupr_rating`, `gender`, `age_range` (stores bucket string e.g. '41-45' — not a date of birth; actual DOB not collected, PII concern), `play_style`, `is_organizer` (boolean, NOT NULL DEFAULT false — as of June 2026, all registered members are organizers; retained for back-office reporting only; no longer read by app.js to gate any feature or nav item; always true for all active members), `wants_organizer`, `profile_complete`, `qr_invite_id`, `avail_weekday_morning`, `avail_weekday_afternoon`, `avail_weekday_evening`, `avail_weekends`, `phone` (10-digit string), `sms_opt_in` (boolean, default false) |
| `sms_log` | Audit trail for all SMS attempts | `player_email`, `match_id`, `event_type`, `status` ('sent'/'failed'/'rate_limited'/'not_opted_in'/'no_phone'/'no_player'), `sent_at`, `error_code` |
| `sms_consent_log` | Append-only TCPA consent audit trail (added May 17, 2026) | `player_email`, `event` ('opt_in'/'opt_out'), `method`, `ip_address`, `user_agent`, `created_at` — never UPDATE or DELETE; service role INSERT only |
| `connections` | Inner Circle relationships | `requester_email`, `recipient_email`, `status` (valid values: `'pending'` and `'approved'` only — never `'accepted'`; reciprocal rows are ALWAYS created as `'pending'`, never `'approved'`, regardless of path), `requester_name`, `recipient_name`, `message`, `responded_at`, `is_favorite` |
| `matches` | Match events | `id`, `organizer_email`, `match_date`, `time_start`, `time_end`, `court_id`, `court_name`, `format`, `num_courts`, `gender_pref`, `max_players` |
| `match_responses` | Per-player responses | `match_id`, `player_email`, `response` ('in'/'out'/'pending'/'waitlist') |
| `match_results` / `match_scores` | Recorded scores | — |
| `courts` | Court locations | `id` (uuid), `name`, `address`, `city`, `state`, `is_private` (boolean), `is_indoor` (boolean — `true`=indoor, `false`=outdoor; `null` means unknown/both), `num_courts` (integer), `latitude`, `longitude`, `notes`, `added_by_player` |
| `player_courts` | Courts a player uses | `player_email`, `court_id` |
| `invites` | App invite links | `invite_token`, `invite_type` ('single'/'qr'), `is_used` (boolean, default false), `inviter_email`, `inviter_name`, `invitee_email`, `invitee_name`, `invite_method`, `status`, `invitee_phone` (text — added May 16, 2026; 10-digit; populated for SMS match invite rows), `match_id` (uuid FK → matches, on delete cascade — added May 16, 2026; populated for SMS match invite rows) |
| `waitlist` | Public marketing waitlist | `id`, `first_name`, `email` (unique), `zip_code`, `requested_at`, `invited_at` (nullable — set when invite sent), `notes` (internal) |
| `player_feedback` | Post-match feedback | — |
| `player_groups` | Named groups | `id`, `organizer_email`, `name`, `max_players`, `group_type` ('set'/'random'), `match_type` ('singles'/'doubles') |
| `player_group_members` | Group members | `group_id`, `player_email`, `role` ('primary'/'sub') |
| `recurring_matches` | Recurring schedules | `id`, `organizer_email`, `group_id`, `court_id`, `days_of_week`, `time_start`, `duration`, `auto_invite_hours`, `gap_alert_hours` |
| `beta_applications` | Beta applicant queue — gated intake form submissions pending founder review | `id`, `first_name`, `email`, `city`, `state`, `skill_level`, `playing_since`, `age_range`, `heard_from`, `wants_beta` (boolean), `wants_video_call` (boolean), `calendly_shown` (boolean, default false), `status` (default 'pending'), `created_at` |

> **RLS:** No public read or write. Service role only for INSERT via /api/beta-apply. Never expose to client. Status values: 'pending' (awaiting review), 'approved' (invite sent), 'rejected' (declined).

### Views

| View | Purpose |
|---|---|
| `public_profiles` | Player-facing queries — excludes sensitive fields (phone, age_range, waiver data). Exposes `qr_invite_id`. Use for find-players / IC lookups. |
| `invite_tokens` | Anonymous-safe invite link reads |

> **CRITICAL:** `public_profiles` is a VIEW on `registrations`. Never ALTER the view directly. Always `ALTER TABLE registrations` first, then update the view definition in Supabase SQL editor.

> **NOTE on `invites` table:** `match-invite-respond.js` PATCHes `invites` using `match_id=eq.X&invitee_phone=eq.Y` (not `invitee_email`) — this is why both columns exist. The `invite_method` constraint (`invites_invite_method_check`) allows: `'email'`, `'link'`, `'qr'`, `'ic'`, `'sms'`, `'text'`.

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

When `?channel=sms` is present in the URL, `invite.html` skips the magic link card entirely and shows the single-screen SMS registration form (`pbShowSmsRegScreen()`). The form collects First Name, Last Name, skill level, **gender** (chip: Man / Woman / Prefer not to say, required), email, and dual consent, then POSTs to `/api/sms-register`.

Gender state is tracked in `_smsGender` (module-level var in invite.html). `pbSmsSelectGender(val, el)` updates `_smsGender` and toggles chip highlight. `pbSmsUpdateBtn()` requires `_smsGender !== ''`. `pbSmsSubmit()` validates and includes `gender: _smsGender || null` in the POST body. `sms-register.js` reads `gender` from the body and saves it as `gender: genderClean` in the registrations upsert.

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
Minimal overlay — email (readonly), **First Name** (label: "First Name", placeholder: "Your first name", required), phone, zip, skill slider, age, **gender** (chip: Man / Woman / Prefer not to say, required), playing since, waivers. Saves to `registrations`. No `quick_connect` column exists — do not add one. Goes directly to dashboard with welcome toast. No organizer question. No nickname field — do not add one.

`S.gender` is reset to `''` at the start of `showQuickConnectForm()`. The submit button is gated on `S.gender !== ''` in addition to name, phone, zip, and waivers. `gender: S.gender || null` is included in the `saveRegistration()` payload.

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
> **June 2026:** All registered members have full organizer access. `is_organizer` gating removed from `app.js`. The section below documents the prior behavior for historical reference only — do not re-implement it.
- ~~`is_organizer=true` → full access~~
- ~~`wants_organizer=true` (not yet organizer) → 40% opacity, clicking shows Court Captain nudge~~
- ~~Neither → 40% opacity, clicking shows toast "These tools are for Court Captains"~~
- ~~Gated items: `setupMatch`, `myInvites`, `myGroups`, `recurringMatches`~~

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
- "Continue →" button is labeled **"Send Invites →"** (renamed from "Continue →")
- Stale raw IC count label (e.g. "19 players") removed — count is derived live from the grid
- Desktop click handler fixed (was previously touch-only; now handles both mouse and touch)
- `window._cmCache[matchId]` is populated for organizer pending cards at render time so Emergency Fill has match context available

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

## Match Cards

### Format + Gender Label

All match cards (confirmed matches, myInvites, orgPending) show a secondary label line below the organizer name displaying match type + gender preference. The `_fmtGenderPref(pref)` helper maps DB `gender_pref` values:
- `'open'` / `'either'` → `'Open'`
- `'mixed'` → `'Mixed'`
- `'same'` → `'Same Gender'`
- `'mens'` → `"Men's"`
- `'womens'` → `"Women's"`

Label format: `Doubles · Mixed` (or `Singles · Open`, `Doubles · Men's`, etc.). Rendered as: `(m.match_type === 'singles' ? 'Singles' : 'Doubles') + (_fmtGenderPref(m.gender_pref) ? ' · ' + _fmtGenderPref(m.gender_pref) : '')`.

### Counter Chips (Response Status)

`makeResponsePill(matchId, status, count, color)` renders In / Pending / Waitlist / Out counter chips. Each chip has `id="pill-{matchId}-{status}"` for direct DOM access.

Tapping a chip calls `togglePillNames(matchId, status)`, which:
- Closes all other panels and resets their chips to background `#f9fafb`
- Toggles the tapped panel open/closed
- Sets the open chip's background to its active color (In → `#d1fae5`, Pending → `#fef3c7`, Waitlist → `#fef9c3`, Out → `#fff1f2`)

Chip has `transition:background .12s` for smooth highlight. Active background = chip border color (lighter fill). Tapping again closes the panel and resets chip background to `#f9fafb`.

Waitlist chip is hidden from non-organizers when count = 0. Always shown to the organizer regardless of count.

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
