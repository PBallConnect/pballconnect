// Cloudflare Pages Function — /api/resolve-invite
// Fixes the "link invite reciprocation silently fails" bug: handlePostRegistrationInvite()
// (app.js) needs to resolve an invite_token's inviter_email/inviter_name for
// invite_method:'link' invites, which never store invitee_email (there's no known
// recipient at link-creation time). The client previously fell back to querying the
// invites table directly under its own session JWT — but the July 25-26 RLS hardening's
// "Authenticated users can read invites" policy only allows a row to be read by its
// inviter_email or an already-matching invitee_email, so a brand-new invitee querying
// their own not-yet-linked invite got zero rows back, silently (no error), and the
// connection-approval, toast, and #inviteReciprocateOverlay all silently no-opped.
//
// This endpoint moves the lookup under SUPABASE_SERVICE_KEY (bypasses RLS entirely at
// the endpoint level — the table itself is left exactly as locked down as the RLS
// hardening left it). Deliberately does NOT require any pre-existing relationship
// between the caller and the invite row, unlike check-match-status.js's organizer-or-
// participant check — no such relationship can exist yet for this case, that's the
// whole gap being closed. The invite_token itself (a single-use, unguessable secret
// already known only to whoever received the invite) is the authorization proof, same
// trust model as the already-anon-readable invite_tokens view (which exposes
// inviter_name pre-auth for the exact same reason). verifyCaller() is still required
// so only a real authenticated session can call this — a cheap extra gate consistent
// with the rest of the codebase, not a relationship check.
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

  const { inviteToken } = body || {};
  if (!inviteToken) return err('inviteToken is required.', 400, corsHeaders);

  if (!context.env.SUPABASE_URL || !context.env.SUPABASE_SERVICE_KEY || !context.env.SUPABASE_ANON_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 2. AUTHORIZE — must be a real authenticated caller (no relationship check;
  // the invite_token itself is the proof for this specific invite) ───────────
  const callerEmail = await verifyCaller(context.env, context.request);
  if (!callerEmail) return err('Authentication required.', 401, corsHeaders);

  // ── 3. LOOK UP THE INVITE (service role — bypasses RLS entirely) ───────────
  let invite = null;
  try {
    const svcHdrs = {
      'Content-Type': 'application/json',
      'apikey': context.env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_KEY}`,
    };
    const res = await fetch(
      `${context.env.SUPABASE_URL}/rest/v1/invites?invite_token=eq.${encodeURIComponent(inviteToken)}&select=inviter_email,inviter_name&limit=1`,
      { headers: svcHdrs }
    );
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) invite = rows[0];
    } else {
      const text = await res.text();
      console.error('resolve-invite: lookup failed', res.status, text);
    }
  } catch (e) {
    console.error('resolve-invite: lookup threw', e);
  }

  // No row found — return a clean 404, don't distinguish "bad token" from
  // "table empty" or otherwise leak anything about the table's contents.
  if (!invite) return err('Invite not found.', 404, corsHeaders);

  // ── 4. RESPOND — only the two fields the client actually needs ─────────────
  return new Response(JSON.stringify({
    inviter_email: invite.inviter_email,
    inviter_name: invite.inviter_name,
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
