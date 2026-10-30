'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { playAlert, playSiren, unlockAudio } from '@/lib/sound';

type Perm = 'default' | 'granted' | 'denied' | 'unsupported';

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
// لازم يطابق الـ id المستخدم في الإرسال (channel_id) — لو غيّرت الصوت غيّر الرقم (urgent_v2)
const CHANNEL_ID = 'urgent_v1';

const isNative = () => typeof window !== 'undefined' && Capacitor.isNativePlatform();

function urlBase64ToUint8Array(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function useNotifications(supabase: any, dept: string | null, userId: string | null) {
  const [items, setItems] = useState<any[]>([]);
  const [seenAt, setSeenAt] = useState<number>(0);
  const [toast, setToast] = useState<any>(null);
  const [perm, setPerm] = useState<Perm>('default');
  const [needsInstall, setNeedsInstall] = useState(false);
  const toastTimer = useRef<any>(null);
  const nativeToken = useRef<string | null>(null);

  const seenKey = `rp_seen_${dept}`;

  // ---------- فحص الدعم ----------
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (isNative()) {
      PushNotifications.checkPermissions()
        .then((r) => setPerm(r.receive === 'granted' ? 'granted' : r.receive === 'denied' ? 'denied' : 'default'))
        .catch(() => setPerm('unsupported'));
      return;
    }

    const ua = navigator.userAgent;
    const isIOS = /iPhone|iPad|iPod/i.test(ua);
    const standalone = (window.navigator as any).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    if (isIOS && !standalone) {
      setNeedsInstall(true);
      setPerm('unsupported');
      return;
    }
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPerm('unsupported');
      return;
    }
    setPerm(Notification.permission as Perm);
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  useEffect(() => {
    if (!dept) return;
    try { setSeenAt(Number(localStorage.getItem(seenKey) || 0)); } catch {}
  }, [dept, seenKey]);

  // ---------- تحميل الإشعارات + استقبال لحظي (والتطبيق مفتوح) ----------
  useEffect(() => {
    if (!dept) { setItems([]); return; }
    let alive = true;

    supabase
      .from('notifications')
      .select('*')
      .eq('dept', dept)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }: any) => { if (alive) setItems(data ?? []); });

    const ch = supabase
      .channel(`notif-${dept}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `dept=eq.${dept}` }, (payload: any) => {
        const n = payload.new;
        setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 30)));
        setToast(n);
        // على الموبايل والتطبيق مفتوح: النظام مش بيعرض إشعار، فنشغّل الصفارة بنفسنا
        if (isNative()) playSiren(); else playAlert();
        clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 6000);
      })
      .subscribe();

    return () => { alive = false; clearTimeout(toastTimer.current); supabase.removeChannel(ch); };
  }, [supabase, dept]);

  const unread = items.filter((n) => new Date(n.created_at).getTime() > seenAt).length;

  const markSeen = useCallback(() => {
    const now = Date.now();
    setSeenAt(now);
    try { localStorage.setItem(seenKey, String(now)); } catch {}
  }, [seenKey]);

  // =====================================================
  //                    أندرويد (Capacitor + FCM)
  // =====================================================
  const registerNative = useCallback(async () => {
    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', async (t) => {
      nativeToken.current = t.value;
      if (!dept || !userId) return;
      await supabase.from('device_tokens').upsert(
        { token: t.value, dept, user_id: userId },
        { onConflict: 'token' }
      );
    });
    await PushNotifications.addListener('registrationError', (e) => console.error('push reg error', e));

    // لمس الإشعار يفتح التطبيق
    await PushNotifications.addListener('pushNotificationActionPerformed', () => {});

    // قناة بصوت الصفارة (مهمة جداً: صوت أندرويد 8+ يتحدد من القناة)
    await PushNotifications.createChannel({
      id: CHANNEL_ID,
      name: 'تنبيهات عاجلة',
      description: 'تنبيهات الطلبات بصوت صفارة',
      importance: 5,
      sound: 'siren.wav',
      vibration: true,
      visibility: 1,
      lights: true,
    });

    await PushNotifications.register();
  }, [supabase, dept, userId]);

  // لو الإذن ممنوح: سجّل الجهاز للقسم الحالي
  useEffect(() => {
    if (!isNative() || perm !== 'granted' || !dept || !userId) return;
    registerNative().catch(() => {});
  }, [perm, dept, userId, registerNative]);

  // =====================================================
  //                    المتصفح (Web Push)
  // =====================================================
  const saveSubscription = useCallback(async (sub: PushSubscription) => {
    if (!dept) return;
    const j: any = sub.toJSON();
    await supabase.from('push_subscriptions').delete().eq('endpoint', j.endpoint);
    await supabase.from('push_subscriptions').insert([{
      dept, user_id: userId, endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth,
    }]);
  }, [supabase, dept, userId]);

  const subscribeWeb = useCallback(async () => {
    const reg = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID),
      });
    }
    await saveSubscription(sub);
  }, [saveSubscription]);

  useEffect(() => {
    if (isNative()) return;
    if (perm === 'granted' && dept) subscribeWeb().catch(() => {});
  }, [perm, dept, subscribeWeb]);

  // ---------- زر التفعيل ----------
  const enablePush = useCallback(async () => {
    unlockAudio();
    try {
      if (isNative()) {
        const r = await PushNotifications.requestPermissions();
        setPerm(r.receive === 'granted' ? 'granted' : r.receive === 'denied' ? 'denied' : 'default');
        return;
      }
      const p = await Notification.requestPermission();
      setPerm(p as Perm);
      if (p === 'granted') await subscribeWeb();
    } catch {}
  }, [subscribeWeb]);

  // ---------- عند تسجيل الخروج ----------
  const unsubscribeDevice = useCallback(async () => {
    try {
      if (isNative()) {
        if (nativeToken.current) await supabase.from('device_tokens').delete().eq('token', nativeToken.current);
        await PushNotifications.removeAllListeners();
        return;
      }
      const reg = await navigator.serviceWorker.getRegistration('/sw.js');
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
    } catch {}
  }, [supabase]);

  return { items, unread, markSeen, toast, setToast, perm, needsInstall, enablePush, unsubscribeDevice };
}