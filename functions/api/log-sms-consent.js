// Cloudflare Pages Function — /api/log-sms-consent
// Records an SMS consent event to sms_consent_log.
// Called by client-side code after opt-in/opt-out actions.
export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  let body;
  try { body = await context.request.json(); }
  catch (_) { return res({ error: 'Invalid request body.' }, 400, corsHeaders); }

  const { player_email, event, method } = body || {};

  if (!player_email || !player_email.includes('@')) {
    return res({ error: 'player_email is required.' }, 400, corsHeaders);
  }
  if (event !== 'opt_in' && event !== 'opt_out') {
    return res({ error: 'event must be opt_in or opt_out.' }, 400, corsHeaders);
  }
  const VALID_METHODS = ['registration', 'checkbox', 'STOP', 'START', 'profile_save', 'sms_registration'];
  if (!VALID_METHODS.includes(method)) {
    return res({ error: 'Invalid method.' }, 400, corsHeaders);
  }

  const SUPABASE_URL        = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res({ error: 'Service configuration error.' }, 500, corsHeaders);
  }

  try {
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/sms_consent_log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        player_email: player_email.trim().toLowerCase(),
        event,
        method,
        created_at:   new Date().toISOString(),
      }),
    });
    if (!dbRes.ok) {
      const text = await dbRes.text();
      console.warn('sms_consent_log insert failed:', dbRes.status, text);
      return res({ error: 'DB insert failed.' }, 500, corsHeaders);
    }
    return res({ ok: true }, 200, corsHeaders);
  } catch (e) {
    console.warn('sms_consent_log error:', e);
    return res({ error: 'Unexpected error.' }, 500, corsHeaders);
  }
}

function res(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
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
