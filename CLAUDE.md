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
- **`app.js`** (~10000 lines) — the entire application: state, UI rendering, page navigation, Supabase calls, and all feature logic.
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
- **`_icCurrentView`** — tracks the active IC member list view: `'alpha'` (default), `'favorites'`, or `'grid'`.
- **`_groups`** — organizer's named groups; loaded by `loadMyGroups()` and `loadRecurringMatches()`.
- **`PENDING_INVITE`** — set by `checkInviteToken()` when `?invite=TOKEN` is in the URL. Holds the invite row from `invite_tokens`. Consumed by `startNewRegistration()` to show `showInviteLandingChoice()` instead of the bare profile form.
- **`window._pendingInviteRef`** — parallel reference to `PENDING_INVITE` for use in inline onclick handlers in dynamically generated HTML.

### Navigation
`showPage(page)` is the sole navigation function. It toggles `.active` on `.page-section` elements and fires a page-specific loader. Page IDs: `dashboard`, `playerProfile`, `findPlayers`, `playerStats`, `innerCircle`, `myCourts`, `myGroups`, `lessons`, `myLessons`, `setupMatch`, `confirmedMatches`, `recordScores`, `myInvites`, `invitedByOthers`, `recurringMatches`.

`showPage()` also manages the floating "← Dashboard" pill button: it removes any existing instance on every navigation, then calls `showBackToDashboard()` for any page other than `dashboard`. The button removes itself on click and calls `showPage('dashboard')`.

`showPage()` calls `window.scrollTo(0, 0)` on every navigation — all pages scroll to top.

### Auth
Supabase magic link (`_supabase.auth.signInWithOtp`). On sign-in, `restoreSession(email)` fetches the player row from `registrations` and populates `SESSION_PLAYER`. Email is also persisted to `localStorage('pb_email')`.

Login modal title: "Welcome to PBallConnect". Magic link button label: "Send Magic Link →" (all states). Success state: "Check your inbox!"

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
| `registrations` | Player profiles (primary record, keyed by email). Includes `wants_organizer` (boolean) and `profile_complete` (boolean) columns added for the Court Captain flow. |
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
`sendEmail({to_email, type, personal_note, invite_url, inviter_name, match_date_str})` in `app.js` calls `POST /api/send-email`, which is the Cloudflare Pages Function. Email types: `match_invite`, `match_update`, `match_decline`, `ic_invite`, `app_invite`.

- The `app_invite` email uses a white-card template (light background, green logo, inviter name, personal note box, green CTA). All other types use the dark-card template. The `app_invite` CTA button href points to `https://pballconnect.com/invite.html?token=TOKEN` (not the main app URL).
- `match_invite` emails use a dynamic personal subject: `"[FirstName] invited you to play pickleball on [Day], [Month] [Date]"`. The `match_date_str` param carries the pre-formatted date string (e.g. "Sun, Apr 20") from the call site.
- `sendEmail()` is called with `await` in the match invite send loop to prevent dropped emails from Resend rate limiting. Each call is wrapped in a per-email try/catch with a failure toast.

### Maps
State and county selection use D3 + TopoJSON with data from `us-atlas` CDN. County-level bounding boxes are computed from GeoJSON coordinates and stored in `S.countyBbox` for proximity filtering. City lookup uses the Overpass API with an embedded fallback dataset.

### PWA
The app registers as an installable PWA. The manifest is injected inline at runtime (top of `app.js`) and also exists as `manifest.json`. Service worker cache key: `pb-registry-v4`.

## Key patterns

- **Supabase anon key is public** — security is enforced by RLS policies in `supabase_rls_policies.sql`, not by hiding the key.
- **All Supabase queries use REST** — PostGIS RPC functions (`rpc/courts_near`) are called for geo queries; plain REST filters are used otherwise.
- **Phone numbers are obfuscated** — `encodePhone`/`decodePhone` functions in `app.js` apply a simple transform before storage.
- **Profile edit mode** — `lockProfileForm()` / `unlockProfileForm()` toggle whether profile fields are editable. `_editModeActive` flag gates `lockProfileForm` (no-op when active). Change detection runs on an interval (`startChangeDetection`) and enables the save button only when a diff is detected. New fields must be added to BOTH `startChangeDetection` AND `showProfileDiff` to work correctly.
- **Match status** — determined client-side by comparing `match_date`/`time_end` to `Date.now()` via `isMatchPast()`.
- **Inline onclick handlers** in dynamically generated HTML run in global scope — they cannot access closure-scoped variables or functions. Always expose handlers as `window.functionName` (e.g., `window._gTogglePlayer`, `window._rmSetHour`).
- **`confirmUninvite`** sets a removed player's `match_responses.response` to `'out'`. This appears as "Declined / Removed" on the invitee's Invited by Others page. The IBO badge counts only `pending` responses.
- **Invite polling** runs every 30 seconds via `startInvitePolling()`. Supabase Realtime is not used — polling is sufficient for current scale.

## Registration / Profile (Step 2)

### Active profile fields (as of current session)
Fields present in the profile form:
- **Step 1:** Email (readonly), First Name, Last Name, Phone, Zip Code (→ geocodes to city/state/lat/lon via Nominatim)
- **Step 2:** Match Type Preference, DUPR Rating (with "What's DUPR?" tooltip), Personal Skill Rating, Play Style chips, Goal Rating (conditional), Age Range, Gender, Playing Hand (Right/Left only — Ambidextrous removed), Playing Since, Availability toggles

### Removed profile fields
The following fields were removed and must NOT be re-added:
- **T-Shirt Size** — removed from form, DB payload, registration summary, `startChangeDetection`, and `showProfileDiff`
- **City / State inputs** — replaced by Zip Code field (see Location below)
- **Address / Street** — `addressSearch` autocomplete and `addrCounty` removed entirely
- **Ambidextrous** — removed from Playing Hand chip group
- **Had a Lesson / Wants a Lesson** — `lessonSection`, `lessonChips`, `lessonOfferSection` removed
- **Wants to Improve buttons** (`improveYesBtn`, `improveFunBtn`) — replaced by Play Style chips

### Location (zip-only)
Location is captured as a single **Zip Code** field (`addrZip`). On input (5+ digits), `onZipChange(val)` calls Nominatim:
```
https://nominatim.openstreetmap.org/search?postalcode=ZIP&country=us&format=json&limit=1&addressdetails=1
```
Stores city (`S.city`), state abbreviation (`S.state`), lat (`S.addrLat`), lon (`S.addrLon`) in `S`. Also writes to hidden `#addrCity` / `#addrState` fields for downstream JS compatibility. Status shown in `#zipGeoStatus` element (e.g. "📍 Phoenix, AZ").

`doSaveProfile` geocodes zip before save if `S.addrLat`/`S.addrLon` are missing. DB payload uses `S.city` / `S.state` (not DOM values).

`getCityLatLon()` reads `S.addrLat` / `S.addrLon` first, then falls back to embedded `CITIES_BY_STATE` dataset, then state center.

`loadMyCourts()` reads `S.city` / `S.state` directly (not DOM `addrCity` / `addrState`).

### Play Style chips
Three chips replacing the old "Wants to Improve" buttons:
- **Just for Fun** — maps to `S.playStyle = 'Fun'`
- **Competitive** — maps to `S.playStyle = 'Competitive'`
- **Both** — maps to `S.playStyle = 'Both'` (pre-selected default)

Implemented as `<span>` elements matching Play Format structure. Handled in `selChip(gid, el, key)` via `key === 'playStyle'` branch.

**Goal Rating field** shows when `S.playStyle === 'Competitive'` OR `S.playStyle === 'Both'`. Hidden for 'Fun'. `restoreProfileForm` uses `(S.playStyle==='Competitive'||S.playStyle==='Both')` check (not the old `improveVal` variable, which no longer exists).

### Field order (Step 2)
1. Match Type Preference
2. DUPR Rating (with tooltip)
3. Personal Skill Rating
4. Play Style chips
5. Goal Rating (conditional on Play Style)
6. Age Range
7. Gender
8. Playing Hand
9. Playing Since
10. Availability toggles

### Availability
Stored as 4 boolean columns on `registrations`:
- `avail_weekday_morning`, `avail_weekday_afternoon`, `avail_weekday_evening`, `avail_weekends`

State keys in `S`: `availWeekdayMorning`, `availWeekdayAfternoon`, `availWeekdayEvening`, `availWeekends`.

UI functions: `toggleAvail(key)`, `updateAvailToggles()`.

"Personal Rating" was renamed to "Personal Skill Rating".

## Navigation structure

### Left nav sections
- **MATCHES:** Confirmed Matches, Players Wanting to Play, Recurring Matches
- **ORGANIZER:** Set Up a Match, My Match Invites, My Groups, Recurring Matches
- **INNER CIRCLE:** (no badge numbers — removed)
- **MY COURTS:** Private (with `#navCourtPrivate` wrapper, `#navCourtPrivateNum` inner span) and Public (with `#navCourtPublic` wrapper, `#navCourtPublicNum` inner span). Labels "Private" and "Public" appear below the badge number.

`updateNavCourtBadges(publicCount, privateCount)` writes to the inner `*Num` spans, not the wrapper elements. The wrappers are hidden when count = 0.

### Dashboard containers
- **Matches container:** "My Match Invites to Others" (orange) and "Match Invites from Others" (blue) — no arrows
- **Inner Circle container:** "My IC" (green), "My Inner Circle Invites to Others" (amber), "Others Inner Circle Invites to Me" (purple). Dashboard buttons call `showPage('innerCircle')` then `showIcView(section)` after a 450ms delay.

### IC page navigation
`showIcSection(section)` is the sole navigation function for the Inner Circle page. Sections: `members`, `invite`, `requests`, `find`. It shows/hides the corresponding IC content sections and highlights the active button. `showIcView(mode)` maps legacy dashboard mode strings to `showIcSection()` and is kept only for backward compatibility — do not call `applyIcViewMode` directly.

The IC page 3-button container uses the same element IDs as the dashboard (`dashIcMemberCount`, `dashIcSentCount`, `dashIcIncomingCount`) so count updates cover both simultaneously. `showIcSection()` syncs these counts eagerly at the top of the function.

`loadNearbyPlayers()` is lazy — only fires when `showIcSection('find')` is called, not on every IC page load.

### IC member list views
`switchIcMemberView(view)` is the sole toggle function. Views:
- **`'alpha'`** (default) — compact one-line rows sorted A–Z: avatar initial, name, nickname, skill pill, favorite star. No Play button.
- **`'favorites'`** — same rows, filtered to starred members only.
- **`'grid'`** — Level Grid: 5-column skill bucketing table (Far Below / Below / My Level / Above / Far Above), names only, clickable via `openPlayerCard()`. ±0.125 tolerance. Center column ("My Level") has green header.

`_icCurrentView` persists across sort/filter operations. `sortInnerCircle()` calls `switchIcMemberView(_icCurrentView)` to re-render in the current view without resetting to alpha.

## Organizer / Court Captain tier

`registrations.is_organizer` (boolean) unlocks organizer tools:
- My Groups page (`myGroups`) — create/edit/delete named groups with primary players + sub pool
- Recurring Matches page (`recurringMatches`) — set schedule, court, auto-invite timing, gap alerts
- Named groups appear as options in Set Up a Match
- `is_organizer` is only set `true` after a full profile is completed

`registrations.wants_organizer` (boolean) is the pre-organizer signal:
- Set `true` when a user indicates they organize matches
- Triggers `showCourtCaptainNudge()` which prompts them to complete their full profile
- `updateNavForUserType()` reads both flags to gray/unlock nav items

**Nav graying (`updateNavForUserType()`):**
- Called after `restoreSession()`, `doSaveProfile()`, Quick Connect save, and `startNewRegistration()`
- `is_organizer=true` → full access to all nav items
- `wants_organizer=true` (not yet organizer) → organizer nav items at 40% opacity; clicking shows Court Captain nudge to complete full profile
- Neither → organizer nav items at 40% opacity; clicking shows "These tools are for Court Captains" toast
- Organizer-gated nav items: `setupMatch`, `myInvites`, `myGroups`, `recurringMatches`

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

**Quick Connect** (`showQuickConnectForm`): minimal overlay — email (readonly), first name, phone, zip code, skill slider, age, playing since, waivers. On save:
- POSTs to `registrations` (no `quick_connect` column — that field does not exist). Payload includes `zip_code`.
- Calls `restoreSession` → sets `SESSION_PLAYER` from DB row, falls back to `{ email, first_name }` minimal object if needed.
- Calls `updateOrganizerNav()`, `updateNavForUserType()`, and `loadAllMatchBadges()`.
- Navigates directly to dashboard with a welcome toast. **No organizer question shown.**

### Key `checkInviteToken()` behavior
- Always sets `PENDING_INVITE` when a valid token is found.
- If `newuser=1` is NOT in the URL (direct link visit, not magic-link return): shows `showInviteBanner` with retries at 300ms / 800ms / 1500ms. Each retry checks `!SESSION_PLAYER?.id` (skip if already registered) and `!document.getElementById('inviteBanner')` (dedup).
- `showInviteBanner` itself also guards: `if(SESSION_PLAYER?.id) return` and `if(document.getElementById('inviteBanner')) return`.

### Email invite creation (`sendInvite`)
Every `app_invite` email creates a **fresh invite row** with `invitee_email` stored. Never reuses an existing token. Uses `Prefer: return=representation` to get the DB-assigned token back. This ensures `invite_tokens` view returns the correct `invitee_email` when the recipient lands on `invite.html`.

`getMyInviteUrl()` handles all invite token generation for IC invite channels. Returns `'https://pballconnect.com/invite.html?token='+token`.

### `invite.html` implementation notes
- No app.js, no shared state, no Supabase session logic.
- Only external dependency: Supabase JS CDN for the OTP call.
- Uses `var` and plain function declarations (no ES modules) for broadest compatibility.
- Error state shown when token is missing or not found in DB.

## Set Up a Match

The 5-step wizard has been replaced with a **single-scroll 7-container page** (`page-setupMatch`). No step indicators, no Next/Back buttons.

### Containers (current step order)
1. **Match Type** — Doubles / Singles pills
2. **Courts & Players** — 1–4 pills + red "needed players" box. Label: "Players needed (you're in):". Organizer always plays; `matchMaxNeeded()` always subtracts 1. The "I'll be playing" checkbox has been removed.
3. **Date & Time** — date picker + start time + duration (+/− in 15-min steps, 0.5h–4h) + read-only end time display. Inline conflict detection:
   - **Overlap conflict** → dark red box (`background:#7f1d1d`), Send button disabled
   - **Same-day non-overlap** → yellow advisory, Send button not blocked
4. **Court** — Public/Private toggle + saved courts list + other courts + "+ Add a new court" button
5. **Play Structure** — Open / Mixed / Same Gender (full-width rows)
6. **Invite** — three modes: Entire IC / Specific Players / Named Group. Live Needed/Invited grid (gender-aware rows for Mixed/Same).
7. **Review & Send** — live summary rows + note textarea + Send button (disabled until date + time + court + no overlap conflict)

Progress bar step labels: `['Match Type','Number of Courts','Date & Time','Court','Play Structure','Invite','Review & Send']`

### State object (`MS`)
```js
const MS = {
  format, numCourts, selectedCourts (Map), group, extraGroups (Set),
  selectedGroups (Set), specificPlayers (Set), primaryPlayers (Set),
  subPlayers (Set), genderPref, isFeeler, date, timeStart, timeEnd,
  duration, location, courtId, courtName, courtAddress, isPrivate,
  hasOverlapConflict, courtType, inviteMode
};
```

### Key sm* helpers
- `smUpdateNeededBox()` — updates the red needed-players count
- `smUpdateSendBtn()` — gates Send on date + time + court + no overlap
- `smUpdateNeededGrid()` — renders Needed/Invited grid (single row for 'either', two rows for 'mixed'/'same')
- `smUpdateSummary()` — renders 4 summary rows in Container 7
- `smCheckConflict()` — async; fetches matches for selected date, sets overlap or same-day warning, sets `MS.hasOverlapConflict`
- `smSetCourtType(type)` — toggles Public/Private, clears selection, calls `smLoadCourts()`
- `smSelectInvite(mode)` — switches invite mode, shows/hides pickers
- `smLoadGroupSelect()` — loads `player_groups` into group dropdown

### Scheduling conflict detection (`checkMatchConflict` / `smCheckConflict`)
Conflict is detected using proper time-range overlap via `toMins()` conversion: `start1 < end2 AND start2 < end1`.
- **Overlap** → `MS.hasOverlapConflict = true`, dark red warning box in Container 3, Send button disabled
- **Same-day non-overlap** → yellow advisory only, Send not blocked
- The conflict modal (`showConflictConfirm`) also appears when accepting an invite if the player already has a committed match that overlaps. It fetches `court_name` and `court_address` for the new invite row so the court column never shows "TBD".

### Court count validation
Only show a red capacity warning if `court_count` is a confirmed positive number AND it is less than `MS.numCourts`. If `court_count` is `null`, `0`, or `undefined` — treat as unknown and show a neutral gray note ("Court count not on file — verify availability") instead of a red error.

## Countdown color logic

`getCountdown(matchDate, timeStart)` returns `{text, urgent, urgency}`:
- `urgency: 'urgent'` — diff < 24h → red `#dc2626` + pulse animation
- `urgency: 'caution'` — diff 24–48h → amber `#f59e0b`
- `urgency: 'normal'` — diff > 48h → gray `#9ca3af`
- Returns `null` if match is past (no countdown shown)

## Product decisions

- **Players must be in PBallConnect to join a group.** No placeholder members. PWA barrier is zero — "If you want to play ball, click a link."
- **Schedule grid removed** — too heavy, goes stale. Replaced with 4 availability toggles + quarterly check-in nudge.
- **Play Style chips are "Just for Fun" / "Competitive" / "Both".** "Both" is the pre-selected default. Goal Rating is shown only when Competitive or Both is selected.
- **Phone number stays in registration Step 1.**
- **T-shirt size removed from profile.** Field is gone from form, payload, summary, and change detection.
- **Zip-only location.** City, State, and street address inputs removed. Zip geocodes via Nominatim on input.
- **Ambidextrous removed** from Playing Hand chip group.
- **Had a Lesson / Wants a Lesson / Wants to Improve removed** from profile form and registration summary.
- **Transactional email only** — no Twilio/SMS yet. Web push notifications are next.
- **Organizer always plays** — "I'll be playing" checkbox removed from Set Up a Match. `matchMaxNeeded()` always subtracts 1 from total slots.
- **Non-organizers see grayed nav** — organizer-only items at 40% opacity with tooltips explaining the Court Captain path.
- **`wants_organizer=true`** shows Court Captain nudge to complete full profile. `is_organizer` is only set after full profile is completed.
- **Scheduling conflicts block Send Invites** — only for true time-range overlaps (`toMins()` formula). Same-day non-overlapping matches show a yellow advisory with specific times. Past date/time shows a "This time has already passed" error and blocks Send.
- **Court picker defaults to Public.** Public/Private toggle filters the saved courts list.
- **Recurring Matches belongs under MATCHES** not ORGANIZER in the nav — visible to all users, grayed for non-organizers.
- **Portrait mode is primary mobile orientation.**
- **Match invite popup removed** — `checkMatchToken()` now navigates directly to `invitedByOthers` page. `showMatchResponseBanner()` has been deleted.
- **Quick Connect goes directly to dashboard** — no organizer question shown after Quick Connect save. Welcome toast shown instead.
- **Set Up a Match and My Match Invites are in the Organizer nav section** — not the Matches section.
- **IC badge numbers removed from left nav** — Inner Circle nav items show no count badges.
- **All pages scroll to top on navigation.** `showPage()` calls `window.scrollTo(0,0)` on every navigation.
- **Inner Circle page uses tab-based section navigation** — `showIcSection('members'|'invite'|'requests'|'find')` replaces the old sticky stats dashboard. `applyIcViewMode()` is now a stub that delegates to `showIcSection()`.
- **IC member list is a compact one-line row** — avatar initial, name, nickname, skill pill, favorite star. No Play button. Play is set up from Set Up a Match.
- **IC member views: Level Grid, Favorites, A–Z (default).** `switchIcMemberView(view)` is the sole toggle. `_icCurrentView` persists across sort/filter operations.
- **Set Up a Match has a sticky yellow→green progress bar** tracking completion across all 7 containers.
- **Step order in Set Up a Match (current):** 1: Match Type, 2: Courts & Players, 3: Date & Time, 4: Court, 5: Play Structure, 6: Invite, 7: Review & Send.
- **Step 2 label says "Players needed (you're in)"** to clarify that the organizer occupies one spot.
- **IC invite uses native device channels** — `sms:` URI for Text (mobile) / clipboard copy (desktop), `mailto:` for Email, clipboard for Copy Link. No forms or backend calls at invite time.
- **Invite URLs use `invite.html`** — `https://pballconnect.com/invite.html?token=TOKEN`. The main app URL is not used for invite landing.
- **Desktop layout capped at 600px centered.** All pages use `max-width:600px;margin:0 auto`.
- **Group types: Set vs Random.** Set groups = fixed priority roster + named subs (organizer controls who plays). Random groups = first to respond fills spots. Group type is defined at creation time in My Groups.
- **Over-invite notification in Step 6** — when invited count exceeds available spots, a warning banner shows how many players will go to the waitlist.
- **Match invite emails use personal subject line** — `"[FirstName] invited you to play pickleball on [Day], [Month] [Date]"`. `match_date_str` is passed from the send-invites call site and constructed in the Cloudflare Pages Function.
- **Login modal says "Welcome to PBallConnect".** Magic link button label is always "Send Magic Link →". Success state shows "Check your inbox!".
- **Court count validation: null/0/undefined = unknown** — show neutral gray note only. Only show red capacity warning if `court_count` is a confirmed positive number AND less than `MS.numCourts`.

## Competitive context

PBallConnect differentiators vs PlayTime Scheduler (market leader, free), Pickleheads, Play More, DiNKR, Picklemates, Pickleball Pro, MatchUp:
- Inner Circle trusted network model
- Set-it-and-forget-it recurring matches
- Court Captain organizer tools
- Zero-friction PWA — no download required

## Known bugs (fix next session)

1. **Dashboard "Invited" box count can diverge from nav badge.** `loadDashTileCounts()` still fetches its own count for the subtitle text line — the `dashSq*` count elements are now driven by `loadAllMatchBadges()` only, but the subtitle (e.g. "2 invites waiting") uses a separate unfiltered fetch. Verify subtitle also filters past matches and self-organized.

2. **Court count shows false error when `court_count` is null.** A partial fix landed (null/0 treated as unknown → gray neutral note). Confirm the fix is live and that `renderCourtCapacityWarning()` no longer fires the red error for null values.

3. **Duplicate courts in "Other Public Courts Nearby".** Courts already in the player's saved list can reappear in the nearby section. Double-dedup fix was applied (API `id=not.in.(allExcludeIds)` + client-side `.filter`). Confirm no regressions with empty saved list.

## Next to build

1. **Play Structure reorder (Bite 2)** — make Play Structure the first container, with branching logic: Set Group path auto-calculates courts from group size; Open/Mixed/Same Gender path runs the full 7-container wizard. This is the highest-leverage UX change.
2. **Set Group vs Random Group implementation** — group type defined at group creation in My Groups. Set groups send invites to priority roster in order; Random groups send to all and first-to-respond fills spots. Sub list auto-activates when a primary declines.
3. **My Match Invites: click status box to see player name list** — In/Pending/Waitlist/Out boxes are tappable to reveal a panel with player names for that status. `_miResponseCache` and `toggleInvitePanel()` are already scaffolded.
4. **Find Players / Browse Nearby on IC page** — `showIcSection('find')` and `loadNearbyPlayers()` are stubbed. Build out the section to surface nearby players not yet in the user's IC, with add/invite actions.
5. **Profile complete flag + Court Captain celebration** — set `profile_complete = true` on `registrations` when full profile is saved via `doSaveProfile()`; show a celebration toast/overlay when `is_organizer` first becomes true.
6. **Landing page at pballconnect.com** — marketing page, not the app. App moves to `pballconnect.com/app` or a subdomain. Google indexing updated to point to landing page.
7. **Terms of Service + Privacy Policy + Waiver pages** — required before public launch.
8. **Web push notifications** — browser push for match invites, IC requests, and gap alerts.
9. **Post-match invite prompt** — "Now invite someone YOU want to play with" shown after confirming attendance or recording scores.

## Pre-launch checklist

- [ ] Terms of Service page
- [ ] Privacy Policy page
- [ ] Liability waiver with real legal language at registration
- [ ] LLC formation
- [ ] Insurance (General Liability, E&O, Cyber)
- [ ] SPF + DKIM + DMARC fully configured in Resend
- [ ] Landing page at pballconnect.com
- [ ] App moved to pballconnect.com/app or subdomain
- [ ] Google indexing updated to landing page, not app
