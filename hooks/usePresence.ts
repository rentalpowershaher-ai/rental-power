'use client';
import { useEffect, useState } from 'react';

// يرجّع { [dept]: عدد الأجهزة المتصلة } لحظياً عبر Supabase Realtime Presence.
// القسم يُحسب متصلاً طالما التطبيق مفتوح وظاهر على الشاشة (لو الشاشة اتقفلت أو التطبيق راح للخلفية يظهر غير متصل).
export function usePresence(supabase: any, dept: string | null) {
  const [online, setOnline] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!dept) return;
    const key = `${dept}:${Math.random().toString(36).slice(2, 10)}`; // مفتاح لكل جهاز
    const ch = supabase.channel('presence-online', { config: { presence: { key } } });
    let subscribed = false;
    let tracked = false;

    const sync = () => {
      const state = ch.presenceState();
      const m: Record<string, number> = {};
      Object.values(state).forEach((metas: any) => {
        const d = metas?.[0]?.dept;
        if (d) m[d] = (m[d] || 0) + 1;
      });
      setOnline(m);
    };
    const track = async () => {
      if (!subscribed || tracked) return;
      tracked = true;
      await ch.track({ dept, at: Date.now() });
    };
    const untrack = async () => {
      if (!subscribed || !tracked) return;
      tracked = false;
      await ch.untrack();
    };
    const vis = () => (document.visibilityState === 'visible' ? track() : untrack());

    ch.on('presence', { event: 'sync' }, sync);
    ch.subscribe((status: string) => {
      if (status === 'SUBSCRIBED') {
        subscribed = true;
        if (document.visibilityState === 'visible') track();
      }
    });
    document.addEventListener('visibilitychange', vis);

    return () => {
      document.removeEventListener('visibilitychange', vis);
      supabase.removeChannel(ch);
    };
  }, [supabase, dept]);

  return online;
}