// Cloudflare Pages Function — /api/match-view-token
// Generates a short opaque action_tokens token for a read-only "view this match"
// deep link — replaces the old unauthenticated ?match=ID pattern that let anyone
// query the full `matches` row client-side via the anon key (Known Issue #23).
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

  const { matchId } = body || {};

  if (!matchId) return err('matchId is required.', 400, corsHeaders);

  if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 2. CREATE TOKEN (30-day TTL — informational view link, not a time-boxed RSVP) ──
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

  // ── 3. RESPOND ────────────────────────────────────────────────────────────
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
