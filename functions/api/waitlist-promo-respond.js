// Cloudflare Pages Function — /api/waitlist-promo-respond
// Records a promoted waitlist player's YES ('in') or NO ('out') response via signed HMAC token.
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

  if (!token || !signature)                    return err('Missing token or signature.', 400, corsHeaders);
  if (response !== 'in' && response !== 'out')  return err('response must be "in" or "out".', 400, corsHeaders);

  // ── 2. LOAD ENV ───────────────────────────────────────────────────────────
  const secret               = context.env.MATCH_INVITE_SECRET;
  const SUPABASE_URL          = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY  = context.env.SUPABASE_SERVICE_KEY;

  if (!secret || !SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 3. VERIFY SIGNATURE (independent of waitlist-promo-lookup.js) ─────────
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
  if (parts.length !== 3) return err('Malformed token.', 400, corsHeaders);
  const [matchId, playerEmail, expiryStr] = parts;

  // ── 5. CHECK EXPIRY ────────────────────────────────────────────────────────
  if (Date.now() > parseInt(expiryStr, 10)) return err('This match has already started — the link has expired.', 401, corsHeaders);

  const svcHdrs = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // ── 6. WRITE MATCH RESPONSE ────────────────────────────────────────────────
  // Mirrors respondToMatch()'s dual PATCH-then-INSERT-fallback pattern in app.js (used
  // for both 'in' and 'out', not just the merge-duplicates POST that the older
  // match-invite-respond.js uses) for consistency with the rest of the app's write path.
  //
  // NOTE on 'out': a promoted player's row is already 'pending' (not 'waitlist') by the
  // time this link is reachable — promoteFromWaitlist()/confirmCantMakeIt() flip
  // 'waitlist' -> 'pending' at promotion time, before any notification is sent. So a
  // decline here writes response:'out', the same as any other pending-invite decline —
  // 'waitlist_left' does not apply, since that value specifically represents a player
  // voluntarily leaving a row that is still in 'waitlist' status (the Leave Waitlist
  // button), which is not this player's current state.
  try {
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/match_responses?match_id=eq.${encodeURIComponent(matchId)}&player_email=eq.${encodeURIComponent(playerEmail)}`,
      {
        method: 'PATCH',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ response, responded_at: new Date().toISOString() }),
      }
    );

    if (patchRes.ok) {
      const contentRange = patchRes.headers.get('content-range');
      if (contentRange === '*/0' || contentRange === null) {
        // No existing row — fall back to INSERT.
        const insertRes = await fetch(
          `${SUPABASE_URL}/rest/v1/match_responses`,
          {
            method: 'POST',
            headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
            body: JSON.stringify({
              match_id: matchId,
              player_email: playerEmail,
              response,
              responded_at: new Date().toISOString(),
            }),
          }
        );
        if (!insertRes.ok) {
          const insertErrText = await insertRes.text();
          if (insertErrText.includes('MATCH_FULL')) {
            return matchFullResponse(corsHeaders);
          }
          return errorResponse(corsHeaders);
        }
      }
    } else {
      const patchErrText = await patchRes.text();
      if (patchErrText.includes('MATCH_FULL')) {
        return matchFullResponse(corsHeaders);
      }
      return errorResponse(corsHeaders);
    }
  } catch (_) {
    return errorResponse(corsHeaders);
  }

  // ── 7. RESPOND ─────────────────────────────────────────────────────────────
  return new Response(JSON.stringify({ success: true, response }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// Distinct outcome for the prevent_match_overfill DB trigger rejection — mirrors the
// exact 'MATCH_FULL' substring check handleMatchFullRace()/respondToMatch() use in app.js.
function matchFullResponse(corsHeaders) {
  return new Response(JSON.stringify({ success: false, reason: 'MATCH_FULL' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function errorResponse(corsHeaders) {
  return new Response(JSON.stringify({ success: false, reason: 'error' }), {
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
