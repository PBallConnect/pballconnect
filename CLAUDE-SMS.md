# CLAUDE-SMS.md — SMS System Architecture

_General SMS infrastructure + Match Invite SMS system (added May 16, 2026) + Waitlist Promotion SMS/Email system (added July 3, 2026)._
_Cross-reference: CLAUDE.md (overview), CLAUDE-SCHEMA.md (schema), CLAUDE-RULES.md (Rules 33, 37–43, 48, 59, 60)._

_Last updated: July 3, 2026_

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
- `/api/log-sms-consent` — POST endpoint added May 17, 2026. Validates request body and inserts a row into `sms_consent_log` via `SUPABASE_SERVICE_KEY`. Called by client after any opt-in or opt-out action.

### TCPA Consent Audit Log (`sms_consent_log`)

_Added May 17, 2026_

Append-only table recording every SMS consent event for TCPA compliance.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid | PK, auto-generated |
| `player_email` | text | Player who consented or opted out |
| `event` | text | `'opt_in'` or `'opt_out'` |
| `method` | text | Source of event (e.g. `'registration'`, `'quick_connect'`, `'sms_invite'`, `'twilio_stop'`, `'twilio_start'`) |
| `ip_address` | text | Request IP (from CF-Connecting-IP header) |
| `user_agent` | text | Request User-Agent |
| `created_at` | timestamptz | Auto set to `now()` |

**RLS:** Players can SELECT their own rows (`player_email = auth.email()`). Service role only for INSERT. Never UPDATE or DELETE. See Rule 49.

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
5. If waitlist is empty **and** `SESSION_PLAYER` is the organizer → calls `window.showEmergencyFill(matchId, null)` after 800ms

A red **🚨 Emergency Fill** button also appears on the organizer's confirmed match card whenever `inPlayers.length < maxNeeded`. Clicking it opens `showEmergencyFill(matchId, null)` directly.

### Emergency Fill Screen

_Added May 10, 2026_

Full-screen organizer tool for quickly filling an open spot when the waitlist is empty.

**Overlay:** `#emergencyFillOverlay` — `position:fixed; inset:0; z-index:9500; background:#fff; display:none; overflow-y:auto`

**Entry points:**
- Auto-triggered at the end of `confirmCantMakeIt()` when waitlist is empty and `SESSION_PLAYER` is the organizer (800ms delay after reload)
- Manual: 🚨 **Emergency Fill** button on organizer's confirmed match card when `inPlayers.length < maxNeeded`
- Manual: 🚨 **Fill This Spot →** button in the expanded view of orgPending Section 3 cards when `remaining > 0` and waitlist is empty (orgPending also populates `window._cmCache[matchId]` at render time)
- Deep-link: `?action=emergency_fill&match=MATCH_ID` — `checkMatchToken` skips processing when `action=emergency_fill`; `restoreSession` fires `showEmergencyFill()` after login. For unauthenticated arrivals, match ID is stored in `sessionStorage('pb_ef_matchId')` and consumed by `restoreSession` after login. URL is cleared via `history.replaceState` after processing.

**Gender filter logic (`_efGenderNeeded`):**
- `format = 'mixed'` → dropped player's gender (pass `null` if not on file → screen falls back to full IC)
- `format = 'mens'` → `'Man'`
- `format = 'womens'` → `'Woman'`
- `format = 'open'` → no filter (`null`)

**Gender override:** When `_efGenderNeeded` is set, the overlay shows "Showing [Gender]s only · Show all IC instead →". Tapping the link calls `efOverrideGender()`, which clears `_efGenderNeeded`, hides the toggle (`id="efGenderToggle"`), and re-renders the current mode (`_efCurrentMode`) without the gender filter.

**Candidate pool:** IC members are extracted from `IC_MEMBERS` via `m.player` wrappers into a local `_efMemberFlat` array — `IC_MEMBERS` itself is never overwritten. If `IC_MEMBERS` is empty, connections + profiles are fetched directly from Supabase into `_efMemberFlat`. Pool is then filtered to players whose `email` is NOT already in `match_responses` with `response IN ('in','pending','waitlist')` for this match.

**4 modes (tiles):** Operating on the gender-filtered IC, excluding already-confirmed players.
| Mode | Icon | Behavior |
|---|---|---|
| Same Gender | 👫 | Filters pool to `_efGenderNeeded` gender; falls back to full IC if no matches |
| My Level | 🎯 | IC sorted by proximity to `SESSION_PLAYER.skill_self`; falls back to full IC if no matches |
| All IC Members | 👥 | Shows full candidate pool, alpha sorted |
| Send a Text | 💬 | Opens `sms:?body=...` URI immediately; no list shown |

**Mobile UX:** Mode tiles stack vertically (1-column grid, `grid-template-columns:1fr`), `min-height:56px`, icon + text in horizontal flex layout (`display:flex; align-items:center; gap:14px`). Send bar is `position:fixed; bottom:0; left:0; right:0; z-index:10001` so it stays above the overlay scroll area. Send button: `width:100%; max-width:520px; display:block; margin:0 auto`.

**`efSendInvites()`:** For each selected email — (1) upserts `match_responses` as `'pending'` with `resolution=merge-duplicates`; (2) sends email invite (`type:'match_invite'`); (3) sends SMS (opt-in gated, best-effort per Rule 38), both in separate try/catch. Auto-dismisses overlay after 2500ms and shows success toast.

**Window globals:** `showEmergencyFill`, `efSelectMode`, `efTogglePlayer`, `efSendInvites`, `efBack`, `efDismiss`, `efOverrideGender`

**Internal state (module-level):** `_efMatchId`, `_efMemberFlat`, `_efGenderNeeded`, `_efSelectedEmails`, `_efMatchData`

---

## Match Invite SMS System

_Added May 16, 2026_

Sends a signed SMS to opted-in IC members when an organizer creates a match. The recipient can RSVP YES or NO directly from the link — no app login required.

### Env var
- `MATCH_INVITE_SECRET` — 32-byte random hex secret (set in Cloudflare Pages → Settings → Environment variables, both Production and Preview). Used to sign and verify all match invite HMAC tokens.

### Token format
`${matchId}|${inviteePhone}|${inviteeName}|${organizerEmail}|${expiry}`

- Signed with HMAC-SHA256 using `MATCH_INVITE_SECRET`
- Expiry = `Date.now() + 7 days`
- URL: `/match-invite.html?t=ENCODED_TOKEN&s=HEX_SIGNATURE`

### Pages Functions

| Function | Method | Purpose |
|---|---|---|
| `/api/match-invite-token` | POST `{ matchId, inviteePhone, inviteeName, organizerEmail }` | Builds and signs the token, returns `{ token, signature, url }` |
| `/api/match-invite-sms-data` | POST `{ playerEmail }` | Looks up `phone` and `sms_opt_in` via service key — never exposes these through `public_profiles` |
| `/api/match-invite-lookup` | GET `?t=TOKEN&s=SIG` | Validates signature + expiry, returns `{ registered, inviteeName, inviteePhone, inviteeData, matchDetails }` |
| `/api/match-invite-respond` | POST `{ token, signature, response }` | Verifies token, upserts `match_responses`, PATCHes `invites` row by `match_id + invitee_phone` |

### SMS loop in `submitMatch()`

After the email invite loop, for each invitee:
1. POST `/api/match-invite-sms-data` to get `{ phone, sms_opt_in }` — skip if not opted in or phone invalid
2. INSERT invite tracking row into `invites` with `match_id`, `invitee_phone`, `invitee_email`, `invite_method: 'sms'`
3. POST `/api/match-invite-token` to get the signed URL
4. Build SMS message: `"Hey [first_name]! [organizer] invited you to pickleball on [date] @ [time] at [location]. Tap to respond: [url]"`
5. `await sendSms({ player_email, message, match_id, event_type: 'match_invite' })` — best-effort, own try/catch

### `match-invite.html`

Standalone page (no app.js). On load calls `GET /api/match-invite-lookup`. Three states:
- **Registered player** — shows match details + YES/NO buttons → POST `/api/match-invite-respond`
- **Unregistered, taps YES** — shows compact match summary + 4-field mini form (gender chips, skill slider, zip, email) → POST `/api/sms-register`
- **Unregistered, taps NO** — warm decline message + soft pitch with "Sign Me Up!" (→ `invite.html`) and "Maybe Later"

### `invites` table changes
Two new columns added (May 16, 2026):
- `invitee_phone text` — 10-digit phone, populated for SMS match invite rows
- `match_id uuid references matches(id) on delete cascade` — populated for SMS match invite rows

`match-invite-respond.js` PATCHes `invites` using `match_id=eq.X&invitee_phone=eq.Y` (not `invitee_email`) — this is why both columns exist.

### Critical constraints
- **`phone` and `sms_opt_in` must never be added to `public_profiles`** — use `/api/match-invite-sms-data` (service key) for any server-side lookup of these fields. See Rule 48.
- Token signature must be verified before any DB write — `match-invite-lookup` and `match-invite-respond` both verify HMAC before acting.
- SMS is always best-effort. Token/lookup failures per player are caught and logged; they never abort the match creation flow.

---

## Waitlist Promotion SMS/Email System

_Added July 3, 2026_

Signed, no-login-required tap-to-respond links sent when a waitlisted player is promoted to a pending spot (a player ahead of them declined, or another player dropped and the spot cascades to the waitlist). Mirrors the Match Invite SMS System's signed-link pattern above, but is email-keyed (the player is always already registered) rather than phone-keyed, and expires at the match's own start time rather than a fixed 7-day window.

### Token format

`${matchId}|${playerEmail}|${expiry}`

- Signed with HMAC-SHA256 using the same `MATCH_INVITE_SECRET` env var as the match invite tokens
- `expiry` = `new Date(match_date + 'T' + time_start).getTime() + 12 hours` — the match's own start time plus a fixed 12-hour safety buffer, **not** a fixed 7-day window
- The 12h buffer exists because the Worker runtime has no fixed local timezone (effectively UTC) while `match_date`/`time_start` are interpreted in the player's local browser timezone elsewhere in the app — a naive combined timestamp could be off by several hours either way. Worst-case US timezone skew is under 10 hours, so +12h guarantees the token can never expire *before* the real match start. The only downside is the link staying valid a few extra hours after the match has actually started, which is low-risk since the `prevent_match_overfill` DB trigger (Rule 59) still protects against genuine overfill regardless of when the link is clicked
- URL: `/waitlist-promo.html?t=ENCODED_TOKEN&s=HEX_SIGNATURE`
- If the match's `match_date`/`time_start` can't be found or parsed, token generation fails (400/404/500) and the caller falls back to the plain app URL (see Fallback below)

### Pages Functions

| Function | Method | Purpose |
|---|---|---|
| `functions/api/waitlist-promo-token.js` | POST `{ matchId, playerEmail }` | Fetches the match's `match_date`/`time_start` via service key, computes expiry, builds and signs the token, returns `{ token, signature, url }` |
| `functions/api/waitlist-promo-lookup.js` | GET `?t=TOKEN&s=SIG` | Verifies HMAC (re-derived from scratch, nothing trusted from client), checks expiry, then returns `{ playerFirstName, matchDetails, currentResponseStatus }`. `matchDetails` selects `match_date,time_start,time_end,court_name,match_type,gender_pref,organizer_name,organizer_email` from `matches` — deliberately omits `format` (no live query anywhere selects a `format` column from `matches`; it's derived client-side from `match_type` + `gender_pref` instead). `currentResponseStatus` is read fresh from `match_responses` so the page can tell whether this player is actually still `'pending'` (promotable) or has since responded/been reassigned. |
| `functions/api/waitlist-promo-respond.js` | POST `{ token, signature, response }` (`response` must be `'in'` or `'out'`) | Verifies HMAC + expiry independently of the lookup function, then PATCHes `match_responses` (falls back to INSERT if the PATCH matches zero rows — mirrors `respondToMatch()`'s PATCH-then-INSERT-fallback pattern in `app.js`, applied here to both `'in'` and `'out'`, not just the merge-duplicates POST that the older `match-invite-respond.js` uses). |

**`MATCH_FULL` handling in `waitlist-promo-respond.js`:** if the PATCH or fallback INSERT fails with error text containing `MATCH_FULL` (the `prevent_match_overfill` trigger — Rule 59), the endpoint returns HTTP 200 with `{ success:false, reason:'MATCH_FULL' }` rather than an error status — `waitlist-promo.html` checks `data.reason === 'MATCH_FULL'` and shows the "⏳ Spot Already Taken" informational state, styled to mirror `showMatchFullConfirm()`'s amber treatment in the main app. Note: a decline (`response:'out'`) from this link never writes `'waitlist_left'` — by the time this link is reachable the player's row is already `'pending'` (flipped from `'waitlist'` at promotion time), so `'out'` is the correct value, identical to any other pending-invite decline. `'waitlist_left'` is reserved for the Leave Waitlist button (`leaveWaitlist()` in `app.js`), which acts on a still-`'waitlist'`-status row.

### `waitlist-promo.html`

Standalone page, no app.js dependency, no login required. States: loading → invite card (or an informational "nothing to respond to" state if `currentResponseStatus !== 'pending'`, with per-status messaging including `'waitlist_left'`) → response. The invite card shows a two-button row: **✅ I'M IN** (`.btn-in`, large/primary, `flex:1.6`, green) and **OUT** (`.btn-out`, small/secondary, `flex:1`, gray outline). Tapping IN shows a confirm-first step ("Are you sure? You'll be confirmed for this match." / Yes, Confirm Me / Cancel) before submitting — tapping OUT submits immediately with no confirmation step. On success shows a themed confirmation (🎾 "You're confirmed!" for IN, 👋 "Got it" for OUT); on `MATCH_FULL` shows the amber "Spot Already Taken" card; on any other failure shows a generic retry state.

### Two callers, two notification profiles

- **`promoteFromWaitlist(matchId, match)`** (app.js ~line 8209) — fires from `respondToMatch()` when a player's decline drops the confirmed count below the needed count. Promotes the single earliest-waitlisted player (`order=responded_at.asc&limit=1`) to `'pending'` with `filled_from_waitlist:true`. Sends a `match_update` email only — **does not currently send an SMS**.
- **`confirmCantMakeIt()`'s promotion loop** (app.js ~line 8395) — fires from the "Can't Make It" drop flow. Threshold logic per Rule 43: `hoursUntilMatch <= 24` → scramble (ALL waitlisted players promoted to `'pending'` with `filled_from_waitlist:true`, notified simultaneously, `event_type:'waitlist_scramble'`); otherwise → standard (first waitlisted player only, `event_type:'waitlist_promote'`). Sends **both** a `match_update` email and an SMS for each promoted player.

### SMS length — no 160-char truncation for these two event types

Every other SMS in the app that includes free text truncates defensively with `.substring(0,160)` (e.g. the organizer drop notification, `event_type:'player_dropped'`, at app.js ~line 8373). The `waitlist_scramble` and `waitlist_promote` messages (app.js ~lines 8453 and 8472) deliberately skip this truncation — the signed link alone typically runs ~180–205 characters, already over the single-segment SMS limit, so truncating would cut off the link itself. Twilio automatically splits the untruncated message into multiple concatenated segments (slightly higher cost, no functional downside) — this is an intentional, documented exception, not an oversight.

### Fallback: best-effort link generation, never blocks the promotion

Both callers wrap the `POST /api/waitlist-promo-token` call in its own try/catch. If the call fails or returns non-OK, `matchUrl` stays at its pre-set fallback value — the old plain app URL (`window.location.origin + window.location.pathname + '?match=' + matchId`) — and the notification (email and/or SMS) still sends with that URL instead of the signed tap-to-respond link. Per Rule 38, notification-adjacent failures must never abort the promotion itself; a promoted player who gets the plain-URL fallback can still open the app and respond normally from the Waitlist page.
