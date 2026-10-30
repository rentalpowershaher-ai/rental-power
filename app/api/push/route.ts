import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Supabase Database Webhook (INSERT على جدول notifications) يستدعي هذا المسار
export async function POST(req: NextRequest) {
  if (req.headers.get('x-webhook-secret') !== process.env.PUSH_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const rec = body.record;
  if (!rec?.dept) return NextResponse.json({ ok: true, sent: 0 });

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: subs } = await admin.from('push_subscriptions').select('*').eq('dept', rec.dept);
  const payload = JSON.stringify({ title: rec.title, body: rec.body, url: rec.url || '/', tag: rec.id, urgent: !!rec.urgent });

  let sent = 0;
  await Promise.all(
    (subs || []).map(async (s: any) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          payload,
          { urgency: 'high', TTL: 60 * 60 * 24 }
        );
        sent++;
      } catch (e: any) {
        if (e?.statusCode === 404 || e?.statusCode === 410) {
          await admin.from('push_subscriptions').delete().eq('id', s.id);
        }
      }
    })
  );

  return NextResponse.json({ ok: true, sent });
}