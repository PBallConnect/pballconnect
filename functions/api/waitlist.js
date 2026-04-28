// Cloudflare Pages Function — /api/waitlist
export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';

  // ── 1. IP RATE LIMITING ──────────────────────────────────────────────────
  // Max 3 submissions per IP per hour. Skipped gracefully if KV not bound.
  if (context.env.RATE_LIMIT_KV) {
    try {
      const key = `waitlist:${ip}`;
      const existing = await context.env.RATE_LIMIT_KV.get(key);
      const count = existing ? parseInt(existing, 10) : 0;
      if (count >= 3) {
        return new Response(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
          status: 429, headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
      }
      await context.env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 3600 });
    } catch (_) {
      // KV unavailable — skip rate limiting gracefully
    }
  }

  // ── 2. PARSE + VALIDATE BODY ─────────────────────────────────────────────
  let body;
  try {
    body = await context.request.json();
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Invalid request body.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const { firstName, email, zip, turnstileToken } = body || {};

  if (!firstName || typeof firstName !== 'string' || !firstName.trim()) {
    return new Response(JSON.stringify({ error: 'First name is required.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const emailTrimmed = (email || '').trim().toLowerCase();
  if (!emailTrimmed || !emailTrimmed.includes('@') || !emailTrimmed.includes('.')) {
    return new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  const zipTrimmed = (zip || '').trim();
  if (!/^\d{5}$/.test(zipTrimmed)) {
    return new Response(JSON.stringify({ error: 'Please enter a valid 5-digit zip code.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  if (!turnstileToken) {
    return new Response(JSON.stringify({ error: 'Please complete the security check.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ── 3. TURNSTILE VERIFICATION ────────────────────────────────────────────
  // Skip if secret key is missing or still the placeholder value.
  const TURNSTILE_SECRET = context.env.TURNSTILE_SECRET_KEY || '';
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

  // ── 4. SAVE TO SUPABASE ───────────────────────────────────────────────────
  const SUPABASE_URL = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return new Response(JSON.stringify({ error: 'Service configuration error.' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  try {
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        first_name: firstName.trim(),
        email: emailTrimmed,
        zip_code: zipTrimmed,
      }),
    });

    if (dbRes.status === 409) {
      // Duplicate email — treat as success silently, do not expose to user
    } else if (!dbRes.ok) {
      return new Response(JSON.stringify({ error: 'Could not save your request. Please try again.' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Could not save your request. Please try again.' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ── 5. SEND CONFIRMATION EMAIL ───────────────────────────────────────────
  // Wrapped in try/catch — email failure does not fail the whole request.
  const RESEND_API_KEY = context.env.RESEND_API_KEY;
  if (RESEND_API_KEY) {
    try {
      const firstNameSafe = firstName.trim().replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const zipSafe = zipTrimmed.replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const confirmHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px 28px;">
          <div style="text-align:center;margin-bottom:6px;">
            <span style="font-size:26px;font-weight:800;color:#16a34a;font-family:Arial,sans-serif;">PBall</span><span style="font-size:26px;font-weight:800;color:#111;font-family:Arial,sans-serif;">Connect</span>
          </div>
          <p style="text-align:center;color:#9ca3af;font-style:italic;font-size:13px;margin:0 0 24px;">For the Love of Pickleball</p>
          <p style="color:#111;font-size:20px;font-weight:800;text-align:center;margin:0 0 16px;line-height:1.3;">You're on the list, ${firstNameSafe}! 🏓</p>
          <p style="color:#374151;font-size:14px;line-height:1.7;text-align:center;margin:0 0 16px;">
            We'll reach out as soon as players near zip code <strong>${zipSafe}</strong> are connecting on PBallConnect. We're growing fast — expect to hear from us soon!
          </p>
          <p style="color:#374151;font-size:14px;line-height:1.7;text-align:center;margin:0 0 24px;">
            In the meantime, spread the word to your pickleball crew. The more players in your area, the sooner we launch near you.
          </p>
          <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;"/>
          <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;line-height:1.6;">
            You received this because you signed up at pballconnect.com. Questions? Reply to this email.<br/>
            <a href="https://pballconnect.com" style="color:#16a34a;text-decoration:none;">pballconnect.com</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'PBallConnect <hello@pballconnect.com>',
          to: [emailTrimmed],
          subject: `You're on the PBallConnect waitlist! 🏓`,
          html: confirmHtml,
        }),
      });
    } catch (_) {
      // Email failure — log silently, do not fail the request
    }
  }

  // ── 6. SUCCESS ────────────────────────────────────────────────────────────
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
