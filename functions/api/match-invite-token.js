// Cloudflare Pages Function — /api/match-invite-token
// Generates a short opaque action_tokens token for match invites.
//
// Authorization (Item #3): strictly organizer-only. There is exactly one
// legitimate caller — the organizer's own authenticated app.js session,
// inviting IC members to a match they just created (app.js:4499) — so
// unlike match-view-token.js there is no participant fallback here.
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

  const { matchId, inviteePhone, inviteeName, organizerEmail } = body || {};

  if (!matchId)       return err('matchId is required.',       400, corsHeaders);
  if (!inviteePhone)  return err('inviteePhone is required.',  400, corsHeaders);
  if (!inviteeName)   return err('inviteeName is required.',   400, corsHeaders);
  if (!organizerEmail) return err('organizerEmail is required.', 400, corsHeaders);

  if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 2. VERIFY CALLER IS THE MATCH'S ORGANIZER ─────────────────────────────
  const callerEmail = await verifyCaller(context.env, context.request);
  if (!callerEmail) return err('Authentication required.', 401, corsHeaders);

  let match = null;
  try {
    const matchRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=id,organizer_email&limit=1`,
      {
        headers: {
          'apikey': context.env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    if (matchRes.ok) {
      const rows = await matchRes.json();
      if (Array.isArray(rows) && rows.length > 0) match = rows[0];
    }
  } catch (_) {}

  if (!match) return err('Match not found.', 404, corsHeaders);

  const isOrganizer = (match.organizer_email || '').toLowerCase() === callerEmail.toLowerCase();
  if (!isOrganizer) return err('Only the match organizer can send invites for this match.', 401, corsHeaders);

  // ── 3. CREATE TOKEN (7-day TTL, same as the old HMAC token's expiry) ──────
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

  // ── 4. RESPOND ────────────────────────────────────────────────────────────
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
