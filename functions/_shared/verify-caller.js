// functions/_shared/verify-caller.js
// First server-side caller-identity verification in this codebase (Mission
// Critical item #1). Resolves the Authorization header on an incoming
// request to a verified email by asking Supabase's own /auth/v1/user
// endpoint, rather than trusting anything the client claims about itself.
//
// Confirmed via live testing against this project's real Supabase instance:
// a 200 response means the token is currently valid right now (signature,
// claims, and expiry already fully checked server-side by GoTrue) and its
// body has `email` at the TOP LEVEL, not nested under a `user` object. Any
// non-200 (401 missing-authorization, 403 malformed/expired/missing-claim,
// etc.) means invalid, full stop. The HTTP status alone is authoritative —
// do NOT decode the JWT or re-check `exp` here; that duplicates verification
// GoTrue already does correctly and risks getting clock-skew/leeway wrong.

export async function verifyCaller(env, request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  try {
    const res = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: {
        'Authorization': authHeader,
        'apikey': env.SUPABASE_ANON_KEY,
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.email || null;
  } catch (_) {
    // Fail closed — a network error talking to Supabase is never "verified".
    return null;
  }
}
