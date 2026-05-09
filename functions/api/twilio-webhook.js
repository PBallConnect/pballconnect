// Cloudflare Pages Function — /api/twilio-webhook
// Receives Twilio status webhooks for STOP / HELP / START keywords.
// Validates Twilio signature, syncs sms_opt_in in Supabase, logs to sms_log.
//
// SETUP: In Twilio Console → Phone Numbers → +1 978 945 3787 → Configure
// Set "A MESSAGE COMES IN" webhook to:
//   https://pballconnect.com/api/twilio-webhook
// Method: HTTP POST
// Required env vars (Cloudflare Pages → Settings → Environment variables):
//   TWILIO_AUTH_TOKEN   — from Twilio Console → Account Info
//   SUPABASE_URL        — your Supabase project URL
//   SUPABASE_SERVICE_KEY — service role key (bypasses RLS)

export async function onRequestPost(context) {
  const { env, request } = context;

  const TWILIO_AUTH_TOKEN  = env.TWILIO_AUTH_TOKEN  || '';
  const SUPABASE_URL       = env.SUPABASE_URL       || '';
  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || '';

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return twiml('', 500);
  }

  // ── 1. PARSE FORM BODY ────────────────────────────────────────────────────
  // Twilio sends application/x-www-form-urlencoded, not JSON.
  let bodyText;
  let params;
  try {
    bodyText = await request.text();
    params = Object.fromEntries(new URLSearchParams(bodyText));
  } catch (_) {
    return twiml('', 400);
  }

  // ── 2. VALIDATE TWILIO SIGNATURE ──────────────────────────────────────────
  // Skip validation only when auth token is missing/placeholder (dev mode).
  const skipValidation = !TWILIO_AUTH_TOKEN || TWILIO_AUTH_TOKEN.startsWith('TWILIO_');
  if (!skipValidation) {
    const signature = request.headers.get('X-Twilio-Signature') || '';
    const url = new URL(request.url).toString();
    const valid = await validateTwilioSignature(TWILIO_AUTH_TOKEN, url, params, signature);
    if (!valid) {
      return new Response('Forbidden', { status: 403 });
    }
  }

  // ── 3. EXTRACT + NORMALIZE PHONE ─────────────────────────────────────────
  const fromRaw    = params['From'] || '';
  const optOutType = (params['OptOutType'] || '').toUpperCase();

  // DB stores phone as 10-digit string (digits only, no country code).
  // Twilio sends E.164: +19789453787 → strip leading 1 → 9789453787
  const digits  = fromRaw.replace(/\D/g, '');
  const phone10 = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;

  if (!phone10 || phone10.length !== 10) {
    return twiml(''); // malformed From — ignore
  }

  const svcHdrs = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // ── 4. HANDLE OPT-OUT TYPES ───────────────────────────────────────────────

  if (optOutType === 'STOP') {
    // Twilio already blocks the number and sends its own reply — return empty
    // TwiML to prevent a duplicate auto-reply from us.
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/registrations?phone=eq.${encodeURIComponent(phone10)}`,
        {
          method: 'PATCH',
          headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ sms_opt_in: false }),
        }
      );
    } catch (_) {}

    try {
      const playerEmail = await lookupEmailByPhone(SUPABASE_URL, svcHdrs, phone10);
      await fetch(`${SUPABASE_URL}/rest/v1/sms_log`, {
        method: 'POST',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          player_email: playerEmail || null,
          event_type:   'stop_received',
          status:        'opted_out',
        }),
      });
    } catch (_) {}

    return twiml('');

  } else if (optOutType === 'HELP') {
    return twiml(
      '<Message>PBallConnect match notifications. Reply STOP to unsubscribe. Visit pballconnect.com for help.</Message>'
    );

  } else if (optOutType === 'START') {
    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/registrations?phone=eq.${encodeURIComponent(phone10)}`,
        {
          method: 'PATCH',
          headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ sms_opt_in: true }),
        }
      );
    } catch (_) {}

    try {
      const playerEmail = await lookupEmailByPhone(SUPABASE_URL, svcHdrs, phone10);
      await fetch(`${SUPABASE_URL}/rest/v1/sms_log`, {
        method: 'POST',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          player_email: playerEmail || null,
          event_type:   'start_received',
          status:        'opted_in',
        }),
      });
    } catch (_) {}

    return twiml(
      '<Message>Welcome back! You\'ll receive PBallConnect match notifications again. Reply STOP anytime to unsubscribe.</Message>'
    );

  } else {
    return twiml(''); // all other messages — ignore silently
  }
}

// ── HELPERS ───────────────────────────────────────────────────────────────────

function twiml(inner, status = 200) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${inner}</Response>`,
    { status, headers: { 'Content-Type': 'text/xml' } }
  );
}

async function lookupEmailByPhone(supabaseUrl, headers, phone10) {
  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/registrations?phone=eq.${encodeURIComponent(phone10)}&select=email&limit=1`,
      { headers }
    );
    const rows = res.ok ? await res.json() : [];
    return rows?.[0]?.email || null;
  } catch (_) {
    return null;
  }
}

// Twilio signature: HMAC-SHA1(authToken, url + sorted_param_key+value pairs)
// Uses Web Crypto API (available in Cloudflare Workers — no Node crypto needed).
async function validateTwilioSignature(authToken, url, params, signature) {
  try {
    const sortedKeys = Object.keys(params).sort();
    let str = url;
    for (const key of sortedKeys) {
      str += key + (params[key] || '');
    }

    const encoder  = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(authToken),
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const sigBytes  = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode(str));
    const computed  = btoa(String.fromCharCode(...new Uint8Array(sigBytes)));
    return computed === signature;
  } catch (_) {
    return false;
  }
}
