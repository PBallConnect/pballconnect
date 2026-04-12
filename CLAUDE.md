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
- **`app.js`** (~8500 lines) — the entire application: state, UI rendering, page navigation, Supabase calls, and all feature logic.
- **`index.html`** — shell HTML with all page sections (`<div class="page-section" id="page-*">`) and CDN script tags.
- **`styles.css`** — all styles.
- **`functions/api/send-email.js`** — Cloudflare Pages Function for transactional email via Resend. Reads `RESEND_API_KEY` from Cloudflare env.
- **`supabase_rls_policies.sql`** — Supabase Row Level Security policy definitions (for reference / re-applying).

### CDN dependencies (no npm)
Loaded in `index.html`: Supabase JS client, D3.js, TopoJSON, and Google Fonts.

### Global state
- **`S`** — single object holding all registration/form state (location, schedule, skills, preferences, etc.).
- **`SESSION_PLAYER`** — the authenticated player's database row, set after login/session restore. `null` if not logged in.
- **`SUPABASE_ACCESS_TOKEN`** — JWT from Supabase auth, used in every REST API call as `Authorization: Bearer`.

### Navigation
`showPage(page)` is the sole navigation function. It toggles `.active` on `.page-section` elements and fires a page-specific loader. Page IDs: `dashboard`, `playerProfile`, `findPlayers`, `playerStats`, `innerCircle`, `myCourts`, `lessons`, `myLessons`, `setupMatch`, `confirmedMatches`, `recordScores`, `myInvites`, `invitedByOthers`.

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

### Database tables
| Table | Purpose |
|---|---|
| `registrations` | Player profiles (primary record, keyed by email) |
| `connections` | Inner Circle relationships |
| `matches` | Match events created by organizers |
| `match_responses` | Player responses (in/out/waitlist) per match |
| `match_results` / `match_scores` | Recorded game scores |
| `courts` | Court locations (public + private) |
| `player_courts` | Which courts a player uses |
| `invites` | App invite links |
| `player_feedback` | Post-match player feedback |
| `player_availability` | Player schedule availability |

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
- **Profile edit mode** — `lockProfileForm()` / `unlockProfileForm()` toggle whether profile fields are editable. Change detection runs on an interval (`startChangeDetection`) and enables the save button only when a diff is detected.
- **Match status** — determined client-side by comparing `match_date`/`time_end` to `Date.now()` via `isMatchPast()`.
