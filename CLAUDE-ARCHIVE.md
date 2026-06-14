# CLAUDE-ARCHIVE.md — PBallConnect Session Learnings

_Archived from CLAUDE.md. These are resolved work logs from past sessions — kept for historical reference but removed from the main reference doc to reduce noise._

_Last updated: June 13, 2026_

---

## Session learnings — May 16, 2026

Claude Chat must proactively identify compliance gaps without waiting to be asked. When a feature involves legal or financial exposure — SMS, TCPA, data privacy, consent records — Claude Chat must think three steps ahead and flag issues before they become problems. Examples from this session that should have been caught proactively:

- **`sms_opt_out_at` timestamp** — when `sms_opt_in_at` was added, the matching opt-out timestamp should have been specified in the same instruction without the user asking.
- **Supabase SQL must always be listed FIRST** in any instruction that requires a schema change — Claude Code cannot run SQL, only the user can. If the column does not exist when the code tries to write to it, the insert fails silently. Format is: _"Do this in Supabase SQL Editor FIRST before Claude Code touches any code."_
- **Verification steps must always follow every significant change** — Layer 1 (Supabase dashboard), Layer 2 (live functional test), Layer 3 (SQL query). Always specify all three layers explicitly in the instruction.
- **When a session runs long, precision degrades.** If context is running low, say so and recommend starting a fresh session rather than continuing with reduced accuracy.

Instruction format reminders:

- SQL schema changes always listed first with explicit "Do this in Supabase SQL Editor FIRST" heading
- Verification steps always included at the end of every instruction
- Never ask the user to dig through Network tabs or DevTools unless absolutely necessary — add `console.log` via Claude Code instead
- Always include `node --check app.js` and `git push --force origin main` at the end

---

## Session learnings — May 17, 2026

- **Break long Claude Code instructions into Part 1 and Part 2 proactively.** Never let a single instruction exceed what the chat window can transmit cleanly. If implementation spans more than ~3 functions or 2 files, split it before sending.
- **Call for a fresh Claude Code session at 20% context remaining** — not at 7%. Precision degrades before the context limit is reached. Start fresh early enough to re-brief cleanly.
- **Always confirm each part is complete and pushed before sending the next part.** Never queue Part 2 until Part 1 is verified (node --check passes, push confirmed, live behavior tested).
- **Fire-and-forget `sendEmail()` and `fetch()` calls keep reappearing.** Before accepting any new implementation, explicitly check every `sendEmail()` and outbound `fetch()` call for `await` and `try/catch`. This is a recurring pattern — do not assume it was done correctly without checking.
- **`doSaveProfile()` — SMS opt-in flag is `_smsOptIn`, not `S.smsOptIn`.** `_smsOptIn` is a local variable computed at ~line 1168 (`_phoneDigits.length === 10 && !!(smsOptIn checkbox checked)`). `S.smsOptIn` does not exist. Use `_smsOptIn` in any future edits to this function.
- **When investigating a stray or misplaced button, check `onclick` before trusting the label.** `smInviteContinueBtn` was labeled "Send Invites →" but its `onclick` was `_smInviteContinue()` which only called `smUpdateProgress(5)` and scrolled to the next step — a Continue button, not a send. The comment in the code even said "Continue button." Read what the button does, not what it says.
- **`_qcSave()` — SMS opt-in flag is `_qcSmsOptIn`; player email is `email.toLowerCase()`; consent log method is `'quick_connect'`.** `_qcSmsOptIn` is a local variable computed at ~line 11453 (`ph.length === 10 && !!(qcSmsOptIn checkbox checked)`). Player email comes from the outer closure variable `email` — use `email.toLowerCase()`, not `S.email` or `v('email')`. Consent log `method` field must be `'quick_connect'`, not `'registration'`.

---

## Session learnings — May 20, 2026

**Schema changes:**
- **`dob` renamed to `age_range`** in `registrations` — stores bucket strings like `'41-45'`, not a date of birth. Actual DOB not collected (PII concern). `age_range` is the authoritative column name everywhere — `dob` is gone.
- **`schedule` column dropped** from `registrations` and removed from `public_profiles` view — replaced by `avail_*` booleans. All dead code (`toggleCell`, `toggleColumn`, `toggleDay`, schedule IIFE, `S.schedule`, `schedStr`, `schedule:` write) removed from `app.js` and `index.html`.
- **`avail_weekday_morning/afternoon/evening`, `avail_weekends`** — DB columns kept, UI removed to reduce registration friction. `doSaveProfile()` still writes `false` for all four on every save. Restore UI when match scheduling logic is built.

**Bug fixes:**
- **Base64 phone encoding in `_qcSave()`** — `encodePhone(ph)` replaced with `ph || null`. `decodePhone()` left in place to handle existing encoded rows gracefully.
- **Duplicate IC request cards** — removed redundant `loadIcPending()` call in `showIcSection()`; added `_icPendingLoading` in-flight guard with `finally` block. Root cause was two concurrent async calls racing on `list.innerHTML`.
- **Stray Send Invites button in Step 4** — `smInviteContinueBtn` removed from `buildSmInviteGrid()`.
- **160-character SMS limit removed** — `send-sms.js` no longer caps message length; Twilio handles multipart SMS automatically.
- **Age range selector** — individual year options (18–25) replaced with uniform `'18-25'` bucket in both `index.html` (`#playerAge`) and Quick Connect form in `app.js`.

**SMS pipeline status:**
- End-to-end flow verified and working — token signed, SMS sent, Twilio accepted.
- Blocked only by Twilio trial mode (Error 30034 — A2P 10DLC unregistered number).
- Fix: upgrade Twilio to Pay-as-you-go + complete A2P 10DLC brand registration (~$4 one-time) and campaign registration (~$15 one-time + ~$10/month) before launch.

**TCPA consent log — all three paths confirmed wired:**
- `doSaveProfile()` — method: `'registration'`, flag: `_smsOptIn`
- `_qcSave()` — method: `'quick_connect'`, flag: `_qcSmsOptIn`, email: `email.toLowerCase()`
- `sms-register.js` — method: `'sms_invite'`

**Database cleanup:**
- 19 fake/test registrations deleted; 78 `match_responses` and 7 `connections` rows removed.
- **`connections` table** — correct column names are `requester_email` and `recipient_email`. NOT `player_email` or `connection_email`. CLAUDE-SCHEMA.md corrected. Do not revert.
- **`player_group_members`** — correct column is `player_email`. Confirmed in Supabase.

**Pre-launch checklist additions:**
- Upgrade Twilio trial → Pay-as-you-go before any production SMS.
- Complete A2P 10DLC brand registration (~$4 one-time) and campaign registration (~$15 one-time + ~$10/month).
- Configure and verify staging environment on Cloudflare Pages before Twilio upgrade.

**UI simplification decisions:**
- Availability toggles removed from profile registration form — too much friction for onboarding. DB columns preserved for future match scheduling logic. Do not re-add until match scheduling requires them.
- `schedule` field fully removed — dead code, superseded by `avail_*` booleans (which are themselves hidden for now).

---

## Session learnings — May 24, 2026

**Organic signup gate:**
- **`join.html` created** — standalone gate page (no app.js/styles.css dependency). Uninvited first-time users are redirected here from `doLogin()` when: `isNewUser === true` AND no `?invite=` or `?qr=` in URL AND `PENDING_INVITE === null`. Four pre-screen fields: email, skill slider, playing since, age range. Cloudflare Turnstile bot protection (same sitekey as `landing.html`).
- **sessionStorage pre-population** — `join.html` stores `organic_email`, `organic_skill`, `organic_playing_since`, `organic_age_range`, `organic_source='organic'` before sending the magic link. `emailRedirectTo` points to `https://pballconnect.com/?organic=1`. After auth, `startNewRegistration()` reads these keys, pre-populates the registration form via DOM + `S.*` + `updatePersonalRating()`, then clears the four field keys. `organic_source` is intentionally kept until `doSaveProfile()` reads and clears it.
- **`invite_source` column** — added to `registrations` table with CHECK constraint `('organic','qr','token','sms')`. Run in Supabase SQL Editor: `ALTER TABLE registrations ADD COLUMN invite_source text CHECK (invite_source IN ('organic','qr','token','sms'));`. `doSaveProfile()` derives the value at save time: checks `sessionStorage.organic_source` first (organic path), then `PENDING_INVITE.invite_type`/`invite_token` (invited paths), defaults to `'organic'`.

**Admin alert enhanced:**
- Organic signups get 🚨 subject prefix: `"🚨 Organic Signup — [Name]"`. Invited signups keep existing format.
- `personal_note` now includes `Invite Source` and `Age Range` fields on all full-profile registrations.

**IC invite section relabeled (May 24):**
- `index.html` line 1256: `"Requests to Join Your Circle"` → `"Inner Circle Invites to Me"`.
- Subtitle updated to `"These players have invited you to their Inner Circle."` — reflects that the section shows invites the current user received, not requests they sent.

**Post-registration redirect to IC page:**
- After accept/decline in `handlePostRegistrationInvite()` → `showStep2()`, app now navigates to `showPage('innerCircle')` then `setTimeout(() => showIcSection('requests'), 400)`. Fires for both Yes and No.
- `doSaveProfile()` new-user path: `handlePostRegistrationInvite()` delay extended from 1500ms → 2500ms.
- `_qcSave()`: captures `_hadPendingInvite = !!PENDING_INVITE` before calling `handlePostRegistrationInvite()`. If true, navigates to IC requests tab instead of dashboard (welcome toast skipped).

**Known open bug logged (Bug C):**
- Phone and link invite paths store `pending_TOKEN` as placeholder `recipient_email` in `connections`. `handlePostRegistrationInvite()` PATCH matches zero rows for these paths — IC connection is never established. Email invite path is unaffected. Do not attempt to fix by reusing `handlePostRegistrationInvite()` — requires a separate lookup strategy at registration time.

---

## Session learnings — May 30, 2026

**doLogin() gate removed (critical bug fix):**
- The pre-auth `registrations` check used `SUPABASE_ACCESS_TOKEN` which equals `SUPABASE_ANON_KEY` before login. RLS silently returns HTTP 200 with `[]` for anon queries — not a 403. This caused `isNewUser = true` for all existing users, redirecting them to `join.html`. The fix: `doLogin()` now sends the magic link unconditionally for any valid email. New vs. existing user routing happens in `onAuthStateChange` → `restoreSession()` where a real session token satisfies RLS. **Do not re-add any pre-auth DB check to `doLogin()`.**
- The May 24 session note about `doLogin()` redirecting to `join.html` is superseded. `join.html` is now reached only via the "Join PBallConnect" banner button.

**`organic_signups` table created in Supabase:**
- Stores pre-screen data (email, skill_level, playing_since, age_range) keyed by email. `/api/organic-signup.js` Pages Function handles GET, POST, and DELETE. Used to persist join.html pre-screen data server-side so it survives the magic link redirect back to the app.

**Beta banner rebuilt:**
- Three-button layout: "Join PBallConnect" (→ `/join.html`), "Ask a member" (→ `/invite.html`), "Notify me at launch" (→ `/landing.html#waitlist`). Replaces old two-button layout.
- `icon-192.png` logo replaces emoji in banner header.
- Banner now fires synchronously with `showPage('welcome')` — no more 1500ms flash. `maybeShowBetaBanner()` converted from async (removed `getSession()` call) to synchronous, called directly after `showPage('welcome')` in `initApp()`.
- `?reset_banner=dev` clears the `pb_beta_banner_seen` localStorage flag for testing.

**Supabase redirect URLs updated to wildcards:**
- `https://pballconnect.com/*` and `https://pickleball-registry.pages.dev/*` added to the Supabase Auth allow list to support all magic link return paths.

**Dashboard button suppressed during new user registration:**
- `_newUserRegistrationStarted` gate added to `showBackToDashboard()` — back-to-dashboard button does not appear while a new user is mid-registration.

**Sign In button hidden during registration:**
- `#navLoginBtn` hidden in `startNewRegistration()`, restored in `doSaveProfile()` and `_qcSave()`. Prevents a logged-in new user from opening the login modal mid-flow.

**Mobile scroll fix:**
- `#profileStickyHeader` set to `position:relative` on mobile to fix iOS touch-scroll dead zone caused by `position:sticky` interacting with the iOS scroll container.

**Known issue — gender data migration pending:**
- Run in Supabase SQL Editor before any gender-based matching logic is used: `UPDATE registrations SET gender='Man' WHERE gender='Male'; UPDATE registrations SET gender='Woman' WHERE gender='Female';`. Users with `null` gender need outreach or a login-time prompt.

**Known issue — organic pre-population needs live test:**
- ~~Age range dropdown mismatch suspected~~ — confirmed matching (May 31). Root cause was `id="lbl3\"` crashing `goTo()`. All 4 fields pre-populate correctly end-to-end. Debug console.log removed.

**Database cleanup completed (May 30):**
- 16 test/incomplete accounts deleted from all related tables: `sms_consent_log`, `sms_log`, `match_responses`, `player_group_members`, `invites`, `connections`, `matches`, `organic_signups`, `registrations`. 6 clean accounts remain.
- **Gender migration completed** — `'Female'` → `'Woman'`, `'Male'` → `'Man'` normalized across `registrations`. Known Bug #6 resolved.
- **`invites` table schema correction** — the inviter column is `inviter_email`, not `organizer_email`. Update any query or code that references `organizer_email` on the `invites` table.

---

## Session learnings — May 31, 2026

**Organic pre-population — verified working:**
- Root cause of pre-population failure: `id="lbl3\"` in `index.html` (backslash before closing quote on `lbl3` span) caused `goTo()` to crash with a null dereference before the pre-population IIFE ever ran. Fixed to `id="lbl3"`.
- DELETE ordering fixed in `startNewRegistration()` — server DELETE (`/api/organic-signup` POST with `{ delete: true }`) now fires after all 4 DOM writes via `_needsServerDelete` flag, not before.
- Silent fetch failures now log `[organic] server fetch failed:` with status + body to the console. Network errors also logged.
- All 4 fields (email, skill, age range, playing since) confirmed pre-populating correctly end-to-end.

**Slider tick marks fixed:**
- `buildGoalTicks()` updated to use `calc(11px + ratio * (100% - 22px))` — same formula as `buildStaticSliderTicks()`. Thumb radius is 11px (22px wide thumb per CSS).
- Goal rating thumb label (`goalThumbLabel`) and ✕ marker (`goalRedLabel`) positions also corrected with the same formula — they were using raw `pct%` which misaligned by up to 11px at range extremes.

**"Both" chip defaults fixed:**
- Play Format, Match Type Preference, Venue Preference, Play Style all initialize with full "Both" active state on `DOMContentLoaded`: all siblings get `.on` class, the Both chip gets dark red styles (`background:#991b1b`), matching exactly what `selChip()` does when Both is tapped.

**Goal rating slider track fill — root cause found and fixed:**
- `updateGoalRedBar()` bailed at `if(!redBar) return` because `goalSliderRedBar`, `goalSliderGreenBar`, and `goalRedLabel` were never in `index.html`. Added as empty `position:absolute` divs inside the `position:relative` slider wrapper before the `<input>` (so slider thumb stays on top in stacking order).
- Bar styles: `top:50%; transform:translateY(-50%); height:6px` — vertically centered on the 6px track regardless of browser-rendered input height.
- Colors: red bar `#dc2626` (floor below personal rating), blue bar `#2563eb` (goal range above personal rating). JS in `updateGoalRedBar()` drives `width`, `left`, `borderRadius` dynamically.

**Slider tick timing fixed:**
- `buildStaticSliderTicks` was called at `DOMContentLoaded` before the profile section was visible — sliders had zero layout width, so ticks rendered at position 0. Moved all three tick builds (`duprTicks`, `personalRatingTicks`, `buildGoalTicks(0)`) to the end of `unlockProfileForm()`, which fires after `showPage('playerProfile')`.
- `buildGoalTicks(0)` now called at form unlock so goal ticks render immediately (all grey, no personal rating set yet) without requiring the user to touch the slider first.

**Privacy policy updated (May 31):**
- SMS Notifications section added with full TCPA-compliant language: STOP/HELP opt-out, message frequency disclosure, "message and data rates may apply."
- Stale "Play schedule" row removed from What We Collect table — field was dropped from the DB in May 2026.
- Phone storage description corrected: "encoded before storage" → "stored as plain text digits and used only for SMS notifications you have explicitly opted into."
- Email vendor corrected: EmailJS → Resend.
- Last updated changed to May 2026.

**Registration form collapsed from 3 steps to 2 (May 31):**
- Step 1 combines Personal Info + Player Profile as one scrolling form. Step 2 is Waiver only.
- Progress indicator: 3 dots → 2 dots ("Profile" → "Waiver"). `dot3`, `lbl3`, `line2` removed from HTML.
- `next1` button removed. `next2` is the single Continue → `goTo(2)`.
- `chk1()` now validates all required fields in one pass: `firstName` + `email` + `phone` + `gender` + `playingSince` + `personalRating > 0`. Gates `next2`.
- `chk2()` delegates to `chk1()` — all 8 existing call sites unchanged.
- `goTo()` iterates `[1,2]` instead of `[1,2,3]`; `populateSummary` gates on `n===2`.
- `lockProfileForm()` / `unlockProfileForm()` iterate `['step1','step2']`.
- Waiver Back button updated: `goTo(2)` → `goTo(1)`.
- `clearForm()`: stale `next1.disabled` reference removed.

**`join.html` skill slider styled (May 31):**
- Added `-webkit-appearance:none`, green fill via `--pct` CSS variable, circular white/green thumb matching the app's slider style. `jBuildSkillTicks()` builds 22-stop tick marks using `calc(11px + ratio * (100% - 22px))`. All self-contained — no app.js or styles.css dependency.

**Privacy policy link audit (May 31):**
- `landing.html` line 624: `href="/index.html#page-privacy"` — links to a hash fragment that won't work (page-section is hidden until `showPage()` fires). **Needs to change to `href="/privacy.html"`.**
- `join.html`: no privacy policy link anywhere. **Needs a footer link.**
- Inline `#page-privacy` in `index.html` is out of sync with `privacy.html` — needs the same 5 updates applied to `privacy.html` (SMS section, "currently" qualifier on payment statement, play schedule row removed, phone encoding corrected, EmailJS → Resend).
- Correct links confirmed: waiver consent in `index.html` (line 729) → `privacy.html` ✓; Quick Connect consent in `app.js` (line 11237) → `privacy.html` ✓.

**Confirmed working (May 31):**
- `join.html` skill slider — styled, ticks aligned, green fill ✓
- 2-step registration collapse — complete and working ✓
- Organic pre-population — verified end-to-end ✓

---

## Session learnings — June 8, 2026

**`is_organizer` gating removed — all members are organizers:**
- Decision: every registered member gets full organizer access. No self-selection, no founder promotion flow.
- Removed from app.js: `S.isOrganizer` state var, `restoreSession()` assignment, chip restore, `doSaveProfile()` payload, `smLoadGroupSelect()` early return, `injectNamedGroupOptions()` hide check, all opacity/pointer-events gating in `updateNavForUserType()`, `isOrg` condition in `updateOrganizerNav()`.
- Removed from app.html: `isOrganizerChips` chip group and hint text from Step 1 of registration form.
- DB column retained for back-office reporting. SQL run: `UPDATE registrations SET is_organizer = true WHERE is_organizer = false`.
- `organizer_email` on matches table is unrelated — do not confuse with `is_organizer` flag.
- See Rule 55.

**Registration flow regressions fixed (June 8, 2026):**
- Root cause: `const _isNewRegistration = !SESSION_PLAYER` declared inside `try{}` — silent ReferenceError after save. Fixed: declared before `try{}`. See Rule 54.
- No-invite path: `showFoundingMemberOverlay` callback now hides `confirmOverlay` and calls `showPage('dashboard')` directly when `!PENDING_INVITE`.
- `handlePostRegistrationInvite()` → changed `showPage('innerCircle')` to `showPage('dashboard')`.
- `confirmOverlay` button copy updated to "Taking you to your dashboard..."
- Beta banner: "Sign In" moved to full-width green button at TOP of stack above join CTAs. Email pre-fill added to login modal from `localStorage.pb_email`.

**CLAUDE-FLOWS.md created:**
- 11 flows documented: email IC invite, QR invite, link/text invite, existing user, returning member new device, post-registration success, SMS match invite, Can't Make It drop flow.
- Includes global state variable reference table and regression prevention checklist.
- Must be updated any time a flow chain function is modified.

**Reciprocal IC connection bug fixed (June 10, 2026):**
- Bug: when a new user accepted an IC invite during registration, the reciprocal connection row was created as `status='approved'` — counting in the inviter's "My IC" without their consent.
- Fix: app.js line 11754 — reciprocal row now created as `status='pending'`.
- Flow: inviter sends → pending. Invitee accepts → original row approved, reciprocal row pending. Inviter accepts reciprocal → both sides approved. True mutual consent on both sides.
- Tile counts were already correct — `loadInnerCircle()` filters approved only, `loadIcPending()` filters pending inbound only. No tile count changes needed.
- See CLAUDE-FLOWS.md Flow 1 step 18.

**SMS registration reciprocal connection fixed (June 10, 2026):**
- Bug: `sms-register.js` was creating the reciprocal connection row as `status='approved'` — bypassing organizer consent entirely. Both sides showed My IC = 1 with no invite flow.
- Fix: `sms-register.js` line 205 — `status:'approved'` → `status:'pending'`. SMS path now matches email path exactly.
- `_syncIcSentCount()` reads sent count from `connections` table directly — no `invites` row insert needed for My IC Invites to Others to show correctly.
- See CLAUDE-FLOWS.md Flow 10.

**Re-invite pre-check added to `sendIcEmailInvite()` (June 10, 2026):**
- Before sending an IC email invite, `sendIcEmailInvite()` now queries `connections` for any existing row where `requester_email = SESSION_PLAYER.email` AND `recipient_email = entered email`.
- If an `approved` row exists → toast "They're already in your Inner Circle." and abort.
- If a `pending` row exists → toast "You already have a pending invite to this person." and abort.
- Only if no row exists → proceed with `icCreateSingleUseInvite()` + `sendEmail()`.
- Prevents duplicate invite emails and duplicate `invites` rows. See Rule 56.
