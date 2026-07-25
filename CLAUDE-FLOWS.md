# CLAUDE-FLOWS.md — User Flow Definitions

_Created June 2026. Cross-reference: CLAUDE.md, CLAUDE-SCHEMA.md, CLAUDE-RULES.md, CLAUDE-SMS.md._
_Update this file whenever any function in a flow chain is modified. Never change a flow without updating here first._

_Last updated: July 3, 2026_

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
| 17 | `handlePostRegistrationInvite()` finds `PENDING_INVITE` → resolves `inviter_email` by querying `invites` table directly via `invite_token=eq.TOKEN` (never `invite_tokens` view) → shows "Join [inviter]'s IC?" overlay | — | — | IC join prompt overlay |
| 18 | Invitee taps Yes → **primary PATCH**: `connections?requester_email=eq.INVITER_EMAIL&recipient_email=eq.NEW_PLAYER_EMAIL` → `{status:'approved'}`. No status filter. Raw email values in URL (no `encodeURIComponent`). **Fallback PATCH** also fires for link/text invite paths where the row was stored with `recipient_email='pending_TOKEN'`: patches both `recipient_email` to real email and `status` to `approved`. Toast shown. | — | — | Step 3 overlay appears |
| 18b | Step 3 overlay — "Add [inviter] to YOUR Inner Circle?" — if Yes: POSTs reciprocal row `{requester_email:newPlayerEmail, recipient_email:inviterEmail, status:'pending'}`. Inviter must explicitly accept before it counts in their My IC. If Maybe Later: skipped. | — | — | Reciprocal IC request overlay |
| 19 | `confirmOverlay` hidden → `showPage('dashboard')` | — | — | Dashboard — green IC tile = 1 |

**Critical rules:** Rule 51 (redirects → `app.html`), Rule 16 (check `is_used`), Rule 36 (`Prefer: return=minimal`).

**Known regression history:** June 2026 — `_isNewRegistration` declared inside `try{}` caused silent `ReferenceError` after save. Fix: declare before `try{}`. July 2026 — PATCH returning 400 due to `encodeURIComponent` on email values and stale `&status=eq.pending` filter. Fix: use raw emails in URL, remove status filter. See commit `2c43072`.

---

## Flow 2 — Email IC Invite → New User → Quick Connect

Steps 1–10 identical to Flow 1. Then:

| Step | Function / Action | User Sees |
|---|---|---|
| 11 | Invitee taps Quick Connect | Minimal overlay: First Name + gender chips + skill slider + zip + email |
| 12 | Invitee completes form, taps Save | — |
| 13 | `_qcSave()` saves row, checks `PENDING_INVITE` → calls `handlePostRegistrationInvite()` | "You're All Set" screen |
| 14 | `handlePostRegistrationInvite()` resolves `inviter_email` from `invites` table (never `invite_tokens` view) → shows "Join [inviter]'s IC?" overlay | IC join prompt |
| 15 | Invitee taps Yes → **primary PATCH**: `connections?requester_email=eq.INVITER_EMAIL&recipient_email=eq.NEW_PLAYER_EMAIL` → `{status:'approved'}`. No status filter. **Fallback PATCH** fires for `pending_TOKEN` rows. Toast shown. | — |
| 15b | Step 3 overlay — "Add [inviter] to YOUR Inner Circle?" — if Yes: POSTs reciprocal row as `status='pending'`. Inviter must explicitly accept. If Maybe Later: skipped. | Reciprocal IC request overlay |
| 16 | `confirmOverlay` hidden → `showPage('dashboard')` | Dashboard — green IC tile = 1 |

**Note:** `_qcSave()` must also call `handlePostRegistrationInvite()` when `PENDING_INVITE` is set — same as `doSaveProfile()`.

---

## Flow 3 — Link or Text IC Invite → New User

| Step | Function / Action | User Sees |
|---|---|---|
| 1 | Organizer copies IC invite link or sends text | — |
| 2 | Invitee taps link | `invite.html?token=TOKEN` |
| 3–10 | Same as Flow 1 steps 3–10 | Same |
| 11+ | Registration completes — IC connection approved via fallback | Dashboard, IC tile = 1 |

> ✅ **Fixed June 2026 —** `handlePostRegistrationInvite()` now includes a fallback lookup for `pending_TOKEN` placeholder rows created by link/text invite paths. On registration, if the primary email-based PATCH finds zero rows, the fallback queries `connections` by `recipient_email = 'pending_' + inv.invite_token` and patches the row with the real email and `status='approved'`. Email invite path unchanged.

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
| 4b | User taps Yes → primary + fallback PATCH approves connection → Step 3 overlay: "Add [inviter] to YOUR Inner Circle?" → if Yes, reciprocal `pending` row POSTed → `confirmOverlay` hidden → `showPage('dashboard')` | Step 3 overlay, then Dashboard |
| 4c | User taps Maybe Later → `confirmOverlay` hidden → `showPage('dashboard')` | Dashboard |
| 5a | If NO `PENDING_INVITE` → `showFoundingMemberOverlay` callback hides `confirmOverlay` → `showPage('dashboard')` directly | Dashboard |

**Critical:** `showPage('dashboard')` must only be called AFTER `SESSION_PLAYER` is populated from the re-fetch. Calling it before `SESSION_PLAYER` is set causes the auth gate to redirect to `page-welcome`. This was the root cause of the June 2026 regression.

**Never navigate to:** `page-welcome`, `page-innerCircle`, `page-myCourts`, or any other page from this flow. Always `showPage('dashboard')`.

---

## Flow 9 — SMS Match Invite → Registered Player RSVP

**Updated July 2026:** token mechanism changed from an HMAC-signed URL to a short opaque token resolved server-side — see Security note below.

| Step | Function / Action | User Sees |
|---|---|---|
| 1 | Organizer creates match, invite loop fires for opted-in IC members | — |
| 2 | `/api/match-invite-token` generates an opaque token via `createActionToken()` — stores `{matchId, inviteePhone, inviteeName, organizerEmail}` as `payload` in `action_tokens` (`link_type:'match_invite'`) | — |
| 3 | `sendSms()` sends: "Hey [name]! [organizer] invited you to pickleball on [date]..." with the tap-to-respond URL | SMS on phone |
| 4 | Player taps URL | `match-invite.html?t=TOKEN` (short opaque token — no `&s=` signature param) |
| 5 | GET `/api/match-invite-lookup` resolves the token via `resolveActionToken()` (checks existence, `link_type`, and expiry server-side against `action_tokens`), returns match details + registration status | — |
| 6 | Player is registered → YES / NO buttons shown with match details | Match RSVP card |
| 7 | Player taps YES → POST `/api/match-invite-respond` resolves the token again, upserts `match_responses`, patches `invites` row, marks the token `used_at` (best-effort, non-blocking, observability only) | "You're in!" confirmation |
| 8 | Player taps NO → same endpoint, `response = 'out'` | Warm decline message |

**Security (updated July 2026):** No HMAC signature anymore — the token is a short random opaque ID (`functions/_shared/action-tokens.js`) that resolves server-side against `action_tokens`; nothing meaningful travels in the URL. Expiry is stored per-row (`action_tokens.expiry`) and checked at resolve time — still 7 days from send for this flow. This replaced the prior HMAC-SHA256-signed long-URL design (`?t=TOKEN&s=SIGNATURE`) after that format was confirmed to get corrupted in transit over real SMS delivery to a real user. See CLAUDE-SCHEMA.md § `action_tokens` and CLAUDE-SMS.md § Match Invite SMS System.

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
- [ ] `handlePostRegistrationInvite()` PATCH URL uses `requester_email=eq.X&recipient_email=eq.Y` format — no status filter, no `encodeURIComponent` on email values
- [ ] `inviter_email` in `handlePostRegistrationInvite()` sourced from `invites` table (`/rest/v1/invites?invite_token=eq.TOKEN&select=inviter_email`) — never from `invite_tokens` view
- [ ] "My IC" (and any IC candidate pool — Emergency Fill fallback, `showCreateGroupModal()` fallback) queries `connections` filtered on `requester_email`, never `recipient_email` or both directions OR'd together (Model B, Rule 58)
- [ ] Any new code path that writes `response='pending'` to an existing `match_responses` row explicitly sets `filled_from_waitlist` — `true` only for genuine waitlist promotions (`promoteFromWaitlist()`, `confirmCantMakeIt()`'s promotion loop), `false` explicitly everywhere else (Rule 60)
- [ ] Waitlist promotion notifications (scramble and standard) use the signed `waitlist-promo.html` link from `/api/waitlist-promo-token`, not a plain app URL — plain URL is fallback-only, on token-generation failure
