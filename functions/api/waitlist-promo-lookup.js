// Cloudflare Pages Function — /api/waitlist-promo-lookup
// Validates a signed HMAC waitlist-promotion token and returns player + match details.
export async function onRequestGet(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ── 1. READ QUERY PARAMS ──────────────────────────────────────────────────
  const url = new URL(context.request.url);
  const token     = url.searchParams.get('t');
  const signature = url.searchParams.get('s');

  if (!token || !signature) return err('Missing token or signature.', 400, corsHeaders);

  // ── 2. LOAD ENV ───────────────────────────────────────────────────────────
  const secret               = context.env.MATCH_INVITE_SECRET;
  const SUPABASE_URL          = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY  = context.env.SUPABASE_SERVICE_KEY;

  if (!secret || !SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 3. VERIFY SIGNATURE (re-derived from scratch — nothing trusted from client) ──
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(token));
  const expected = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  if (expected !== signature) return err('Invalid token.', 401, corsHeaders);

  // ── 4. PARSE PAYLOAD ──────────────────────────────────────────────────────
  const parts = token.split('|');
  if (parts.length !== 3) return err('Malformed token.', 400, corsHeaders);
  const [matchId, playerEmail, expiryStr] = parts;

  // ── 5. CHECK EXPIRY ────────────────────────────────────────────────────────
  // Expiry is the match's own start time (set by waitlist-promo-token.js) — once the
  // match has started, this link is no longer valid for responding.
  if (Date.now() > parseInt(expiryStr, 10)) return err('This match has already started — the link has expired.', 401, corsHeaders);

  const svcHdrs = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // ── 6. MATCH DETAILS ───────────────────────────────────────────────────────
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

  // ── 7. CURRENT RESPONSE STATUS ─────────────────────────────────────────────
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

  // ── 8. PLAYER NAME (registrations, service role — never phone/sms_opt_in, per Rule 48) ──
  let playerFirstName = '';
  try {
    const regRes = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(playerEmail)}&select=first_name&limit=1`,
      { headers: svcHdrs }
    );
    const regRows = await regRes.json();
    if (Array.isArray(regRows) && regRows.length > 0) playerFirstName = regRows[0].first_name || '';
  } catch (_) {}

  // ── 9. RESPOND ─────────────────────────────────────────────────────────────
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
