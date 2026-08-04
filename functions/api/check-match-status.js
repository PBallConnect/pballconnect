// Cloudflare Pages Function — /api/check-match-status
// Fixes Bug 9 (CLAUDE-TESTING.md): the in-app roster-fill check previously ran
// client-side under the responding participant's own session token, reading
// match_responses through the "Users can read relevant match responses" RLS
// policy (auth.email() = player_email OR caller organizes the match). A
// non-organizer accepting a match can only ever see their OWN response row
// under that policy, so the roster count was silently undercounted and the
// match never flipped to 'full' via the in-app Accept flow.
//
// This endpoint moves the count under SUPABASE_SERVICE_KEY (bypasses RLS,
// sees every response row regardless of caller), following match-view-token.js's
// exact Path-A authorization pattern: verifyCaller() resolves the real caller
// identity (never a client-claimed email), then the caller must be either the
// match's organizer or have an existing match_responses row for this match.
// There is no Path B — every real caller of this endpoint is an authenticated
// app.js session (respondToMatch(), loadMyInvitesPage()'s background
// reconciliation), unlike match-view-token.js which also serves standalone
// no-login RSVP pages.
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

  const { matchId } = body || {};
  if (!matchId) return err('matchId is required.', 400, corsHeaders);

  if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  const svcHdrs = {
    'Content-Type': 'application/json',
    'apikey': context.env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
  };

  // ── 2. CONFIRM THE MATCH EXISTS (also fetches fields needed for the roster check) ──
  let match = null;
  try {
    const matchRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}&select=id,organizer_email,status,match_type,max_players&limit=1`,
      { headers: svcHdrs }
    );
    if (matchRes.ok) {
      const rows = await matchRes.json();
      if (Array.isArray(rows) && rows.length > 0) match = rows[0];
    }
  } catch (e) {
    console.error('check-match-status: match lookup failed', matchId, e);
  }

  if (!match) return err('Match not found.', 404, corsHeaders);

  // ── 3. AUTHORIZE — organizer OR an existing match_responses row (Path A only) ──
  const callerEmail = await verifyCaller(context.env, context.request);
  let authorized = false;
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
      } catch (e) {
        console.error('check-match-status: response-row authorization check failed', matchId, callerEmail, e);
      }
    }
    authorized = isOrganizer || hasResponseRow;
  }

  if (!authorized) return err('Not authorized to check this match\'s status.', 401, corsHeaders);

  // ── 4. ROSTER COUNT / STATUS FLIP (service role — bypasses RLS entirely) ───
  // Deliberate deviation from the old client-side checkAndUpdateMatchStatus(),
  // which swallowed every failure in a bare catch(e){} with no trace left
  // anywhere. Failures here are logged server-side (visible in Cloudflare
  // Function logs) AND surfaced to the caller as a real error, instead of a
  // silent no-op that looks identical to "match not full yet."
  const needed = match.max_players || (match.match_type === 'doubles' ? 4 : 2);
  let confirmedCount = 0;
  let callerIn = false;
  try {
    const respCountRes = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${encodeURIComponent(matchId)}&response=eq.in&select=player_email`,
      { headers: svcHdrs }
    );
    if (!respCountRes.ok) {
      const text = await respCountRes.text();
      console.error('check-match-status: confirmed-count read failed', matchId, respCountRes.status, text);
      return err('Could not check match status. Please try again.', 500, corsHeaders);
    }
    const confirmed = await respCountRes.json();
    confirmedCount = confirmed.length;
    // Scoped to only the verified caller's own status — never the full roster.
    // Callers only ever need to know whether THEY are already 'in', which they
    // could already see via their own self-scoped match_responses read anyway;
    // computing it here just saves that extra round trip.
    callerIn = confirmed.some(r => r.player_email === callerEmail);
  } catch (e) {
    console.error('check-match-status: confirmed-count read threw', matchId, e);
    return err('Could not check match status. Please try again.', 500, corsHeaders);
  }

  let status = match.status;
  let wasJustFilled = false;
  if (confirmedCount >= needed && match.status !== 'full') {
    try {
      const patchRes = await fetch(`${context.env.SUPABASE_URL}/rest/v1/matches?id=eq.${encodeURIComponent(matchId)}`, {
        method: 'PATCH',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'full' }),
      });
      if (!patchRes.ok) {
        const text = await patchRes.text();
        console.error('check-match-status: status-flip PATCH failed', matchId, patchRes.status, text);
        return err('Could not update match status. Please try again.', 500, corsHeaders);
      }
      status = 'full';
      wasJustFilled = true;
    } catch (e) {
      console.error('check-match-status: status-flip PATCH threw', matchId, e);
      return err('Could not update match status. Please try again.', 500, corsHeaders);
    }
  }

  // ── 5. RESPOND ────────────────────────────────────────────────────────────
  return new Response(JSON.stringify({
    success: true,
    needed,
    confirmedCount,
    callerIn,
    status,
    wasJustFilled,
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
