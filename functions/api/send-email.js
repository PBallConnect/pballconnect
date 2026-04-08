// Cloudflare Pages Function — /api/send-email
export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await context.request.json();
    const { to_email, from_name, subject, personal_note, invite_url, site_url, type } = body;

    if (!to_email || !to_email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Invalid email address' }), {
        status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    const RESEND_API_KEY = context.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'Email service not configured' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    // Debug: show first/last 4 chars of key so we can verify it's correct
    const keyPreview = RESEND_API_KEY.substring(0,7)+'...'+RESEND_API_KEY.slice(-4);

    const emailSubject = subject || (
      type === 'match_invite'  ? '🎾 You\'ve been invited to a PBallConnect match!' :
      type === 'match_update'  ? '🎾 Your PBallConnect match has been updated' :
      type === 'match_decline' ? '🎾 A player declined your match invite' :
      type === 'ic_invite'     ? '🎾 Someone wants to join your Inner Circle!' :
      type === 'app_invite'    ? '🎾 You\'ve been invited to PBallConnect!' :
      '🎾 PBallConnect Notification'
    );

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:40px 20px;background:#0a120b;font-family:Arial,sans-serif;">
  <div style="max-width:520px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:32px;">🏓</div>
      <div style="color:#4CAF7D;font-size:22px;font-weight:800;">PBall<span style="color:#fff;">Connect</span></div>
      <div style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:999px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:#fbbf24;font-size:10px;font-weight:800;">BETA</div>
    </div>
    <div style="background:#0f1f12;border:1px solid rgba(76,175,125,0.25);border-radius:16px;padding:28px 24px;">
      <p style="color:rgba(255,255,255,0.85);font-size:15px;line-height:1.7;margin:0 0 24px;">${personal_note || ''}</p>
      ${invite_url ? `<div style="text-align:center;margin-bottom:24px;">
        <a href="${invite_url}" style="display:inline-block;padding:14px 32px;background:#4CAF7D;color:#0a120b;font-size:15px;font-weight:800;text-decoration:none;border-radius:12px;">
          Open in PBallConnect →
        </a>
      </div>` : ''}
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 20px;"/>
      <p style="color:rgba(255,255,255,0.35);font-size:11px;text-align:center;margin:0;">
        <a href="${site_url || 'https://pballconnect.com'}" style="color:#4CAF7D;text-decoration:none;">pballconnect.com</a> · Beta v0.1
      </p>
    </div>
  </div>
</body>
</html>`;

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'PBallConnect <noreply@pballconnect.com>',
        to: [to_email],
        subject: emailSubject,
        html: html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(JSON.stringify({ 
        error: resendData.message || 'Send failed',
        resend_status: resendRes.status,
        key_preview: keyPreview
      }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}
