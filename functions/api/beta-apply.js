// Cloudflare Pages Function — /api/beta-apply
//
// Required env vars:
//   SUPABASE_URL, SUPABASE_SERVICE_KEY — DB insert
//   RESEND_API_KEY                     — admin email notifications
//   TURNSTILE_SECRET_KEY               — Turnstile verification (skipped if placeholder)
//   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER — SMS (all optional)
//   FOUNDER_PHONE                      — founder's number in E.164 or 10-digit format
//   RATE_LIMIT_KV                      — KV namespace binding (optional)

export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const { env } = context;
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';

  // ── 1. RATE LIMITING ─────────────────────────────────────────────────────
  if (env.RATE_LIMIT_KV) {
    try {
      const key = `beta_apply:${ip}`;
      const existing = await env.RATE_LIMIT_KV.get(key);
      const count = existing ? parseInt(existing, 10) : 0;
      if (count >= 3) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
          status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      await env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 3600 });
    } catch (_) {
      // KV unavailable — skip rate limiting gracefully
    }
  }

  // ── 2. PARSE + VALIDATE ───────────────────────────────────────────────────
  let body;
  try {
    body = await context.request.json();
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const {
    first_name, email, city, state,
    skill_level, playing_since, age_range,
    heard_from, wants_beta, wants_video_call, calendly_shown,
    turnstileToken,
  } = body || {};

  const emailTrimmed = (email || '').trim().toLowerCase();
  if (!emailTrimmed || !emailTrimmed.includes('@') || !emailTrimmed.includes('.')) {
    return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (!first_name || typeof first_name !== 'string' || !first_name.trim()) {
    return new Response(JSON.stringify({ error: 'First name is required.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (!city || typeof city !== 'string' || !city.trim()) {
    return new Response(JSON.stringify({ error: 'City is required.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (!state || typeof state !== 'string' || !state.trim()) {
    return new Response(JSON.stringify({ error: 'State is required.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (!heard_from || typeof heard_from !== 'string' || !heard_from.trim()) {
    return new Response(JSON.stringify({ error: 'Please let us know how you heard about us.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (typeof wants_beta !== 'boolean') {
    return new Response(JSON.stringify({ error: 'Please answer the beta tester question.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (!turnstileToken) {
    return new Response(JSON.stringify({ error: 'Please complete the security check.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ── 3. TURNSTILE VERIFICATION ─────────────────────────────────────────────
  const TURNSTILE_SECRET = env.TURNSTILE_SECRET_KEY || '';
  const turnstileConfigured = TURNSTILE_SECRET &&
    TURNSTILE_SECRET !== 'placeholder' &&
    !TURNSTILE_SECRET.startsWith('TURNSTILE_');

  if (turnstileConfigured) {
    try {
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          secret: TURNSTILE_SECRET,
          response: turnstileToken,
          remoteip: ip,
        }),
      });
      const verifyData = await verifyRes.json();
      if (!verifyData.success) {
        return new Response(JSON.stringify({ error: 'Security check failed. Please try again.' }), {
          status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
    } catch (_) {
      // Turnstile network error — fail open to avoid blocking legitimate users
    }
  }

  // ── 4. VALIDATE SUPABASE CONFIG ───────────────────────────────────────────
  const SUPABASE_URL = env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Service configuration error.' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // Sanitized values used in DB row and email
  const nameSafe   = first_name.trim();
  const citySafe   = city.trim();
  const stateSafe  = state.trim();
  const heardSafe  = heard_from.trim();
  const skillSafe  = skill_level  || null;
  const sinceSafe  = playing_since || null;
  const ageSafe    = age_range    || null;
  const videoCall  = wants_beta ? (typeof wants_video_call === 'boolean' ? wants_video_call : null) : null;
  const calendly   = wants_beta ? (calendly_shown === true) : false;
  const statusVal  = wants_beta ? 'pending' : 'waitlist';

  // ── 5. SAVE TO SUPABASE ───────────────────────────────────────────────────
  try {
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/beta_applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        email:            emailTrimmed,
        first_name:       nameSafe,
        city:             citySafe,
        state:            stateSafe,
        heard_from:       heardSafe,
        skill_level:      skillSafe,
        playing_since:    sinceSafe,
        age_range:        ageSafe,
        wants_beta:       wants_beta,
        wants_video_call: videoCall,
        calendly_shown:   calendly,
        status:           statusVal,
      }),
    });

    if (!dbRes.ok && dbRes.status !== 409) {
      // 409 = duplicate email, treated as success. All other errors logged.
      console.error('[beta-apply] DB insert failed', dbRes.status);
    }
  } catch (e) {
    console.error('[beta-apply] DB insert exception', e.message);
  }

  // ── 6. ADMIN EMAIL NOTIFICATIONS ─────────────────────────────────────────
  const RESEND_API_KEY = env.RESEND_API_KEY;
  const ts = new Date().toUTCString();

  const adminSubject = '🎾 New Beta Application — ' +
    nameSafe + ' from ' + citySafe + ', ' + stateSafe;

  const adminHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px 24px;">
          <div style="text-align:center;margin-bottom:20px;">
            <span style="font-size:24px;font-weight:800;color:#1a7a3a;font-family:Arial,sans-serif;">PBall</span><span style="font-size:24px;font-weight:800;color:#111;font-family:Arial,sans-serif;">Connect</span>
            &nbsp;<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#f3f4f6;color:#9ca3af;font-size:9px;font-weight:700;letter-spacing:.08em;vertical-align:middle;">BETA</span>
          </div>
          <p style="color:#111;font-size:18px;font-weight:800;margin:0 0 20px;">🎾 New Beta Application</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;color:#374151;">
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;width:150px;vertical-align:top;">Name</td>
              <td style="padding:9px 0;font-weight:700;">${nameSafe}</td>
            </tr>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">Email</td>
              <td style="padding:9px 0;">${emailTrimmed}</td>
            </tr>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">City</td>
              <td style="padding:9px 0;">${citySafe}</td>
            </tr>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">State</td>
              <td style="padding:9px 0;">${stateSafe}</td>
            </tr>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">Skill Level</td>
              <td style="padding:9px 0;">${skillSafe || '&mdash;'}</td>
            </tr>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">Playing Since</td>
              <td style="padding:9px 0;">${sinceSafe || '&mdash;'}</td>
            </tr>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">Age Range</td>
              <td style="padding:9px 0;">${ageSafe || '&mdash;'}</td>
            </tr>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">Heard from</td>
              <td style="padding:9px 0;">${heardSafe}</td>
            </tr>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">Wants beta</td>
              <td style="padding:9px 0;font-weight:700;color:${wants_beta ? '#1a7a3a' : '#6b7280'};">${wants_beta ? 'Yes' : 'No'}</td>
            </tr>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">Wants video call</td>
              <td style="padding:9px 0;">${videoCall === true ? 'Yes' : videoCall === false ? 'No' : 'N/A'}</td>
            </tr>
            <tr style="border-bottom:1px solid #f3f4f6;">
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">Calendly shown</td>
              <td style="padding:9px 0;">${calendly ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td style="padding:9px 0;color:#6b7280;vertical-align:top;">Submitted</td>
              <td style="padding:9px 0;font-size:12px;">${ts}</td>
            </tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  async function sendAdminEmail(toAddress) {
    if (!RESEND_API_KEY) return;
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PBallConnect <noreply@pballconnect.com>',
        to: [toAddress],
        subject: adminSubject,
        html: adminHtml,
      }),
    });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('[beta-apply] email failed to', toAddress, '-', errData.message || res.status);
    }
  }

  try { await sendAdminEmail('zorro@pballconnect.com'); } catch (_) {}
  try { await sendAdminEmail('dippa777@gmail.com'); } catch (_) {}

  // ── 7. FOUNDER SMS NOTIFICATION ───────────────────────────────────────────
  // Best-effort — never blocks the response (Rule 38)
  try {
    const TWILIO_SID    = env.TWILIO_ACCOUNT_SID  || '';
    const TWILIO_TOKEN  = env.TWILIO_AUTH_TOKEN   || '';
    const TWILIO_FROM   = env.TWILIO_PHONE_NUMBER || '';
    const FOUNDER_PHONE = env.FOUNDER_PHONE       || '';

    if (TWILIO_SID && TWILIO_TOKEN && TWILIO_FROM && FOUNDER_PHONE) {
      const digits = FOUNDER_PHONE.replace(/\D/g, '');
      const toE164 = digits.length === 10 ? `+1${digits}` : FOUNDER_PHONE;

      const smsBody = 'PBallConnect: New beta app - ' + nameSafe + ', ' + citySafe + ' ' + stateSafe +
        ' | beta: ' + (wants_beta ? 'Y' : 'N') +
        (wants_beta ? ' | call: ' + (videoCall === true ? 'Y' : 'N') : '') +
        ' | ' + emailTrimmed;

      await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(TWILIO_SID + ':' + TWILIO_TOKEN)}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: toE164, From: TWILIO_FROM, Body: smsBody }).toString(),
        }
      );
    }
  } catch (_) {
    // SMS is always best-effort — never blocks the response
  }

  // ── 8. SUCCESS ────────────────────────────────────────────────────────────
  return new Response(JSON.stringify({ ok: true }), {
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
