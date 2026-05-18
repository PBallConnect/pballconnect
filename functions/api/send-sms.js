// Cloudflare Pages Function — /api/send-sms
// Sends SMS notifications via Twilio. Internal use only — never called directly
// from the client. Always returns 200 so SMS failures never crash calling code.
//
// Required env vars (Cloudflare Pages → Settings → Environment variables):
//   TWILIO_ACCOUNT_SID   — from Twilio Console → Account Info
//   TWILIO_AUTH_TOKEN    — from Twilio Console → Account Info
//   TWILIO_PHONE_NUMBER  — E.164 format, e.g. +19789453787
//   SUPABASE_URL         — your Supabase project URL
//   SUPABASE_SERVICE_KEY — service role key (bypasses RLS)
//   RATE_LIMIT_KV        — KV namespace binding (same as send-email.js)

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const { env } = context;

  const TWILIO_ACCOUNT_SID  = env.TWILIO_ACCOUNT_SID  || '';
  const TWILIO_AUTH_TOKEN   = env.TWILIO_AUTH_TOKEN   || '';
  const TWILIO_PHONE_NUMBER = env.TWILIO_PHONE_NUMBER || '';
  const SUPABASE_URL        = env.SUPABASE_URL        || '';
  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY || '';

  // ── 1. VALIDATE REQUEST ───────────────────────────────────────────────────
  let body;
  try { body = await context.request.json(); }
  catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { player_email, message, match_id, event_type } = body || {};

  if (!player_email || !player_email.includes('@')) {
    return new Response(JSON.stringify({ error: 'player_email is required.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (!message || typeof message !== 'string' || !message.trim()) {
    return new Response(JSON.stringify({ error: 'message is required.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  // Always prepend brand prefix so recipients know who is texting them.
  const smsBody = message.startsWith('PBallConnect:')
    ? message
    : `PBallConnect: ${message}`;

  const svcHdrs = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // Helper: log a row to sms_log (never throws — wrapped internally).
  async function logSms(status, extra = {}) {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) return;
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/sms_log`, {
        method: 'POST',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({
          player_email: player_email || null,
          match_id:     match_id     || null,
          event_type:   event_type   || null,
          status,
          sent_at:      new Date().toISOString(),
          ...extra,
        }),
      });
    } catch (_) {}
  }

  try {
    // ── 2. CONSENT GATE ──────────────────────────────────────────────────────
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
      await logSms('failed');
      return ok(false, 'service_config_error', corsHeaders);
    }

    let playerPhone = null;
    try {
      const pRes = await fetch(
        `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(player_email)}&select=phone,sms_opt_in&limit=1`,
        { headers: svcHdrs }
      );
      const rows = pRes.ok ? await pRes.json() : [];
      if (!rows?.length) {
        await logSms('no_player');
        return ok(false, 'no_player', corsHeaders);
      }
      const player = rows[0];
      if (!player.sms_opt_in) {
        await logSms('not_opted_in');
        return ok(false, 'not_opted_in', corsHeaders);
      }
      if (!player.phone) {
        await logSms('no_phone');
        return ok(false, 'no_phone', corsHeaders);
      }
      playerPhone = player.phone;
    } catch (_) {
      await logSms('failed');
      return ok(false, 'lookup_error', corsHeaders);
    }

    // Normalize stored 10-digit phone to E.164 for Twilio.
    const digits10 = playerPhone.replace(/\D/g, '');
    if (digits10.length !== 10) {
      await logSms('no_phone');
      return ok(false, 'no_phone', corsHeaders);
    }
    const toE164 = `+1${digits10}`;

    // ── 3. RATE LIMITING ─────────────────────────────────────────────────────
    if (env.RATE_LIMIT_KV) {
      try {
        // Per-player: max 10 SMS per 24 hours
        const playerKey = `sms_player_${player_email}`;
        const playerCount = parseInt(await env.RATE_LIMIT_KV.get(playerKey) || '0', 10);
        if (playerCount >= 10) {
          await logSms('rate_limited_player');
          return new Response(JSON.stringify({ success: false, reason: 'rate_limited_player' }), {
            status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }

        // Per-match: max 20 SMS per match (7-day window covers all activity)
        if (match_id) {
          const matchKey = `sms_match_${match_id}`;
          const matchCount = parseInt(await env.RATE_LIMIT_KV.get(matchKey) || '0', 10);
          if (matchCount >= 20) {
            await logSms('rate_limited_match');
            return new Response(JSON.stringify({ success: false, reason: 'rate_limited_match' }), {
              status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
          }
        }

        // Global daily cap: max 500 per calendar day
        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        const globalKey = `sms_global_${today}`;
        const globalCount = parseInt(await env.RATE_LIMIT_KV.get(globalKey) || '0', 10);
        if (globalCount >= 500) {
          await logSms('rate_limited_global');
          return new Response(JSON.stringify({ success: false, reason: 'rate_limited_global' }), {
            status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });
        }
        if (globalCount > 400) {
          // Approaching cap — log warning but continue sending
          await logSms('rate_limit_warning');
        }

        // Increment all counters (fire-and-forget; failures are non-fatal)
        env.RATE_LIMIT_KV.put(playerKey, String(playerCount + 1), { expirationTtl: 86400 }).catch(() => {});
        if (match_id) {
          const matchKey = `sms_match_${match_id}`;
          const matchCount = parseInt(await env.RATE_LIMIT_KV.get(matchKey) || '0', 10);
          env.RATE_LIMIT_KV.put(matchKey, String(matchCount + 1), { expirationTtl: 604800 }).catch(() => {});
        }
        env.RATE_LIMIT_KV.put(globalKey, String(globalCount + 1), { expirationTtl: 86400 }).catch(() => {});

      } catch (_) {
        // KV unavailable — skip rate limiting gracefully
      }
    }

    // ── 4. SEND VIA TWILIO ────────────────────────────────────────────────────
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      await logSms('failed');
      return ok(false, 'twilio_not_configured', corsHeaders);
    }

    const twilioAuth = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`);
    const twilioUrl  = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const twilioParams = new URLSearchParams({
      To:   toE164,
      From: TWILIO_PHONE_NUMBER,
      Body: smsBody,
    });

    const twilioRes = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${twilioAuth}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: twilioParams.toString(),
    });

    // ── 5. LOG + RETURN ──────────────────────────────────────────────────────
    if (twilioRes.ok) {
      await logSms('sent');
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }

    // Twilio error — log error code but never expose phone in logs
    let twilioErrCode = null;
    try {
      const errData = await twilioRes.json();
      twilioErrCode = errData?.code || null;
    } catch (_) {}
    await logSms('failed', { error_code: twilioErrCode });
    return ok(false, 'twilio_error', corsHeaders);

  } catch (e) {
    // Unexpected error — catch-all so SMS never crashes the caller
    try { await logSms('failed'); } catch (_) {}
    return ok(false, 'unexpected_error', corsHeaders);
  }
}

function ok(success, reason, corsHeaders) {
  return new Response(JSON.stringify({ success, reason: reason || null }), {
    status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders },
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
