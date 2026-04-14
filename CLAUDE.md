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
- **`app.js`** (~9500 lines) — the entire application: state, UI rendering, page navigation, Supabase calls, and all feature logic.
- **`index.html`** — shell HTML with all page sections (`<div class="page-section" id="page-*">`) and CDN script tags.
- **`styles.css`** — all styles.
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
`sendEmail({to_email, type, personal_note, invite_url})` in `app.js` calls `POST /api/send-email`, which is the Cloudflare Pages Function. Email types: `match_invite`, `match_update`, `match_decline`, `ic_invite`, `app_invite`.

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
2. Minimum-friction invite landing page (name + skill slider, ~60 seconds)
3. Simplified registration flow
4. Player personality badge creator (Step 3)
5. Quick Match feature (5 taps, one-off)
6. Smart gap alerts ("Still need 1 for tomorrow")
7. Web push notifications
8. Terms of Service + How We Protect You pages in `index.html`
