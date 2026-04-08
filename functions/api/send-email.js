export async function onRequestPost(context) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  const RESEND_API_KEY = context.env.RESEND_API_KEY;
  
  // Pure debug — show us exactly what we have
  return new Response(JSON.stringify({
    key_exists: !!RESEND_API_KEY,
    key_length: RESEND_API_KEY ? RESEND_API_KEY.length : 0,
    key_preview: RESEND_API_KEY ? RESEND_API_KEY.substring(0,10)+'...' : 'NOT FOUND',
    key_starts_with_re: RESEND_API_KEY ? RESEND_API_KEY.startsWith('re_') : false,
    env_keys: Object.keys(context.env || {}),
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...corsHeaders }
  });
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
