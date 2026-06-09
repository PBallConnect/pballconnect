# CLAUDE-RULES.md — Important Rules for Claude Code

_All 50 rules. No trimming. Cross-reference with CLAUDE.md, CLAUDE-SCHEMA.md, CLAUDE-SMS.md._

---

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

33. **SMS invite flow uses `invite_method: 'sms'`.** The `invites_invite_method_check` DB constraint defines the allowed set. Allowed values: `'email'`, `'link'`, `'qr'`, `'ic'`, `'sms'` — never `'text'`. Passing `'text'` causes a 400 error from the `invites_invite_method_check` DB constraint.

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

46. **Gender is required across all registration paths (full profile, Quick Connect, SMS).** Values must be `'Man'`, `'Woman'`, or `'Prefer not to say'` — never `'Male'` or `'Female'`. A one-time migration was run on existing rows to normalize to this convention. Emergency Fill reads `SESSION_PLAYER.gender` to determine which IC members to surface for a Mixed match vacancy.

47. **`IC_MEMBERS` is a shared global array with structure `{player:{...}, conn:{...}, lastPlayed:null}`.** Never overwrite `IC_MEMBERS` with flat objects. Any feature that needs flat player data for local use must store it in its own local variable (e.g. `_efMemberFlat` for Emergency Fill). When reading from `IC_MEMBERS` always access `.player` properties via `m.player.field_name`, never `m.field_name` directly.

48. **`phone` and `sms_opt_in` must never be added to `public_profiles`.** These are sensitive fields. Any feature that needs them server-side must call `POST /api/match-invite-sms-data` (uses `SUPABASE_SERVICE_KEY`) or query `registrations` directly in a Pages Function. Never expose them through the `public_profiles` view or return them in client-readable API responses.

49. **`sms_consent_log` is append-only.** Never UPDATE or DELETE rows. Every opt-in and opt-out event anywhere in the system — registration, Quick Connect, SMS invite flow, STOP/START webhook — writes a new INSERT row. Use `SUPABASE_SERVICE_KEY` for all inserts. Use `Prefer: return=minimal`.

50. **Admin registration alert emails fire to `david@pballconnect.com` on every new registration across all three paths** — `doSaveProfile` (full profile), `_qcSave` (Quick Connect), and `sms-register.js` (SMS invite). Always `await sendEmail()` in `try/catch`. Never fire-and-forget.

51. **app.html is the app root — never index.html.** Since the index.html/landing.html rename (June 2026), index.html serves the public marketing page at pballconnect.com/. The app lives at pballconnect.com/app.html. All magic links, invite redirects, emailRedirectTo, redirectTo, and post-auth navigations must point to app.html. Never hardcode /, /?, or /index.html as a redirect target in any auth or invite flow.

52. **beta_applications is append-only for new applicants.** Never DELETE rows. Status transitions (pending → approved or rejected) are the only permitted UPDATEs, and only via founder action. Use SUPABASE_SERVICE_KEY for all writes. Never expose beta_applications data through public_profiles or any client-readable endpoint.

53. **join.html does not send magic links.** The beta application flow on join.html submits to /api/beta-apply and shows a confirmation message. It never calls signInWithOtp or sends any auth email. Magic links are only sent after the founder manually approves an applicant and sends a personal invite link via the existing invite token system.

54. **In `doSaveProfile()`, always declare `const _isNewRegistration = !SESSION_PLAYER` BEFORE the `try{}` block.** Never declare it inside `try{}` and reference it outside — JavaScript block-scoping causes a silent `ReferenceError` that crashes the function after save with no error shown to the user. New users will see "You're All Set" and then be dumped to `page-welcome` instead of the dashboard.
