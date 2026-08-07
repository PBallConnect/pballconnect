// Cloudflare Pages Function — /api/approve-connection
// Fixes Bug #2: showStep2() in handlePostRegistrationInvite() (app.js) tried to PATCH
// the inviter's connections row to status='approved' directly from the client under
// the new user's own session JWT, using a two-step primary/fallback match. Both steps
// could silently fail without ever surfacing an error:
//   - The UPDATE RLS policy (`auth.email() = requester_email or auth.email() =
//     recipient_email`) can never be satisfied by the fallback match, because that
//     match targets a row whose recipient_email is still the 'pending_<token>'
//     placeholder — the caller isn't yet equal to either side of the policy, since
//     establishing that equality is the whole point of the write. Same class of gap
//     as Bug #1's invites SELECT.
//   - Independently, the primary match's filter interpolated the recipient email RAW
//     (no percent-encoding) into the query string. A literal '+' in an unencoded query
//     string is decoded as a space by standard URL parsing, so any '+'-tagged email
//     (e.g. decelectron+overlay2@gmail.com) silently matched zero rows.
//   - Both failure modes return HTTP 200/204 with an empty body (Prefer:
//     return=minimal), so the client had no way to distinguish "0 rows matched" from
//     "1 row updated" — it treated both as success.
//
// This endpoint moves the write under SUPABASE_SERVICE_KEY (bypasses RLS entirely —
// the connections table's policies are untouched) and percent-encodes every
// interpolated value. It also requests the updated row back (Prefer:
// return=representation) so it can tell a real update from a zero-match no-op and
// report that truthfully to the client, instead of inferring "success" from HTTP status
// alone.
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

  const { inviterEmail, newPlayerEmail, inviteToken } = body || {};
  if (!inviterEmail || !newPlayerEmail) return err('inviterEmail and newPlayerEmail are required.', 400, corsHeaders);

  if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY || !context.env.SUPABASE_ANON_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 2. AUTHORIZE — caller must be the person accepting (newPlayerEmail) ────
  const callerEmail = await verifyCaller(context.env, context.request);
  if (!callerEmail) return err('Authentication required.', 401, corsHeaders);
  if (callerEmail.toLowerCase() !== String(newPlayerEmail).toLowerCase())
    return err('Not authorized to approve this connection.', 401, corsHeaders);

  const svcHdrs = {
    'Content-Type': 'application/json',
    'apikey': context.env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
    // Request the updated rows back so a real update can be told apart from a
    // zero-match no-op — this is the check the original client-side PATCHes never did.
    'Prefer': 'return=representation',
  };

  // ── 3. PRIMARY MATCH — row already has the real recipient_email ────────────
  try {
    const primaryUrl = `${context.env.SUPABASE_URL}/rest/v1/connections`
      + `?requester_email=eq.${encodeURIComponent(inviterEmail)}`
      + `&recipient_email=eq.${encodeURIComponent(newPlayerEmail)}`;
    const primaryRes = await fetch(primaryUrl, {
      method: 'PATCH',
      headers: svcHdrs,
      body: JSON.stringify({ status: 'approved' }),
    });
    if (primaryRes.ok) {
      const rows = await primaryRes.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return ok({ success: true, matchedVia: 'primary' }, corsHeaders);
      }
    } else {
      console.error('approve-connection: primary PATCH failed', primaryRes.status, await primaryRes.text());
    }
  } catch (e) {
    console.error('approve-connection: primary PATCH threw', e);
  }

  // ── 4. FALLBACK MATCH — row still keyed on the 'pending_<token>' placeholder ──
  if (inviteToken) {
    try {
      const pendingKey = 'pending_' + inviteToken;
      const fallbackUrl = `${context.env.SUPABASE_URL}/rest/v1/connections`
        + `?requester_email=eq.${encodeURIComponent(inviterEmail)}`
        + `&recipient_email=eq.${encodeURIComponent(pendingKey)}`;
      const fallbackRes = await fetch(fallbackUrl, {
        method: 'PATCH',
        headers: svcHdrs,
        body: JSON.stringify({ recipient_email: newPlayerEmail, status: 'approved' }),
      });
      if (fallbackRes.ok) {
        const rows = await fallbackRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          return ok({ success: true, matchedVia: 'fallback' }, corsHeaders);
        }
      } else {
        console.error('approve-connection: fallback PATCH failed', fallbackRes.status, await fallbackRes.text());
      }
    } catch (e) {
      console.error('approve-connection: fallback PATCH threw', e);
    }
  }

  // ── 5. NEITHER MATCHED — report honestly, don't fake success ───────────────
  return err('No matching connection request found for this invite.', 404, corsHeaders, { success: false });
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

function ok(payload, corsHeaders) {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function err(msg, status, corsHeaders, extra) {
  return new Response(JSON.stringify({ success: false, error: msg, ...(extra || {}) }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
