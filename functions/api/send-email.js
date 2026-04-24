// Cloudflare Pages Function — /api/send-email
export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await context.request.json();
    const { to_email, subject, personal_note, invite_url, site_url, type, inviter_name, invitee_name, match_date_str } = body;

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

    // Build dynamic match_invite subject: "[FirstName] invited you to play pickleball on [Day], [Month] [Date]"
    let matchInviteSubject = '🎾 You\'ve been invited to play pickleball!';
    if (type === 'match_invite') {
      const firstName = (inviter_name || '').split(' ')[0] || 'Someone';
      const datePart  = match_date_str || '';
      matchInviteSubject = datePart
        ? `${firstName} invited you to play pickleball on ${datePart}`
        : `${firstName} invited you to play pickleball!`;
    }

    const emailSubject = subject || (
      type === 'match_invite'  ? matchInviteSubject :
      type === 'match_update'  ? '🎾 Your PBallConnect match has been updated' :
      type === 'match_decline' ? '🎾 A player declined your match invite' :
      type === 'ic_invite'     ? `${(inviter_name||'Someone').split(' ')[0]} invited you to PBallConnect 🎾` :
      type === 'app_invite'    ? '🎾 You\'ve been invited to PBallConnect!' :
      '🎾 PBallConnect Notification'
    );

    const senderName = inviter_name || 'A fellow player';

    const recipientFirst = (invitee_name || '').split(' ')[0] || 'there';

    const innerCard = type === 'ic_invite' ? `
      <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px 28px;">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:6px;">
          <span style="font-size:26px;font-weight:800;color:#1a7a3a;font-family:Arial,sans-serif;">PBall</span><span style="font-size:26px;font-weight:800;color:#111;font-family:Arial,sans-serif;">Connect</span>
          &nbsp;<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#f3f4f6;color:#9ca3af;font-size:9px;font-weight:700;letter-spacing:.08em;vertical-align:middle;">BETA</span>
        </div>
        <p style="text-align:center;color:#9ca3af;font-style:italic;font-size:13px;margin:0 0 24px;">For the Love of Pickleball</p>
        <!-- Message -->
        <p style="color:#111;font-size:20px;font-weight:800;text-align:center;margin:0 0 16px;line-height:1.3;">${senderName} wants you to join their Inner Circle!</p>
        <p style="color:#374151;font-size:14px;line-height:1.7;text-align:center;margin:0 0 24px;">
          Hey ${recipientFirst}! ${senderName} invited you to PBallConnect — the free app for finding pickleball players near you. Set up your free player profile in 2 minutes and start connecting with players near you.
        </p>
        <!-- CTA button -->
        ${invite_url ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr><td align="center">
            <a href="${invite_url}" style="display:inline-block;width:100%;max-width:300px;padding:15px 24px;background:#1a7a3a;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;border-radius:10px;text-align:center;box-sizing:border-box;">
              Join PBallConnect &rarr;
            </a>
          </td></tr>
        </table>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0 0 24px;">No password needed &mdash; we use secure magic links.</p>` : ''}
        <!-- Sign-off -->
        <p style="color:#374151;font-size:13px;text-align:center;margin:0 0 20px;line-height:1.6;">See you on the court! 🏓<br/><span style="color:#6b7280;">— The PBallConnect Team</span></p>
        <!-- Footer -->
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;"/>
        <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;line-height:1.6;">
          You received this because ${senderName} invited you. If this was a mistake, simply ignore this email.<br/>
          <a href="${site_url || 'https://pballconnect.com'}" style="color:#1a7a3a;text-decoration:none;">pballconnect.com</a>
        </p>
      </td></tr>
    ` : type === 'app_invite' ? `
      <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:16px;padding:32px 28px;">
        <!-- Header -->
        <div style="text-align:center;margin-bottom:6px;">
          <span style="font-size:26px;font-weight:800;color:#1a7a3a;font-family:Arial,sans-serif;">PBall</span><span style="font-size:26px;font-weight:800;color:#111;font-family:Arial,sans-serif;">Connect</span>
          &nbsp;<span style="display:inline-block;padding:2px 8px;border-radius:999px;background:#f3f4f6;color:#9ca3af;font-size:9px;font-weight:700;letter-spacing:.08em;vertical-align:middle;">BETA</span>
        </div>
        <p style="text-align:center;color:#9ca3af;font-style:italic;font-size:13px;margin:0 0 24px;">For the Love of Pickleball</p>
        <!-- Invite message -->
        <p style="color:#111;font-size:20px;font-weight:800;text-align:center;margin:0 0 20px;line-height:1.3;">${senderName} has invited you to join PBallConnect!</p>
        ${personal_note ? `
        <div style="background:#f0fdf4;border:1px solid #d1fae5;border-radius:10px;padding:14px 16px;margin-bottom:20px;">
          <p style="color:#1a5c32;font-style:italic;font-size:14px;line-height:1.6;margin:0;">&ldquo;${personal_note}&rdquo;</p>
        </div>` : ''}
        <!-- CTA button -->
        ${invite_url ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr><td align="center">
            <a href="${invite_url.replace('https://pballconnect.com/?invite=', 'https://pballconnect.com/invite.html?token=')}" style="display:inline-block;width:100%;max-width:300px;padding:15px 24px;background:#1a7a3a;color:#ffffff;font-size:15px;font-weight:800;text-decoration:none;border-radius:10px;text-align:center;box-sizing:border-box;">
              Open in PBallConnect &rarr;
            </a>
          </td></tr>
        </table>
        <p style="text-align:center;color:#9ca3af;font-size:12px;margin:0 0 24px;">No password needed &mdash; we use secure magic links.</p>` : ''}
        <!-- Footer -->
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;"/>
        <p style="color:#9ca3af;font-size:11px;text-align:center;margin:0;line-height:1.6;">
          You received this because ${senderName} invited you. If this was a mistake, simply ignore this email.<br/>
          <a href="${site_url || 'https://pballconnect.com'}" style="color:#1a7a3a;text-decoration:none;">pballconnect.com</a>
        </p>
      </td></tr>
    ` : `
      <tr><td style="background:#0f1f12;border:1px solid rgba(76,175,125,0.25);border-radius:16px;padding:28px 24px;">
        <p style="color:rgba(255,255,255,0.85);font-size:15px;line-height:1.7;margin:0 0 24px;">${personal_note || ''}</p>
        ${invite_url ? `
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding-bottom:24px;">
            <a href="${invite_url}" style="display:inline-block;padding:14px 32px;background:#4CAF7D;color:#0a120b;font-size:15px;font-weight:800;text-decoration:none;border-radius:12px;">
              Open in PBallConnect &rarr;
            </a>
          </td></tr>
        </table>` : ''}
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.08);margin:0 0 20px;"/>
        <p style="color:rgba(255,255,255,0.35);font-size:11px;text-align:center;margin:0;">
          <a href="${site_url || 'https://pballconnect.com'}" style="color:#4CAF7D;text-decoration:none;">pballconnect.com</a>
          &nbsp;&middot;&nbsp; Beta v0.1
        </p>
      </td></tr>
    `;

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0a120b;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a120b;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">
        ${(type !== 'app_invite' && type !== 'ic_invite') ? `
        <tr><td style="text-align:center;padding-bottom:24px;">
          <div style="font-size:32px;margin-bottom:8px;">🏓</div>
          <div style="color:#4CAF7D;font-size:22px;font-weight:800;">PBall<span style="color:#fff;">Connect</span></div>
          <div style="display:inline-block;margin-top:6px;padding:2px 10px;border-radius:999px;background:rgba(245,158,11,0.15);border:1px solid rgba(245,158,11,0.4);color:#fbbf24;font-size:10px;font-weight:800;letter-spacing:.1em;">BETA</div>
        </td></tr>` : ''}
        ${innerCard}
      </table>
    </td></tr>
  </table>
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
        name: resendData.name || '',
      }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  } catch(e) {
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
