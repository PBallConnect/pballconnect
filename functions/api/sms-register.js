// Cloudflare Pages Function — /api/sms-register
// Handles streamlined SMS-invite registration: validates token, creates Supabase auth user
// (no email sent), saves registration row, auto-approves IC connection, returns sign-in URL.
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
      const key = `sms-register:${ip}`;
      const count = parseInt(await context.env.RATE_LIMIT_KV.get(key) || '0', 10);
      if (count >= 10) {
        return err('Too many requests. Please try again later.', 429, corsHeaders);
      }
      await context.env.RATE_LIMIT_KV.put(key, String(count + 1), { expirationTtl: 3600 });
    } catch (_) {}
  }

  // ── 2. PARSE + VALIDATE ───────────────────────────────────────────────────
  let body;
  try { body = await context.request.json(); }
  catch (_) { return err('Invalid request body.', 400, corsHeaders); }

  const { token, firstName, lastName, skill, email, gender, phone, sms_opt_in, sms_opt_in_at, zip } = body || {};

  if (!token || typeof token !== 'string') return err('Invalid invite token.', 400, corsHeaders);
  if (!firstName || !firstName.trim()) return err('First name is required.', 400, corsHeaders);
  if (!lastName  || !lastName.trim())  return err('Last name is required.',  400, corsHeaders);

  const emailLower = (email || '').trim().toLowerCase();
  if (!emailLower || !emailLower.includes('@') || !emailLower.includes('.')) {
    return err('Please enter a valid email address.', 400, corsHeaders);
  }

  const SUPABASE_URL       = context.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = context.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return err('Service configuration error.', 500, corsHeaders);
  }

  const svcHdrs = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_SERVICE_KEY,
    'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
  };

  // ── 3. VALIDATE INVITE TOKEN ──────────────────────────────────────────────
  let inv;
  try {
    const invRes = await fetch(
      `${SUPABASE_URL}/rest/v1/invites?invite_token=eq.${encodeURIComponent(token)}&select=invite_token,is_used,inviter_email,inviter_name,invite_type&limit=1`,
      { headers: svcHdrs }
    );
    const invRows = await invRes.json();
    if (!invRows?.length) return err('Invalid invite link.', 404, corsHeaders);
    inv = invRows[0];
    if (inv.is_used) return err('This invite has already been used. Please ask your contact to send a new invite.', 409, corsHeaders);
  } catch (_) {
    return err('Could not validate invite. Please try again.', 500, corsHeaders);
  }

  const firstNameClean = firstName.trim();
  const lastNameClean  = lastName.trim();
  const fullName       = `${firstNameClean} ${lastNameClean}`.trim();
  const skillClean     = typeof skill === 'string' && skill ? skill : '4.0';
  const genderClean    = typeof gender === 'string' && gender ? gender : null;
  const phoneClean     = typeof phone === 'string' ? phone.replace(/\D/g, '').slice(-10) : '';
  const smsOptIn       = sms_opt_in === true;

  // ── 4. CREATE AUTH USER + GENERATE SIGN-IN LINK ───────────────────────────
  // Admin generate_link creates the auth user (no email sent) and returns a
  // one-time magic link the browser can follow to establish a session.
  let signInUrl;
  try {
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: svcHdrs,
      body: JSON.stringify({
        type: 'magiclink',
        email: emailLower,
        options: { redirect_to: 'https://pballconnect.com/?sms_welcome=1' },
      }),
    });
    const linkData = await linkRes.json();
    // action_link may be at root or nested under properties
    signInUrl = linkData?.action_link || linkData?.properties?.action_link;
    if (!signInUrl) throw new Error(JSON.stringify(linkData));
  } catch (e) {
    return err('Could not create your account. Please try again.', 500, corsHeaders);
  }

  // ── 5. UPSERT REGISTRATIONS ROW ───────────────────────────────────────────
  try {
    const chkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(emailLower)}&select=id&limit=1`,
      { headers: svcHdrs }
    );
    const chkRows = await chkRes.json();
    const isUpdate = Array.isArray(chkRows) && chkRows.length > 0;

    const regPayload = {
      email:             emailLower,
      first_name:        firstNameClean,
      last_name:         lastNameClean,
      skill_level:       skillClean,
      waiver_agreed:     true,
      match_gender_pref: 'Both',
      play_format:       'Both',
      profile_complete:  false,
      gender:            genderClean,
      ...(phoneClean.length === 10 ? { phone: phoneClean } : {}),
      sms_opt_in:        smsOptIn,
      ...(smsOptIn && sms_opt_in_at ? { sms_opt_in_at: sms_opt_in_at } : {}),
    };

    await fetch(
      isUpdate
        ? `${SUPABASE_URL}/rest/v1/registrations?email=eq.${encodeURIComponent(emailLower)}`
        : `${SUPABASE_URL}/rest/v1/registrations`,
      {
        method: isUpdate ? 'PATCH' : 'POST',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify(regPayload),
      }
    );
  } catch (_) {
    // Registration save failed — still return signInUrl so user isn't stuck; they can complete profile later
  }

  // ── 5a. ADMIN REGISTRATION ALERT ─────────────────────────────────────────
  try {
    const RESEND_API_KEY = context.env.RESEND_API_KEY;
    if (RESEND_API_KEY) {
      const alertHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;color:#111;"><h2 style="color:#1a7a3a;margin-bottom:16px;">New PBallConnect Registration</h2><table style="border-collapse:collapse;"><tr><td style="padding:4px 16px 4px 0;font-weight:700;">Name</td><td>${firstNameClean} ${lastNameClean}</td></tr><tr><td style="padding:4px 16px 4px 0;font-weight:700;">Email</td><td>${emailLower}</td></tr><tr><td style="padding:4px 16px 4px 0;font-weight:700;">Path</td><td>SMS Invite Registration</td></tr><tr><td style="padding:4px 16px 4px 0;font-weight:700;">Skill Level</td><td>${skillClean}</td></tr><tr><td style="padding:4px 16px 4px 0;font-weight:700;">Zip</td><td>${zip || '—'}</td></tr><tr><td style="padding:4px 16px 4px 0;font-weight:700;">Gender</td><td>${genderClean || '—'}</td></tr><tr><td style="padding:4px 16px 4px 0;font-weight:700;">SMS Opt-In</td><td>${smsOptIn ? 'Yes' : 'No'}</td></tr><tr><td style="padding:4px 16px 4px 0;font-weight:700;">Registered At</td><td>${new Date().toISOString()}</td></tr></table></body></html>`;
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from:    'PBallConnect <noreply@pballconnect.com>',
          to:      ['david@pballconnect.com'],
          subject: `🎾 New PBallConnect Registration — ${firstNameClean} ${lastNameClean}`,
          html:    alertHtml,
        }),
      });
    }
  } catch (_) {}

  // ── 6. MARK INVITE AS USED ────────────────────────────────────────────────
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/invites?invite_token=eq.${encodeURIComponent(token)}`,
      {
        method: 'PATCH',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ is_used: true, status: 'registered' }),
      }
    );
  } catch (_) {}

  // ── 7. AUTO-APPROVE IC CONNECTION ────────────────────────────────────────
  // The organizer's text invite created a pending connection with
  // recipient_email = 'pending_TOKEN'. Patch it to the real email + approve.
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/connections?recipient_email=eq.${encodeURIComponent('pending_' + token)}`,
      {
        method: 'PATCH',
        headers: { ...svcHdrs, 'Prefer': 'return=minimal' },
        body: JSON.stringify({ recipient_email: emailLower, status: 'approved' }),
      }
    );
  } catch (_) {}

  // Create reciprocal connection (new user → organizer) as approved
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/connections`, {
      method: 'POST',
      headers: { ...svcHdrs, 'Prefer': 'return=minimal,resolution=ignore-duplicates' },
      body: JSON.stringify({
        requester_email: emailLower,
        requester_name:  fullName,
        recipient_email: inv.inviter_email,
        recipient_name:  inv.inviter_name || '',
        status:          'approved',
      }),
    });
  } catch (_) {}

  // ── 8. SUCCESS ────────────────────────────────────────────────────────────
  return new Response(JSON.stringify({ ok: true, signInUrl }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function err(msg, status, corsHeaders) {
  return new Response(JSON.stringify({ error: msg }), {
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
