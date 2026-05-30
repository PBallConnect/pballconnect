// Cloudflare Pages Function — /api/organic-signup
// Stores, retrieves, and deletes organic signup pre-screen data (server-side fallback for iOS new-tab).
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function ok(body = { ok: true }) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

function err(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: CORS });
}

// GET /api/organic-signup?email=... — retrieve pre-screen data for a user
export async function onRequestGet(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  if (!email) return err('Missing email.');

  const svcHdrs = {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };

  try {
    const r = await fetch(
      `${env.SUPABASE_URL}/rest/v1/organic_signups?email=eq.${encodeURIComponent(email)}&select=skill_level,playing_since,age_range&limit=1`,
      { headers: svcHdrs }
    );
    const rows = await r.json();
    if (!Array.isArray(rows) || !rows.length) return err('Not found.', 404);
    return ok(rows[0]);
  } catch (_) {
    return err('Lookup failed.', 500);
  }
}

// POST /api/organic-signup
//   Upsert: { email, skill_level, playing_since, age_range }
//   Delete: { email, delete: true }
export async function onRequestPost(context) {
  const { env, request } = context;
  let body;
  try { body = await request.json(); } catch (_) { return err('Invalid request body.'); }

  const { email } = body || {};
  if (!email) return err('Missing email.');

  const svcHdrs = {
    'Content-Type': 'application/json',
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };

  if (body.delete === true) {
    try {
      await fetch(
        `${env.SUPABASE_URL}/rest/v1/organic_signups?email=eq.${encodeURIComponent(email)}`,
        { method: 'DELETE', headers: svcHdrs }
      );
      return ok();
    } catch (_) {
      return err('Delete failed.', 500);
    }
  }

  const { skill_level, playing_since, age_range } = body;
  if (!skill_level || !playing_since || !age_range) return err('Missing required fields.');

  try {
    const r = await fetch(
      `${env.SUPABASE_URL}/rest/v1/organic_signups`,
      {
        method: 'POST',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal,resolution=merge-duplicates' },
        body: JSON.stringify({
          email,
          skill_level,
          playing_since,
          age_range,
          created_at: new Date().toISOString(),
        }),
      }
    );
    if (!r.ok) {
      const text = await r.text();
      throw new Error(text);
    }
    return ok();
  } catch (e) {
    return err(e.message || 'Upsert failed.', 500);
  }
}

// DELETE /api/organic-signup?email=... — alternative HTTP DELETE method
export async function onRequestDelete(context) {
  const { env, request } = context;
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  if (!email) return err('Missing email.');

  const svcHdrs = {
    'apikey': env.SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
  };

  try {
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/organic_signups?email=eq.${encodeURIComponent(email)}`,
      { method: 'DELETE', headers: svcHdrs }
    );
    return ok();
  } catch (_) {
    return err('Delete failed.', 500);
  }
}
