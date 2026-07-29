// Cloudflare Pages Function — /api/match-view-token
// Generates a short opaque action_tokens token for a read-only "view this match"
// deep link — replaces the old unauthenticated ?match=ID pattern that let anyone
// query the full `matches` row client-side via the anon key (Known Issue #23).
//
// Authorization (Item #2): a caller must prove a real relationship to the
// requested match before a token is minted — two paths:
//   Path A — authenticated app.js session: the Authorization header is
//     resolved to a verified email via verifyCaller() (never a client-claimed
//     email), then that email must be either the match's organizer_email or
//     have an existing match_responses row for this matchId.
//   Path B — standalone match-invite.html/waitlist-promo.html pages, no app
//     session: the client's already-resolved match_invite/waitlist_promo
//     response token (`responseToken` in the body) is re-resolved server-side
//     and its payload.matchId must match the requested matchId.
// If neither path authorizes, no token is minted.
import { createActionToken, resolveActionToken } from '../_shared/action-tokens.js';
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

  const { matchId, responseToken } = body || {};

  if (!matchId) return err('matchId is required.', 400, corsHeaders);

  if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  const svcHdrs = {
    'apikey': context.env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
  };

  // ── 2. CONFIRM THE MATCH EXISTS (also fetches organizer_email for Path A) ──
  // Closes the open write vector this endpoint previously had: no existence
  // check meant any string could be minted into action_tokens as a matchId.
  let match = null;
  try {
    const matchRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=id,organizer_email&limit=1`,
      { headers: svcHdrs }
    );
    if (matchRes.ok) {
      const rows = await matchRes.json();
      if (Array.isArray(rows) && rows.length > 0) match = rows[0];
    }
  } catch (_) {}

  if (!match) return err('Match not found.', 404, corsHeaders);

  // ── 3. PATH A — authenticated app.js session ──────────────────────────────
  // verifyCaller() already returns null for a missing, malformed, expired, or
  // otherwise invalid Authorization header — Path B callers (the standalone
  // RSVP pages) never send one at all, so that case falls straight through to
  // Path B below with no separate branching needed here.
  let authorized = false;

  const callerEmail = await verifyCaller(context.env, context.request);
  if (callerEmail) {
    const isOrganizer = (match.organizer_email || '').toLowerCase() === callerEmail.toLowerCase();
    let hasResponseRow = false;
    if (!isOrganizer) {
      try {
        const respRes = await fetch(
          `${context.env.SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${encodeURIComponent(matchId)}&player_email=eq.${encodeURIComponent(callerEmail)}&select=match_id&limit=1`,
          { headers: svcHdrs }
        );
        if (respRes.ok) {
          const respRows = await respRes.json();
          hasResponseRow = Array.isArray(respRows) && respRows.length > 0;
        }
      } catch (_) {}
    }
    authorized = isOrganizer || hasResponseRow;
  }

  // ── 4. PATH B — standalone RSVP page, proof is its own resolved token ─────
  if (!authorized && responseToken) {
    let row = await resolveActionToken(context.env, responseToken, 'match_invite');
    if (!row) row = await resolveActionToken(context.env, responseToken, 'waitlist_promo');
    if (row && row.payload && row.payload.matchId === matchId) authorized = true;
  }

  if (!authorized) return err('Not authorized to create a link for this match.', 401, corsHeaders);

  // ── 5. CREATE TOKEN (30-day TTL — informational view link, not a time-boxed RSVP) ──
  const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
  let token;
  try {
    token = await createActionToken(
      context.env,
      'match_view',
      { matchId },
      THIRTY_DAYS_MS
    );
  } catch (e) {
    return err('Could not create match link. Please try again.', 500, corsHeaders);
  }

  // ── 6. RESPOND ────────────────────────────────────────────────────────────
  const url = `/app.html?t=${encodeURIComponent(token)}`;
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
