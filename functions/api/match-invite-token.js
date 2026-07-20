// Cloudflare Pages Function — /api/match-invite-token
// Generates a short opaque action_tokens token for match invites.
import { createActionToken } from '../_shared/action-tokens.js';

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

  if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 2. CREATE TOKEN (7-day TTL, same as the old HMAC token's expiry) ──────
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  let token;
  try {
    token = await createActionToken(
      context.env,
      'match_invite',
      { matchId, inviteePhone, inviteeName, organizerEmail },
      SEVEN_DAYS_MS
    );
  } catch (e) {
    return err('Could not create invite link. Please try again.', 500, corsHeaders);
  }

  // ── 3. RESPOND ────────────────────────────────────────────────────────────
  const url = `/match-invite.html?t=${encodeURIComponent(token)}`;
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
