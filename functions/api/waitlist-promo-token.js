// Cloudflare Pages Function — /api/waitlist-promo-token
// Generates a short opaque action_tokens token for a waitlist-promotion response link.
// Unlike match-invite-token.js (phone-keyed, fixed 7-day window), this is email-keyed
// (player is always already registered) and expires at the match's own start time.
//
// Authorization (Item #3): caller must be either the match's organizer or have any
// match_responses row for this matchId — same Path A check as match-view-token.js,
// since both real call sites (promoteFromWaitlist(), confirmCantMakeIt()'s promotion
// loop) run from whichever confirmed player's browser triggered the drop/decline, not
// necessarily the organizer. Additionally, playerEmail itself must actually be the
// player who was just promoted — i.e. have a match_responses row for this matchId with
// response='pending' AND filled_from_waitlist=true (the exact state both real call
// sites already PATCH to before minting this token) — never response='waitlist',
// since by mint time the promotion has already flipped that row to 'pending'.
import { createActionToken } from '../_shared/action-tokens.js';
import { verifyCaller } from '../_shared/verify-caller.js';

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ── 1. PARSE + VALIDATE ───────────────────────────────────────────────────
  let body;
  try { body = await context.request.json(); }
  catch (_) { return err('Invalid request body.', 400, corsHeaders); }

  const { matchId, playerEmail } = body || {};

  if (!matchId)     return err('matchId is required.',     400, corsHeaders);
  if (!playerEmail) return err('playerEmail is required.', 400, corsHeaders);

  // ── 2. LOAD ENV ───────────────────────────────────────────────────────────
  const SUPABASE_URL        = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  const svcHdrs = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // ── 3. FETCH MATCH (existence check + organizer_email for Path A, + start time) ──
  let matchDate, timeStart, organizerEmail;
  try {
    const matchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=match_date,time_start,organizer_email&limit=1`,
      { headers: svcHdrs }
    );
    const rows = await matchRes.json();
    if (!Array.isArray(rows) || !rows.length) return err('Match not found.', 404, corsHeaders);
    matchDate = rows[0].match_date;
    timeStart = rows[0].time_start;
    organizerEmail = rows[0].organizer_email;
  } catch (_) {
    return err('Could not look up match. Please try again.', 500, corsHeaders);
  }

  if (!matchDate || !timeStart) return err('Match is missing date/time information.', 400, corsHeaders);

  // ── 4. PATH A — caller must be the organizer or have a response row on this match ──
  const callerEmail = await verifyCaller(context.env, context.request);
  if (!callerEmail) return err('Authentication required.', 401, corsHeaders);

  const isOrganizer = (organizerEmail || '').toLowerCase() === callerEmail.toLowerCase();
  let callerAuthorized = isOrganizer;
  if (!callerAuthorized) {
    try {
      const callerRespRes = await fetch(
        `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${encodeURIComponent(matchId)}&player_email=eq.${encodeURIComponent(callerEmail)}&select=match_id&limit=1`,
        { headers: svcHdrs }
      );
      if (callerRespRes.ok) {
        const callerRespRows = await callerRespRes.json();
        callerAuthorized = Array.isArray(callerRespRows) && callerRespRows.length > 0;
      }
    } catch (_) {}
  }

  if (!callerAuthorized) return err('Not authorized to create a response link for this match.', 401, corsHeaders);

  // ── 5. CONFIRM playerEmail WAS ACTUALLY PROMOTED (response='pending', filled_from_waitlist=true) ──
  let wasPromoted = false;
  try {
    const promoRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${encodeURIComponent(matchId)}&player_email=eq.${encodeURIComponent(playerEmail)}&response=eq.pending&filled_from_waitlist=eq.true&select=match_id&limit=1`,
      { headers: svcHdrs }
    );
    if (promoRes.ok) {
      const promoRows = await promoRes.json();
      wasPromoted = Array.isArray(promoRows) && promoRows.length > 0;
    }
  } catch (_) {}

  if (!wasPromoted) return err('This player was not promoted from the waitlist for this match.', 404, corsHeaders);

  // Expiry = the match's own start time, not a fixed window. If the match has already
  // started/passed, we still issue the token — expiry just ends up in the past, and
  // waitlist-promo-lookup.js will reject it as expired at read time.
  //
  // A fixed +12h buffer is added rather than attempting precise timezone conversion —
  // this Worker has no fixed local timezone (effectively UTC), while match_date/time_start
  // are interpreted in the player's local browser timezone elsewhere in the app, so a
  // naive combined timestamp here could be off by several hours in either direction.
  // Worst-case US timezone skew is under 10 hours, so +12h guarantees the token can never
  // expire BEFORE the real match start. The only downside is the link staying valid for a
  // few extra hours after a match has already started, which is low-risk — the
  // prevent_match_overfill DB trigger still protects against genuine overfill regardless
  // of when this link is clicked.
  const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
  const expiryAt = new Date(`${matchDate}T${timeStart}`).getTime() + TWELVE_HOURS_MS;
  if (Number.isNaN(expiryAt)) return err('Could not compute match start time.', 500, corsHeaders);

  // ── 6. CREATE TOKEN ────────────────────────────────────────────────────────
  // ttlMs may be negative if the match has already started/passed — createActionToken
  // still issues the token, expiry just ends up in the past, and resolveActionToken()
  // will reject it as expired at read time (same behavior as the old HMAC token).
  const ttlMs = expiryAt - Date.now();
  let token;
  try {
    token = await createActionToken(
      context.env,
      'waitlist_promo',
      { matchId, playerEmail },
      ttlMs
    );
  } catch (e) {
    return err('Could not create response link. Please try again.', 500, corsHeaders);
  }

  // ── 7. RESPOND ────────────────────────────────────────────────────────────
  const url = `/waitlist-promo.html?t=${encodeURIComponent(token)}`;
  return new Response(JSON.stringify({ token, url }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

function err(msg, status, corsHeaders) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
