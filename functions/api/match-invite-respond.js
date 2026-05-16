// Cloudflare Pages Function — /api/match-invite-respond
// Records a player's YES or NO response to a match invite via signed HMAC token.
export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // ── 1. PARSE BODY ─────────────────────────────────────────────────────────
  let body;
  try { body = await context.request.json(); }
  catch (_) { return err('Invalid request body.', 400, corsHeaders); }

  const { token, signature, response } = body || {};

  if (!token || !signature)              return err('Missing token or signature.', 400, corsHeaders);
  if (response !== 'in' && response !== 'out') return err('response must be "in" or "out".', 400, corsHeaders);

  // ── 2. LOAD ENV ───────────────────────────────────────────────────────────
  const secret             = context.env.MATCH_INVITE_SECRET;
  const SUPABASE_URL       = context.env.SUPABASE_URL;
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
  const [matchId, inviteePhone, , , expiryStr] = parts;

  // ── 5. CHECK EXPIRY ───────────────────────────────────────────────────────
  if (Date.now() > parseInt(expiryStr, 10)) return err('Token expired.', 401, corsHeaders);

  // ── 6. LOOK UP INVITEE BY PHONE ───────────────────────────────────────────
  const svcHdrs = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  let playerEmail;
  try {
    const regRes = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?phone=eq.${encodeURIComponent(inviteePhone)}&select=email&limit=1`,
      { headers: svcHdrs }
    );
    const regRows = await regRes.json();
    if (!Array.isArray(regRows) || !regRows.length)
      return err('No registered player found for this phone number.', 404, corsHeaders);
    playerEmail = regRows[0].email;
  } catch (_) {
    return err('Could not look up player. Please try again.', 500, corsHeaders);
  }

  // ── 7. UPSERT MATCH RESPONSE ──────────────────────────────────────────────
  try {
    const upsertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses`,
      {
        method: 'POST',
        headers: {
          ...svcHdrs,
          'Prefer': 'return=minimal,resolution=merge-duplicates',
        },
        body: JSON.stringify({
          match_id:     matchId,
          player_email: playerEmail,
          response,
          responded_at: new Date().toISOString(),
        }),
      }
    );
    if (!upsertRes.ok) {
      const text = await upsertRes.text();
      throw new Error(text);
    }
  } catch (e) {
    return err('Could not record your response. Please try again.', 500, corsHeaders);
  }

  // ── 8. UPDATE INVITE STATUS (best-effort) ─────────────────────────────────
  // invites rows for SMS match invites are keyed by invite_token — the token
  // here is an HMAC payload, not an invite_token, so we match on invitee_email.
  const inviteStatus = response === 'in' ? 'accepted' : 'declined';
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/invites?invitee_email=eq.${encodeURIComponent(playerEmail)}`,
      {
        method: 'PATCH',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: inviteStatus }),
      }
    );
  } catch (_) {}

  // ── 9. RESPOND ────────────────────────────────────────────────────────────
  return new Response(JSON.stringify({ success: true, response }), {
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
