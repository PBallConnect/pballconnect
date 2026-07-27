// Cloudflare Pages Function — /api/match-view-lookup
// Resolves an opaque action_tokens token (?t=TOKEN) and returns a safe subset of
// match details. Replaces checkMatchToken()'s old direct client-side
// `matches?id=eq.X&select=*` anon-key query (Known Issue #23) — no client ever
// queries `matches` directly for this deep-link path anymore.
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
  const SUPABASE_URL         = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 3. RESOLVE TOKEN ──────────────────────────────────────────────────────
  const row = await resolveActionToken(context.env, token, 'match_view');
  if (!row) return err('This link is invalid or has expired.', 401, corsHeaders);

  const { matchId } = row.payload || {};

  const svcHdrs = {
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // ── 4. MATCH DETAILS ───────────────────────────────────────────────────────
  // Same safe field subset as waitlist-promo-lookup.js — `format` is not a real
  // column (Rule 65) and is deliberately omitted.
  let matchDetails = null;
  try {
    const matchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=id,match_date,time_start,time_end,court_name,match_type,gender_pref,organizer_name,organizer_email,status&limit=1`,
      { headers: svcHdrs }
    );
    if (matchRes.ok) {
      const matchRows = await matchRes.json();
      if (Array.isArray(matchRows) && matchRows.length > 0) matchDetails = matchRows[0];
    }
  } catch (_) {}

  if (!matchDetails) return err('Match not found.', 404, corsHeaders);

  // ── 5. RESPOND ────────────────────────────────────────────────────────────
  return new Response(JSON.stringify({ matchDetails }), {
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
