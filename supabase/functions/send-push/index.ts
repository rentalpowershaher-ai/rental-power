// Supabase Edge Function: يستقبل Database Webhook (INSERT على notifications) ويرسل FCM لأجهزة القسم
// Secrets المطلوبة: FCM_SERVICE_ACCOUNT (محتوى JSON كامل)، PUSH_WEBHOOK_SECRET
import { createClient } from 'npm:@supabase/supabase-js@2';

const CHANNEL_ID = 'urgent_v1';
const sa = JSON.parse(Deno.env.get('FCM_SERVICE_ACCOUNT')!);

const b64url = (b: ArrayBuffer | string) => {
  const s = typeof b === 'string' ? btoa(b) : btoa(String.fromCharCode(...new Uint8Array(b)));
  return s.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${header}.${claim}`));
  const jwt = `${header}.${claim}.${b64url(sig)}`;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  });
  const j = await r.json();
  if (!j.access_token) throw new Error('token error: ' + JSON.stringify(j));
  return j.access_token;
}

Deno.serve(async (req) => {
  if (req.headers.get('x-webhook-secret') !== Deno.env.get('PUSH_WEBHOOK_SECRET')) {
    return new Response('unauthorized', { status: 401 });
  }
  const { record: rec } = await req.json();
  if (!rec?.dept) return Response.json({ ok: true, sent: 0 });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: tokens } = await admin.from('device_tokens').select('id, token').eq('dept', rec.dept);
  if (!tokens?.length) return Response.json({ ok: true, sent: 0 });

  const at = await accessToken();
  let sent = 0;

  await Promise.all(tokens.map(async (t: any) => {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: t.token,
          notification: { title: rec.title, body: rec.body ?? '' },
          data: { url: rec.url ?? '/', id: String(rec.id) },
          android: {
            priority: 'HIGH',
            ttl: '86400s',
            notification: { channel_id: CHANNEL_ID, sound: 'siren', default_vibrate_timings: true },
          },
        },
      }),
    });
    if (r.ok) { sent++; return; }
    const err = await r.text();
    if (r.status === 404 || err.includes('UNREGISTERED')) {
      await admin.from('device_tokens').delete().eq('id', t.id);
    } else {
      console.error('fcm error', r.status, err);
    }
  }));

  return Response.json({ ok: true, sent });
});