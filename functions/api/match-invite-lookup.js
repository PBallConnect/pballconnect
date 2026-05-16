// Cloudflare Pages Function — /api/match-invite-lookup
// Validates a signed HMAC match-invite token and returns invitee + match details.
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
  const secret           = context.env.MATCH_INVITE_SECRET;
  const SUPABASE_URL     = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!secret || !SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 3. VERIFY SIGNATURE ───────────────────────────────────────────────────
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
  if (parts.length !== 5) return err('Malformed token.', 400, corsHeaders);
  const [matchId, inviteePhone, inviteeName, organizerEmail, expiryStr] = parts;

  // ── 5. CHECK EXPIRY ───────────────────────────────────────────────────────
  if (Date.now() > parseInt(expiryStr, 10)) return err('Token expired.', 401, corsHeaders);

  // ── 6. SUPABASE LOOKUPS ───────────────────────────────────────────────────
  const svcHdrs = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // Invitee registration status — match on phone (10-digit string)
  let registered = false;
  let inviteeData = null;
  try {
    const regRes = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?phone=eq.${encodeURIComponent(inviteePhone)}&select=first_name,email,sms_opt_in&limit=1`,
      { headers: svcHdrs }
    );
    const regRows = await regRes.json();
    if (Array.isArray(regRows) && regRows.length > 0) {
      registered = true;
      inviteeData = regRows[0];
    }
  } catch (_) {}

  // Match details
  let matchDetails = null;
  try {
    const matchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=location,match_date,start_time,format,match_type,organizer_email&limit=1`,
      { headers: svcHdrs }
    );
    const matchRows = await matchRes.json();
    if (Array.isArray(matchRows) && matchRows.length > 0) {
      matchDetails = matchRows[0];
    }
  } catch (_) {}

  // ── 7. RESPOND ────────────────────────────────────────────────────────────
  return new Response(JSON.stringify({
    registered,
    inviteeName,
    inviteePhone,
    inviteeData: registered ? inviteeData : null,
    matchDetails,
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
