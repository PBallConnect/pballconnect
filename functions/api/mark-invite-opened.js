// Cloudflare Pages Function — /api/mark-invite-opened
// Marks an invite link as opened (status:'opened', opened_at:now()) via the service
// role, so pre-auth visitors never need direct anon write access to the invites table.
// Best-effort, observability only — mirrors the original client-side fire-and-forget
// behavior (`.catch(()=>{})`) this replaces; a failure here never surfaces to the caller.

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

  const { invite_token } = body || {};
  if (!invite_token) return err('Missing invite_token.', 400, corsHeaders);

  // ── 2. LOAD ENV ───────────────────────────────────────────────────────────
  const SUPABASE_URL         = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  const svcHdrs = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // ── 3. VALIDATE TOKEN EXISTS ───────────────────────────────────────────────
  try {
    const checkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/invites?invite_token=eq.${encodeURIComponent(invite_token)}&select=invite_token&limit=1`,
      { headers: svcHdrs }
    );
    if (!checkRes.ok) {
      const text = await checkRes.text().catch(() => '');
      console.error('mark-invite-opened: token existence check failed', checkRes.status, text);
      return ok(corsHeaders);
    }
    const rows = await checkRes.json();
    if (!Array.isArray(rows) || !rows.length) {
      return ok(corsHeaders); // unknown token — silent no-op, same as prior fire-and-forget behavior
    }
  } catch (e) {
    console.error('mark-invite-opened: token existence check threw', e);
    return ok(corsHeaders);
  }

  // ── 4. PATCH STATUS ────────────────────────────────────────────────────────
  try {
    const patchRes = await fetch(
      `${SUPABASE_URL}/rest/v1/invites?invite_token=eq.${encodeURIComponent(invite_token)}`,
      {
        method: 'PATCH',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ status: 'opened', opened_at: new Date().toISOString() }),
      }
    );
    if (!patchRes.ok) {
      const text = await patchRes.text().catch(() => '');
      console.error('mark-invite-opened: status PATCH failed', patchRes.status, text);
    }
  } catch (e) {
    console.error('mark-invite-opened: status PATCH threw', e);
  }

  // ── 5. RESPOND (always success — best-effort, observability only) ─────────
  return ok(corsHeaders);
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

function ok(corsHeaders) {
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function err(msg, status, corsHeaders) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}
