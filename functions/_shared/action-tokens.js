// functions/_shared/action-tokens.js
// Shared opaque-token helpers backing the action_tokens table. Replaces the
// long, plaintext, HMAC-signed URL pattern used by match-invite and
// waitlist-promo links (that format was confirmed to get corrupted in
// transit over real SMS delivery). A token is a short random ID that
// resolves server-side to its payload — nothing meaningful travels in the URL.

// Generates a random ~12-char URL-safe token (9 random bytes -> 12 base64url
// chars, no padding needed) and stores it with its payload + expiry. Throws
// if the insert fails so callers never hand out a token that was never stored.
export async function createActionToken(env, linkType, payload, ttlMs) {
  const bytes = new Uint8Array(9);
  crypto.getRandomValues(bytes);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const token = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  const expiry = new Date(Date.now() + ttlMs).toISOString();

  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/action_tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': env.SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      token,
      link_type: linkType,
      payload,
      expiry,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`createActionToken insert failed: ${res.status} ${text}`);
  }

  return token;
}

// Looks up a token, returning null if it doesn't exist, its link_type doesn't
// match expectedType, or it has expired. Otherwise returns the full row
// (including payload) so callers never trust anything from the client.
export async function resolveActionToken(env, token, expectedType) {
  const res = await fetch(
    `${env.SUPABASE_URL}/rest/v1/action_tokens?token=eq.${encodeURIComponent(token)}&limit=1`,
    {
      headers: {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      },
    }
  );
  if (!res.ok) return null;

  const rows = await res.json();
  if (!Array.isArray(rows) || !rows.length) return null;

  const row = rows[0];
  if (row.link_type !== expectedType) return null;
  if (!row.expiry || Date.now() > new Date(row.expiry).getTime()) return null;

  return row;
}

// Best-effort observability marker only — links remain reusable/re-visitable
// until expiry, so this never gates or blocks a second successful response.
export async function markActionTokenUsed(env, token) {
  try {
    await fetch(
      `${env.SUPABASE_URL}/rest/v1/action_tokens?token=eq.${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': env.SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ used_at: new Date().toISOString() }),
      }
    );
  } catch (_) {
    // Observability only — never throw.
  }
}
