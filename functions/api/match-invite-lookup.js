// Cloudflare Pages Function — /api/match-invite-lookup
// Resolves an opaque action_tokens token and returns invitee + match details.
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
  const SUPABASE_URL     = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 3. RESOLVE TOKEN ──────────────────────────────────────────────────────
  // resolveActionToken() returns null for "not found", "wrong link_type", and
  // "expired" alike, so this single message now covers all three cases rather than
  // the old code's distinct "Invalid token" vs "Token expired" wording.
  const row = await resolveActionToken(context.env, token, 'match_invite');
  if (!row) return err('This invite link is invalid or has expired.', 401, corsHeaders);

  const { matchId, inviteePhone, inviteeName, organizerEmail } = row.payload || {};

  // ── 4. SUPABASE LOOKUPS ───────────────────────────────────────────────────
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
  // NOTE: `location` and `start_time` are not real columns on `matches` (per
  // CLAUDE-SCHEMA.md, the real columns are `court_name` and `time_start`). Aliased
  // here via PostgREST's `alias:column` select syntax so the response keeps the
  // exact field names match-invite.html already reads (details.location,
  // details.start_time) — no client-side change needed.
  let matchDetails = null;
  try {
    const matchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=location:court_name,match_date,start_time:time_start,format,gender_pref,match_type,organizer_email&limit=1`,
      { headers: svcHdrs }
    );
    if (!matchRes.ok) {
      console.error('match-invite-lookup: matches query failed', matchRes.status, await matchRes.text());
    } else {
      const matchRows = await matchRes.json();
      if (Array.isArray(matchRows) && matchRows.length > 0) {
        matchDetails = matchRows[0];
      }
    }
  } catch (_) {}

  // ── 5. RESPOND ────────────────────────────────────────────────────────────
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
