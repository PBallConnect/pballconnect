# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this app is

**PBallConnect** — a pickleball player-matching PWA. Players register, find others nearby, manage an Inner Circle, and set up/respond to matches.

Deployed on **Cloudflare Pages** at pballconnect.com. No build step, no bundler, no npm. The app is a single-page vanilla JS app served as static files.

## Running locally

Open `index.html` directly in a browser, or serve the repo root with any static file server:

```
npx serve .
# or
python -m http.server
```

There are no tests, no linter, and no build commands.

## Architecture

### Files
- **`app.js`** (~9700 lines) — the entire application: state, UI rendering, page navigation, Supabase calls, and all feature logic.
- **`index.html`** — shell HTML with all page sections (`<div class="page-section" id="page-*">`) and CDN script tags.
- **`styles.css`** — all styles.
- **`invite.html`** — standalone invite landing page (no app.js dependency). Reads `?token=TOKEN`, fetches invite data from the `invite_tokens` view, collects email, sends magic link via Supabase OTP with `emailRedirectTo = https://pballconnect.com/?newuser=1&invite=TOKEN`.
- **`functions/api/send-email.js`** — Cloudflare Pages Function for transactional email via Resend. Reads `RESEND_API_KEY` from Cloudflare env.
- **`supabase_rls_policies.sql`** — Supabase Row Level Security policy definitions (for reference / re-applying). Run this in Supabase SQL editor when schema changes.

### CDN dependencies (no npm)
Loaded in `index.html`: Supabase JS client, D3.js, TopoJSON, and Google Fonts.

### Global state
- **`S`** — single object holding all registration/form state (location, skills, preferences, availability toggles, etc.).
- **`SESSION_PLAYER`** — the authenticated player's database row, set after login/session restore. `null` if not logged in.
- **`SUPABASE_ACCESS_TOKEN`** — JWT from Supabase auth, used in every REST API call as `Authorization: Bearer`.
- **`IC_MEMBERS`** — Inner Circle members array; only populated when IC page is visited. Group/match modals fetch on demand if empty.
- **`_groups`** — organizer's named groups; loaded by `loadMyGroups()` and `loadRecurringMatches()`.
- **`PENDING_INVITE`** — set by `checkInviteToken()` when `?invite=TOKEN` is in the URL. Holds the invite row from `invite_tokens`. Consumed by `startNewRegistration()` to show `showInviteLandingChoice()` instead of the bare profile form.
- **`window._pendingInviteRef`** — parallel reference to `PENDING_INVITE` for use in inline onclick handlers in dynamically generated HTML.

### Navigation
`showPage(page)` is the sole navigation function. It toggles `.active` on `.page-section` elements and fires a page-specific loader. Page IDs: `dashboard`, `playerProfile`, `findPlayers`, `playerStats`, `innerCircle`, `myCourts`, `myGroups`, `lessons`, `myLessons`, `setupMatch`, `confirmedMatches`, `recordScores`, `myInvites`, `invitedByOthers`, `recurringMatches`.

### Auth
Supabase magic link (`_supabase.auth.signInWithOtp`). On sign-in, `restoreSession(email)` fetches the player row from `registrations` and populates `SESSION_PLAYER`. Email is also persisted to `localStorage('pb_email')`.

### Supabase integration
All DB access uses the Supabase REST API via direct `fetch` calls (not the Supabase JS query builder). Every request includes:
```js
headers: {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': 'Bearer ' + SUPABASE_ACCESS_TOKEN
}
```

Supabase join syntax (`table(col,col)`) only works when FK relationships are configured in PostgREST. If joins are unreliable, use the two-step pattern: fetch IDs first, then fetch details with `?id=in.(...)`.

### Database tables
| Table | Purpose |
|---|---|
| `registrations` | Player profiles (primary record, keyed by email) |
| `connections` | Inner Circle relationships |
| `matches` | Match events created by organizers |
| `match_responses` | Player responses (in/out/waitlist/pending) per match |
| `match_results` / `match_scores` | Recorded game scores |
| `courts` | Court locations (public + private) |
| `player_courts` | Which courts a player uses |
| `invites` | App invite links |
| `player_feedback` | Post-match player feedback |
| `player_availability` | Player schedule availability |
| `player_groups` | Named groups created by organizers |
| `player_group_members` | Members of each group (role: 'primary' or 'sub') |
| `recurring_matches` | Recurring match schedules with auto-invite settings |

### Views
| View | Purpose |
|---|---|
| `public_profiles` | Player-facing queries — excludes sensitive fields (phone, email, DOB, waiver data). Use this for find-players / IC lookups. |
| `invite_tokens` | Anonymous-safe invite link reads |

### Email
`sendEmail({to_email, type, personal_note, invite_url, inviter_name})` in `app.js` calls `POST /api/send-email`, which is the Cloudflare Pages Function. Email types: `match_invite`, `match_update`, `match_decline`, `ic_invite`, `app_invite`.

The `app_invite` email uses a white-card template (light background, green logo, inviter name, personal note box, green CTA). All other types use the dark-card template. The `app_invite` CTA button href points to `https://pballconnect.com/invite.html?token=TOKEN` (not the main app URL).

### Maps
State and county selection use D3 + TopoJSON with data from `us-atlas` CDN. County-level bounding boxes are computed from GeoJSON coordinates and stored in `S.countyBbox` for proximity filtering. City lookup uses the Overpass API with an embedded fallback dataset.

### PWA
The app registers as an installable PWA. The manifest is injected inline at runtime (top of `app.js`) and also exists as `manifest.json`.

## Key patterns

- **Supabase anon key is public** — security is enforced by RLS policies in `supabase_rls_policies.sql`, not by hiding the key.
- **All Supabase queries use REST** — PostGIS RPC functions (`rpc/courts_near`) are called for geo queries; plain REST filters are used otherwise.
- **Phone numbers are obfuscated** — `encodePhone`/`decodePhone` functions in `app.js` apply a simple transform before storage.
- **Profile edit mode** — `lockProfileForm()` / `unlockProfileForm()` toggle whether profile fields are editable. Change detection runs on an interval (`startChangeDetection`) and enables the save button only when a diff is detected. New fields must be added to BOTH `startChangeDetection` AND `showProfileDiff` to work correctly.
- **Match status** — determined client-side by comparing `match_date`/`time_end` to `Date.now()` via `isMatchPast()`.
- **Inline onclick handlers** in dynamically generated HTML run in global scope — they cannot access closure-scoped variables or functions. Always expose handlers as `window.functionName` (e.g., `window._gTogglePlayer`, `window._rmSetHour`).
- **`confirmUninvite`** sets a removed player's `match_responses.response` to `'out'`. This appears as "Declined / Removed" on the invitee's Invited by Others page. The IBO badge counts only `pending` responses.

## Registration / Profile (Step 2)

The schedule grid was removed. Availability is now stored as 4 boolean columns on `registrations`:
- `avail_weekday_morning`, `avail_weekday_afternoon`, `avail_weekday_evening`, `avail_weekends`

State keys in `S`: `availWeekdayMorning`, `availWeekdayAfternoon`, `availWeekdayEvening`, `availWeekends`.

UI functions: `toggleAvail(key)`, `updateAvailToggles()`.

The "wants to improve" field stores `'improve'` or `'fun'` (old DB values `'Yes'`/`'No'` are normalized on restore). UI: `selectImproveGoal(val)`, `updateGoalGapViz()`.

"Personal Rating" was renamed to "Personal Skill Rating".

## Organizer / Court Captain tier

`registrations.is_organizer` (boolean) unlocks organizer tools:
- My Groups page (`myGroups`) — create/edit/delete named groups with primary players + sub pool
- Recurring Matches page (`recurringMatches`) — set schedule, court, auto-invite timing, gap alerts
- Named groups appear as options in Set Up a Match Step 4

Only one organizer tier exists (no multi-tier). Features are progressively disclosed based on `SESSION_PLAYER.is_organizer`.

## Groups & Recurring Matches

**Groups modal (`_openGroupModal`):**
- Organizer tile is always first, highlighted red, non-clickable
- Size chips (4/8/12/16) control slot count; live counter shows remaining spots
- Sub pool section uses `role:'sub'` in `player_group_members`
- All interactive handlers exposed as `window._gTogglePlayer`, `window._gToggleSub`, `window._gSave`
- IC members are fetched on demand if `IC_MEMBERS` is empty

**Recurring match modal (`_openRecurringModal`):**
- Async — fetches organizer's courts via two-step query before rendering
- Time picker: three `<select>` dropdowns (hour 1–12, minute 0/15/30/45, AM/PM). `:00` and `:30` render in dark green.
- Time warnings: before 6 AM or after 8 PM — shows acknowledge buttons ("Yes, I meant AM/PM" or "No, switch"). `rmWarnAck` flag suppresses after acknowledgment; resets on any time change.
- Duration: +/− buttons in 15-min increments (0.5h–4h), same pattern as Set Up a Match
- Court picker: dropdown from `player_courts` (two-step fetch). Shows amber callout if no courts configured.
- Auto-invite smart default: ≥2 days/week selected → 24h (1 day); 1 day/week → 72h (3 days). Recalculates when days toggle (new matches only).
- Gap alert options: 12h, 24h (1 day), 48h (2 days), 72h (3 days). Default 24h.
- Required fields: Group, Start Time, Court — marked with red `*`, validated before confirm overlay.
- Confirm overlay (`rmConfirmOverlay`) shows full summary before any DB write. "Go Back" dismisses without losing state.
- Group field uses `window._rmSetGroup` (not inline `onchange`) to properly update closure state across re-renders.

## Invite flow

New users arrive via `invite.html?token=TOKEN` (linked from the `app_invite` email). The full flow:

### Phase 1 — Pre-auth landing (`invite.html`)
1. `invite.html` reads `?token=TOKEN`, fetches invite data from `invite_tokens` view (anon-safe).
2. Displays branded card: inviter name, personal note, pre-filled email input.
3. On submit: calls `_supabase.auth.signInWithOtp` with `emailRedirectTo = https://pballconnect.com/?newuser=1&invite=TOKEN`.
4. Shows success message — user checks email.

### Phase 2 — Magic link return (`pballconnect.com/?newuser=1&invite=TOKEN`)
1. `checkInviteToken()` fires on page load, reads `?invite=TOKEN`, fetches invite row, sets `PENDING_INVITE` and `window._pendingInviteRef`.
2. Because `newuser=1` is present, **banner is skipped entirely** — no `showInviteBanner` calls.
3. Supabase auth session restores → `restoreSession(email)` finds no registration row → `startNewRegistration(email)`.
4. `startNewRegistration` checks URL for `newuser=1` + `invite=TOKEN`:
   - If `PENDING_INVITE` already set by `checkInviteToken`: goes straight to `showInviteLandingChoice`.
   - If `PENDING_INVITE` not yet set (race): re-fetches invite row from `invite_tokens`, sets `PENDING_INVITE`, then shows `showInviteLandingChoice`.
5. `showInviteLandingChoice` offers two paths: **Full Profile** or **Quick Connect**.

### Phase 3 — Registration choice
**Full Profile** (`_inviteChoiceFull`): navigates to the standard `playerProfile` form (Steps 1–4).

**Quick Connect** (`showQuickConnectForm`): minimal overlay — email (readonly), first name, phone, skill slider, age, playing since, waivers. On save:
- POSTs to `registrations` (no `quick_connect` column — that field does not exist).
- Calls `restoreSession` → sets `SESSION_PLAYER` from DB row, falls back to `{ email, first_name }` minimal object if needed.
- Calls `updateOrganizerNav()` and `loadAllMatchBadges()`.
- Navigates to `dashboard`.

### Key `checkInviteToken()` behavior
- Always sets `PENDING_INVITE` when a valid token is found.
- If `newuser=1` is NOT in the URL (direct link visit, not magic-link return): shows `showInviteBanner` with retries at 300ms / 800ms / 1500ms. Each retry checks `!SESSION_PLAYER?.id` (skip if already registered) and `!document.getElementById('inviteBanner')` (dedup).
- `showInviteBanner` itself also guards: `if(SESSION_PLAYER?.id) return` and `if(document.getElementById('inviteBanner')) return`.

### Email invite creation (`sendInvite`)
Every `app_invite` email creates a **fresh invite row** with `invitee_email` stored. Never reuses an existing token. Uses `Prefer: return=representation` to get the DB-assigned token back. This ensures `invite_tokens` view returns the correct `invitee_email` when the recipient lands on `invite.html`.

### `invite.html` implementation notes
- No app.js, no shared state, no Supabase session logic.
- Only external dependency: Supabase JS CDN for the OTP call.
- Uses `var` and plain function declarations (no ES modules) for broadest compatibility.
- Error state shown when token is missing or not found in DB.

## Countdown color logic

`getCountdown(matchDate, timeStart)` returns `{text, urgent, urgency}`:
- `urgency: 'urgent'` — diff < 24h → red `#dc2626` + pulse animation
- `urgency: 'caution'` — diff 24–48h → amber `#f59e0b`
- `urgency: 'normal'` — diff > 48h → gray `#9ca3af`
- Returns `null` if match is past (no countdown shown)

## Product decisions

- **Players must be in PBallConnect to join a group.** No placeholder members. PWA barrier is zero — "If you want to play ball, click a link."
- **Schedule grid removed** — too heavy, goes stale. Replaced with 4 availability toggles + quarterly check-in nudge.
- **"I play just for fun"** replaces "Not really" as the non-improvement goal option.
- **Phone number stays in registration Step 1.**
- **Playing since, goal rating, t-shirt size kept** in profile.
- **Transactional email only** — no Twilio/SMS yet. Web push notifications are next.

## Competitive context

PBallConnect differentiators vs PlayTime Scheduler (market leader, free), Pickleheads, Play More, DiNKR, Picklemates, Pickleball Pro, MatchUp:
- Inner Circle trusted network model
- Set-it-and-forget-it recurring matches
- Court Captain organizer tools
- Zero-friction PWA — no download required

## Next to build

1. Group edit notifications (player added/removed gets notified)
2. Player personality badge creator (Step 3)
3. Quick Match feature (5 taps, one-off)
4. Smart gap alerts ("Still need 1 for tomorrow")
5. Web push notifications
6. Terms of Service + How We Protect You pages in `index.html`
7. Simplified registration flow (Quick Connect is now the invite path; full flow still used for organic signups)
