// Cloudflare Pages Function — /api/match-invite-sms-data
// Server-side lookup of phone and sms_opt_in for a player.
// Uses SUPABASE_SERVICE_KEY so these sensitive fields never pass through
// public_profiles or the client data model.
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

  const { playerEmail } = body || {};
  if (!playerEmail || !playerEmail.includes('@'))
    return err('playerEmail is required.', 400, corsHeaders);

  // ── 2. LOAD ENV ───────────────────────────────────────────────────────────
  const SUPABASE_URL        = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY)
    return err('Service configuration error.', 500, corsHeaders);

  // ── 3. QUERY REGISTRATIONS ────────────────────────────────────────────────
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(playerEmail)}&select=phone,sms_opt_in&limit=1`,
      {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
      }
    );
    const rows = await res.json();
    if (!Array.isArray(rows) || !rows.length) {
      return new Response(JSON.stringify({ phone: null, sms_opt_in: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
    const { phone, sms_opt_in } = rows[0];
    return new Response(JSON.stringify({ phone: phone || null, sms_opt_in: !!sms_opt_in }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (_) {
    // DB error — return safe defaults so the caller skips gracefully
    return new Response(JSON.stringify({ phone: null, sms_opt_in: false }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
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
