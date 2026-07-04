// Cloudflare Pages Function — /api/waitlist-promo-token
// Generates a signed HMAC-SHA256 token for a waitlist-promotion response link.
// Unlike match-invite-token.js (phone-keyed, fixed 7-day window), this is email-keyed
// (player is always already registered) and expires at the match's own start time.
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
  const secret             = context.env.MATCH_INVITE_SECRET;
  const SUPABASE_URL        = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!secret || !SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 3. FETCH MATCH START TIME ─────────────────────────────────────────────
  let matchDate, timeStart;
  try {
    const matchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=match_date,time_start&limit=1`,
      { headers: { 'apikey': SUPABASE_SERVICE_KEY, 'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}` } }
    );
    const rows = await matchRes.json();
    if (!Array.isArray(rows) || !rows.length) return err('Match not found.', 404, corsHeaders);
    matchDate = rows[0].match_date;
    timeStart = rows[0].time_start;
  } catch (_) {
    return err('Could not look up match. Please try again.', 500, corsHeaders);
  }

  if (!matchDate || !timeStart) return err('Match is missing date/time information.', 400, corsHeaders);

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
  const expiry = new Date(`${matchDate}T${timeStart}`).getTime() + TWELVE_HOURS_MS;
  if (Number.isNaN(expiry)) return err('Could not compute match start time.', 500, corsHeaders);

  // ── 4. BUILD PAYLOAD ───────────────────────────────────────────────────────
  const token = `${matchId}|${playerEmail}|${expiry}`;

  // ── 5. SIGN WITH HMAC-SHA256 (identical method to match-invite-token.js) ──
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign('HMAC', keyMaterial, enc.encode(token));
  const signature = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // ── 6. RESPOND ────────────────────────────────────────────────────────────
  const url = `/waitlist-promo.html?t=${encodeURIComponent(token)}&s=${signature}`;
  return new Response(JSON.stringify({ token, signature, url }), {
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
