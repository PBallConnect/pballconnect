// Cloudflare Pages Function — /api/match-invite-respond
// Records a player's YES or NO response to a match invite via an opaque action_tokens token.
import { resolveActionToken, markActionTokenUsed } from '../_shared/action-tokens.js';

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

  const { token, response } = body || {};

  if (!token)                                  return err('Missing token.', 400, corsHeaders);
  if (response !== 'in' && response !== 'out') return err('response must be "in" or "out".', 400, corsHeaders);

  // ── 2. LOAD ENV ───────────────────────────────────────────────────────────
  const SUPABASE_URL       = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 3. RESOLVE TOKEN ──────────────────────────────────────────────────────
  const row = await resolveActionToken(context.env, token, 'match_invite');
  if (!row) return err('This invite link is invalid or has expired.', 401, corsHeaders);

  const { matchId, inviteePhone } = row.payload || {};

  // ── 4. LOOK UP INVITEE BY PHONE ───────────────────────────────────────────
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

  // ── 5. UPSERT MATCH RESPONSE ──────────────────────────────────────────────
  try {
    const upsertRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?on_conflict=match_id,player_email`,
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
      console.error('match-invite-respond: match_responses write failed', upsertRes.status, text);
      throw new Error(text);
    }
  } catch (e) {
    return err('Could not record your response. Please try again.', 500, corsHeaders);
  }

  // ── 6. UPDATE INVITE STATUS ───────────────────────────────────────────────
  const inviteStatus = response === 'in' ? 'accepted' : 'declined';
  const patchRes = await fetch(
    `${SUPABASE_URL}/rest/v1/invites?match_id=eq.${encodeURIComponent(matchId)}&invitee_phone=eq.${encodeURIComponent(inviteePhone)}`,
    {
      method: 'PATCH',
      headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
      body: JSON.stringify({ status: inviteStatus }),
    }
  );
  if (!patchRes.ok) {
    const patchText = await patchRes.text().catch(() => '');
    console.error('Failed to update invite status:', patchRes.status, patchText);
  }

  // ── 7. MARK TOKEN USED (best-effort, observability only) ──────────────────
  await markActionTokenUsed(context.env, token);

  // ── 8. RESPOND ────────────────────────────────────────────────────────────
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
