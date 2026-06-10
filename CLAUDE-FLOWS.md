# CLAUDE-FLOWS.md — User Flow Definitions

_Created June 2026. Cross-reference: CLAUDE.md, CLAUDE-SCHEMA.md, CLAUDE-RULES.md, CLAUDE-SMS.md._
_Update this file whenever any function in a flow chain is modified. Never change a flow without updating here first._

---

## How To Use This File

Each flow defines the exact sequence of steps a user experiences, the URL params present at each step, the global state variables that must be set, and which function hands off to which. Before modifying any auth, registration, or invite flow — read the relevant flow here first. After any fix — update the flow here to reflect the new behavior.

---

## Global State Variables Referenced In Flows

| Variable | Set By | Purpose |
|---|---|---|
| `SESSION_PLAYER` | `restoreSession()` | Null if unauthenticated or new user. Set after profile row fetched. |
| `PENDING_INVITE` | `checkInviteToken()` | Holds invite token data when user arrives via `?invite=TOKEN` or `?qr=QR_ID` |
| `SUPABASE_ACCESS_TOKEN` | `onAuthStateChange` | Equals `SUPABASE_ANON_KEY` before login. Real token after magic link auth. |
| `_newUserRegistrationStarted` | `startNewRegistration()` | Double-call guard — prevents two registration overlays from stacking |
| `_isNewRegistration` | `doSaveProfile()` | Captured as `!SESSION_PLAYER` BEFORE the re-fetch. Never read `SESSION_PLAYER` after async re-fetch for this check. |

---

## Flow 1 — Email IC Invite → New User → Full Profile

**Entry point:** Organizer sends IC email invite via PBallConnect UI.

| Step | Function / Action | URL Params | State | User Sees |
|---|---|---|---|---|
| 1 | Organizer taps Send in IC invite panel | — | — | Toast: invite sent |
| 2 | Resend delivers email to invitee | — | — | Invite email in inbox |
| 3 | Invitee taps CTA in email | — | — | `invite.html?token=TOKEN` |
| 4 | `invite.html` validates token — checks `is_used`, fetches inviter name | `?token=TOKEN` | — | Invite card with inviter name + email input |
| 5 | Invitee enters email, taps Submit | — | — | "Magic link sent" confirmation |
| 6 | `showInviteEmailStep()` sends magic link with `emailRedirectTo: app.html?newuser=1&invite=TOKEN` | — | — | — |
| 7 | Invitee taps magic link in email | — | — | Redirects to `app.html?newuser=1&invite=TOKEN` |
| 8 | `initApp()` fires → `checkInviteToken()` reads `?invite=TOKEN`, sets `PENDING_INVITE` | `?newuser=1&invite=TOKEN` | `PENDING_INVITE` set | Loading |
| 9 | `onAuthStateChange` fires → `restoreSession()` finds no profile row | — | `SESSION_PLAYER = null` | — |
| 10 | `startNewRegistration()` fires — `_newUserRegistrationStarted` guard set | — | `_newUserRegistrationStarted = true` | Full Profile or Quick Connect choice overlay |
| 11 | Invitee taps Full Profile | — | — | 2-step registration form |
| 12 | Invitee completes all fields, taps Complete Registration | — | — | — |
| 13 | `doSaveProfile()` — captures `_isNewRegistration = !SESSION_PLAYER` BEFORE re-fetch | — | `_isNewRegistration = true` | — |
| 14 | Profile row saved to `registrations` | — | — | — |
| 15 | Re-fetch populates `SESSION_PLAYER` | — | `SESSION_PLAYER` now set | — |
| 16 | `_isNewRegistration` is true → `showFoundingMemberOverlay()` → calls `handlePostRegistrationInvite()` | — | — | "You're All Set" screen |
| 17 | `handlePostRegistrationInvite()` finds `PENDING_INVITE` → shows "Join [inviter]'s IC?" prompt | — | — | IC join prompt overlay |
| 18 | Invitee taps Yes → original `connections` row patched to `approved`. Reciprocal row created as `pending` — inviter must explicitly accept before it counts in their My IC | — | — | — |
| 19 | `confirmOverlay` hidden → `showPage('dashboard')` | — | — | Dashboard — green IC tile = 1 |

**Critical rules:** Rule 51 (redirects → `app.html`), Rule 16 (check `is_used`), Rule 36 (`Prefer: return=minimal`).

**Known regression history:** June 2026 — `_isNewRegistration` declared inside `try{}` caused silent `ReferenceError` after save. Fix: declare before `try{}`.

---

## Flow 2 — Email IC Invite → New User → Quick Connect

Steps 1–10 identical to Flow 1. Then:

| Step | Function / Action | User Sees |
|---|---|---|
| 11 | Invitee taps Quick Connect | Minimal overlay: First Name + gender chips + skill slider + zip + email |
| 12 | Invitee completes form, taps Save | — |
| 13 | `_qcSave()` saves row, checks `PENDING_INVITE` → calls `handlePostRegistrationInvite()` | "You're All Set" screen |
| 14 | `handlePostRegistrationInvite()` shows "Join [inviter]'s IC?" prompt | IC join prompt |
| 15 | Invitee taps Yes → original connection row patched to `approved`. Reciprocal row created as `status='pending'` — inviter must explicitly accept before it counts in their My IC | — |
| 16 | `confirmOverlay` hidden → `showPage('dashboard')` | Dashboard — green IC tile = 1 |

**Note:** `_qcSave()` must also call `handlePostRegistrationInvite()` when `PENDING_INVITE` is set — same as `doSaveProfile()`.

---

## Flow 3 — Link or Text IC Invite → New User

| Step | Function / Action | User Sees |
|---|---|---|
| 1 | Organizer copies IC invite link or sends text | — |
| 2 | Invitee taps link | `invite.html?token=TOKEN` |
| 3–10 | Same as Flow 1 steps 3–10 | Same |
| 11+ | Registration completes — but IC connection fails to approve | Dashboard, IC tile = 0 |

> ⚠️ **Known Bug C (unresolved as of June 2026):** For link and text invite paths, `icPostPendingConnection()` stores `pending_TOKEN` as a placeholder `recipient_email` in `connections`. When `handlePostRegistrationInvite()` tries to PATCH `connections` to `approved`, it finds zero matching rows (the real email doesn't match the placeholder). The IC connection is never established. Do not attempt to fix this without reading CLAUDE-SCHEMA.md § Inner Circle first and updating this flow.

---

## Flow 4 — QR Invite → New User

| Step | Function / Action | URL Params | User Sees |
|---|---|---|---|
| 1 | Organizer opens IC panel, taps QR mode | — | QR code displayed |
| 2 | Invitee scans QR | — | `invite.html?qr=QR_ID` |
| 3 | `invite.html` fetches `public_profiles?qr_invite_id=eq.QR_ID`, shows invite card | `?qr=QR_ID` | Invite card with 📱 QR badge + email input |
| 4 | Invitee enters email, taps Submit | — | "Magic link sent" |
| 5 | Magic link sent with `emailRedirectTo: app.html?newuser=1&qr=QR_ID` | — | — |
| 6 | Invitee taps magic link | — | `app.html?newuser=1&qr=QR_ID` |
| 7 | `checkInviteToken()` reads `?qr=QR_ID`, sets `PENDING_INVITE` | `?newuser=1&qr=QR_ID` | Loading |
| 8–16 | Same as Flow 1 steps 9–19 | Same | Dashboard |

**Note:** QR invites use `?qr=` not `?invite=`. These are distinct code paths — Rule 17. `is_used` check is skipped for QR type (Rule 16 — `invite_type !== 'qr'`).

---

## Flow 5 — Existing User Clicks Old or Already-Used Invite Link

| Step | Function / Action | User Sees |
|---|---|---|
| 1 | User taps `invite.html?token=TOKEN` | `invite.html` |
| 2 | `invite.html` fetches `invites` row, checks `is_used` | — |
| 3 | `is_used === true` and `invite_type !== 'qr'` → block | Friendly "this invite has already been used" error message |
| 4 | No magic link sent. No registration triggered | — |

**Rule 16:** Never skip the `is_used` check. This gate must always run before showing the email input.

---

## Flow 6 — Returning Member, Same Device (Session Alive)

| Step | Function / Action | User Sees |
|---|---|---|
| 1 | Member navigates to `pballconnect.com/app.html` | Loading |
| 2 | `initApp()` → `_supabase.auth.getSession()` reads localStorage — session found synchronously | — |
| 3 | `restoreSession()` fetches profile row — `SESSION_PLAYER` populated | — |
| 4 | `startNewRegistration()` must NOT fire | — |
| 5 | `showPage('dashboard')` | Dashboard in ~1–2 seconds |

**Session persistence:** `persistSession: true`, `autoRefreshToken: true`, `detectSessionInUrl: true`. Refresh tokens have no expiry by default in Supabase — session survives indefinitely on same device unless localStorage is cleared.

---

## Flow 7 — Returning Member, New Device or Cleared Storage

| Step | Function / Action | User Sees |
|---|---|---|
| 1 | Member navigates to `pballconnect.com` (`index.html`) | Public marketing page |
| 2 | Taps "Sign In" in nav bar (top right) or "Already a member? Sign In" in hero | `#signInModal` opens |
| 3 | Enters email, taps "Send Magic Link →" | "Check your email" confirmation |
| 4 | `doSignIn()` calls Supabase `/auth/v1/otp` with `emailRedirectTo: app.html` — NO `?newuser=1` | — |
| 5 | Member taps magic link | `app.html` — no invite params |
| 6 | `onAuthStateChange` fires → `restoreSession()` finds profile row | — |
| 7 | `startNewRegistration()` must NOT fire — profile row exists | — |
| 8 | `showPage('dashboard')` | Dashboard |

OR — member navigates directly to `pballconnect.com/app.html`:

| Step | Function / Action | User Sees |
|---|---|---|
| 1 | `getSession()` returns null | — |
| 2 | `showPage('welcome')` + `maybeShowBetaBanner()` fire | Beta banner overlay |
| 3 | Banner shows green "Sign In" button at TOP of stack (above join CTAs) | Sign In prominent at top |
| 4 | Member taps Sign In → `openLoginModal()` → email pre-filled from `localStorage.pb_email` if available | `#loginModal` with email pre-filled |
| 5 | Member enters email, taps Send → magic link sent with `emailRedirectTo: app.html` | — |
| 6–8 | Steps 5–8 above | Dashboard |

**UX note:** Beta banner "Sign In" button is full-width green `#1a7a3a`, positioned ABOVE the three join CTAs, separated by "NEW TO PBALLCONNECT?" divider. Fixed June 2026 — was previously buried in faded `rgba(255,255,255,0.5)` text at the bottom.

---

## Flow 8 — Post-Registration Success Screen → Dashboard

This flow applies to ALL registration paths (Full Profile, Quick Connect, SMS) after the profile row is saved.

| Step | What Happens | User Sees |
|---|---|---|
| 1 | Profile save completes (`doSaveProfile()` or `_qcSave()`) | — |
| 2 | `showFoundingMemberOverlay()` fires | "You're All Set — Welcome to PBallConnect!" |
| 3 | Copy reads: "Taking you to your dashboard..." (NOT "Head to your dashboard") | — |
| 4a | If `PENDING_INVITE` exists → `handlePostRegistrationInvite()` shows IC join prompt | "Join [inviter]'s Inner Circle?" overlay |
| 4b | User taps Yes → connection approved → `confirmOverlay` hidden → `showPage('dashboard')` | Dashboard |
| 4c | User taps Maybe Later → `confirmOverlay` hidden → `showPage('dashboard')` | Dashboard |
| 5a | If NO `PENDING_INVITE` → `showFoundingMemberOverlay` callback hides `confirmOverlay` → `showPage('dashboard')` directly | Dashboard |

**Critical:** `showPage('dashboard')` must only be called AFTER `SESSION_PLAYER` is populated from the re-fetch. Calling it before `SESSION_PLAYER` is set causes the auth gate to redirect to `page-welcome`. This was the root cause of the June 2026 regression.

**Never navigate to:** `page-welcome`, `page-innerCircle`, `page-myCourts`, or any other page from this flow. Always `showPage('dashboard')`.

---

## Flow 9 — SMS Match Invite → Registered Player RSVP

| Step | Function / Action | User Sees |
|---|---|---|
| 1 | Organizer creates match, invite loop fires for opted-in IC members | — |
| 2 | `/api/match-invite-token` generates signed HMAC token | — |
| 3 | `sendSms()` sends: "Hey [name]! [organizer] invited you to pickleball on [date]..." with signed URL | SMS on phone |
| 4 | Player taps URL | `match-invite.html?t=TOKEN&s=SIG` |
| 5 | GET `/api/match-invite-lookup` validates signature + expiry, returns match details + registration status | — |
| 6 | Player is registered → YES / NO buttons shown with match details | Match RSVP card |
| 7 | Player taps YES → POST `/api/match-invite-respond` upserts `match_responses`, patches `invites` row | "You're in!" confirmation |
| 8 | Player taps NO → same endpoint, `response = 'out'` | Warm decline message |

**Security:** Token signature verified before ANY DB write. Expiry = 7 days from send. See CLAUDE-SMS.md § Match Invite SMS System.

---

## Flow 10 — SMS Match Invite → Unregistered Player

Steps 1–5 same as Flow 9. Then:

| Step | Function / Action | User Sees |
|---|---|---|
| 6 | Player is NOT registered → compact match summary shown | Match summary card |
| 7a | Player taps YES → 4-field mini form | Gender chips, skill slider, zip, email |
| 7b | Submits → POST `/api/sms-register` creates auth user, saves registration. Original connections row (organizer → new user) patched to `approved`. Reciprocal row created as `status='pending'` — organizer must explicitly accept before it counts in their My IC. Matches email path behavior (see Flow 1 step 18). | "You're registered!" |
| 8a | Player taps NO → warm decline + soft pitch | "Sign Me Up!" (→ `invite.html`) + "Maybe Later" |

---

## Flow 11 — Can't Make It Drop Flow

| Step | Function / Action | User Sees |
|---|---|---|
| 1 | Player taps "Can't Make It" on confirmed match card | Confirmation dialog (uses `window._cmCache[matchId]`) |
| 2 | `window.confirmCantMakeIt(matchId)` fires | — |
| 3 | `match_responses` PATCHed → `'out'` | Toast + page reload |
| 4 | Organizer notified — email + SMS (separate try/catch, both best-effort) | — |
| 5a | `hoursUntilMatch <= 24` → scramble: ALL waitlisted → `'pending'`, urgent notifications to all | — |
| 5b | `hoursUntilMatch >= 24` → standard: first waitlisted only → `'pending'`, single notification | — |
| 6 | Waitlist empty + `SESSION_PLAYER` is organizer → `showEmergencyFill(matchId, null)` after 800ms | Emergency Fill overlay |

**Rule 44:** "Can't Make It" never shows to organizer. If organizer triggers it — block with toast, do not process.
**Rule 45:** Organizer always notified when player drops. Drop completes even if both notifications fail.
**Rule 43:** Scramble threshold is exactly 24 hours — not 23, not 25.

---

## Regression Prevention Checklist

Run this before pushing ANY change to auth, registration, or invite flows:

- [ ] Flow 1: Email invite → Full Profile → Dashboard works on iPhone Safari
- [ ] Flow 2: Email invite → Quick Connect → Dashboard works on iPhone Safari
- [ ] Flow 6: Returning member on same device goes straight to dashboard (no registration flow)
- [ ] Flow 7: Returning member on new device sees Sign In prominently in beta banner
- [ ] Flow 8: "You're All Set" screen auto-navigates to dashboard (not welcome page)
- [ ] Flow 5: Already-used token shows friendly error, no magic link sent
- [ ] `_isNewRegistration` is declared BEFORE `try{}` in `doSaveProfile()`
- [ ] All `emailRedirectTo` values point to `app.html` — never `/` or `index.html` (Rule 51)
- [ ] `startNewRegistration()` does NOT fire when `SESSION_PLAYER` exists after re-fetch
- [ ] Reciprocal connection rows created as `pending` — never `approved` at creation (Flows 1, 2, 10)
- [ ] Re-invite pre-check fires before `sendIcEmailInvite()` sends — existing approved or pending connection aborts with toast (Rule 56)
