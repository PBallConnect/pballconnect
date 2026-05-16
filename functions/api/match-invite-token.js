// Cloudflare Pages Function — /api/match-invite-token
// Generates a signed HMAC-SHA256 token for match invites.
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

  const { matchId, inviteePhone, inviteeName, organizerEmail } = body || {};

  if (!matchId)       return err('matchId is required.',       400, corsHeaders);
  if (!inviteePhone)  return err('inviteePhone is required.',  400, corsHeaders);
  if (!inviteeName)   return err('inviteeName is required.',   400, corsHeaders);
  if (!organizerEmail) return err('organizerEmail is required.', 400, corsHeaders);

  // ── 2. LOAD SECRET ────────────────────────────────────────────────────────
  const secret = context.env.MATCH_INVITE_SECRET;
  if (!secret) return err('Service configuration error.', 500, corsHeaders);

  // ── 3. BUILD PAYLOAD ──────────────────────────────────────────────────────
  const expiry = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  const token = `${matchId}|${inviteePhone}|${inviteeName}|${organizerEmail}|${expiry}`;

  // ── 4. SIGN WITH HMAC-SHA256 ──────────────────────────────────────────────
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

  // ── 5. RESPOND ────────────────────────────────────────────────────────────
  const url = `/match-invite.html?t=${encodeURIComponent(token)}&s=${signature}`;
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
