// Cloudflare Pages Function — /api/beta-application
export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';

  // ── 1. RATE LIMITING ─────────────────────────────────────────────────────
  if (context.env.RATE_LIMIT_KV) {
    try {
      const key = `beta_app:${ip}`;
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
    email, first_name, city, state, how_heard,
    skill_level, playing_since, age_range,
    is_beta_tester, willing_video_call, turnstileToken,
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
  if (!how_heard || typeof how_heard !== 'string' || !how_heard.trim()) {
    return new Response(JSON.stringify({ error: 'Please let us know how you heard about us.' }), {
      status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
  if (typeof is_beta_tester !== 'boolean') {
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

  const row = {
    email:              emailTrimmed,
    first_name:         first_name.trim(),
    city:               city.trim(),
    state:              state.trim(),
    how_heard:          how_heard.trim(),
    skill_level:        skill_level || null,
    playing_since:      playing_since || null,
    age_range:          age_range || null,
    is_beta_tester:     is_beta_tester,
    willing_video_call: is_beta_tester ? (willing_video_call ?? null) : null,
    status:             is_beta_tester ? 'pending' : 'waitlist',
  };

  try {
    const dbRes = await fetch(`${SUPABASE_URL}/rest/v1/beta_applications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(row),
    });

    if (dbRes.status === 409) {
      // Duplicate email — treat as success silently, do not expose to user
    } else if (!dbRes.ok) {
      return new Response(JSON.stringify({ error: 'Could not save your application. Please try again.' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    }
  } catch (_) {
    return new Response(JSON.stringify({ error: 'Could not save your application. Please try again.' }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }

  // ── 5. SUCCESS ────────────────────────────────────────────────────────────
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
