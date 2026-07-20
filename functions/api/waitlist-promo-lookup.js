// Cloudflare Pages Function — /api/waitlist-promo-lookup
// Resolves an opaque action_tokens token and returns player + match details.
import { resolveActionToken } from '../_shared/action-tokens.js';

export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ── 1. READ QUERY PARAMS ──────────────────────────────────────────────────
  const url = new URL(context.request.url);
  const token = url.searchParams.get('t');

  if (!token) return err('Missing token.', 400, corsHeaders);

  // ── 2. LOAD ENV ───────────────────────────────────────────────────────────
  const SUPABASE_URL          = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY  = context.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 3. RESOLVE TOKEN ──────────────────────────────────────────────────────
  // Expiry is the match's own start time (set by waitlist-promo-token.js) — once the
  // match has started, resolveActionToken() rejects the token as expired. Note:
  // resolveActionToken() returns null for "not found", "wrong link_type", and
  // "expired" alike, so this single message now covers all three cases rather than
  // the old code's distinct "already started" vs "invalid" wording.
  const row = await resolveActionToken(context.env, token, 'waitlist_promo');
  if (!row) return err('This response link is invalid or has expired.', 401, corsHeaders);

  const { matchId, playerEmail } = row.payload || {};

  const svcHdrs = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // ── 4. MATCH DETAILS ───────────────────────────────────────────────────────
  // NOTE: only columns confirmed real via extensive live usage elsewhere in app.js are
  // selected here. CLAUDE-SCHEMA.md lists a `format` column, but no query anywhere in
  // app.js actually selects `format` from `matches` — every real usage derives a
  // "format" display string client-side from match_type + gender_pref instead. Since an
  // invalid column name in `select=` would 400 this entire request, `format` is
  // deliberately omitted here rather than assumed safe. `organizer_name` is included
  // even though not explicitly requested, since it's confirmed real via dozens of
  // existing live queries (e.g. respondToMatch(), promoteFromWaitlist()) and gives a
  // better display name than deriving one from organizer_email.
  let matchDetails = null;
  try {
    const matchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=match_date,time_start,time_end,court_name,match_type,gender_pref,organizer_name,organizer_email&limit=1`,
      { headers: svcHdrs }
    );
    const matchRows = await matchRes.json();
    if (Array.isArray(matchRows) && matchRows.length > 0) matchDetails = matchRows[0];
  } catch (_) {}

  // ── 5. CURRENT RESPONSE STATUS ─────────────────────────────────────────────
  // Confirms whether this player is actually still in the 'pending' (promoted) state
  // this link assumes — they may have already responded, or the spot may have been
  // claimed/reassigned since the notification went out.
  let currentResponseStatus = null;
  try {
    const respRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${encodeURIComponent(matchId)}&player_email=eq.${encodeURIComponent(playerEmail)}&select=response&limit=1`,
      { headers: svcHdrs }
    );
    const respRows = await respRes.json();
    if (Array.isArray(respRows) && respRows.length > 0) currentResponseStatus = respRows[0].response;
  } catch (_) {}

  // ── 6. PLAYER NAME (registrations, service role — never phone/sms_opt_in, per Rule 48) ──
  let playerFirstName = '';
  try {
    const regRes = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(playerEmail)}&select=first_name&limit=1`,
      { headers: svcHdrs }
    );
    const regRows = await regRes.json();
    if (Array.isArray(regRows) && regRows.length > 0) playerFirstName = regRows[0].first_name || '';
  } catch (_) {}

  // ── 7. RESPOND ─────────────────────────────────────────────────────────────
  return new Response(JSON.stringify({
    playerFirstName,
    matchDetails,
    currentResponseStatus,
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
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
