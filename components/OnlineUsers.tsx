'use client';
import React, { useEffect, useRef, useState } from 'react';

const Dot = ({ on }: { on: boolean }) =>
  on ? (
    <span className="relative flex h-2.5 w-2.5 shrink-0">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
    </span>
  ) : (
    <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-slate-300" />
  );

// زر "المتصلون الآن" في الهيدر: يظهر في كل الأقسام ويعرض كل قسم متصل بنقطة خضراء
export default function OnlineUsers({ online, depts, me, nameOf }: any) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // إغلاق القائمة عند الضغط خارجها (الهيدر عنده backdrop-blur فمش هينفع overlay ثابت)
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  const rows = depts
    .map((d: any) => ({ ...d, n: online[d.id] || 0 }))
    .sort((a: any, b: any) => (b.n > 0 ? 1 : 0) - (a.n > 0 ? 1 : 0));
  const count = rows.filter((r: any) => r.n > 0).length;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-label="المتصلون الآن"
        className="h-10 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black flex items-center gap-1.5"
      >
        <Dot on />
        <span>{count}</span>
      </button>
      {open && (
        <>
          <div className="absolute left-0 mt-2 w-64 max-w-[85vw] bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50 overflow-hidden">
            <div className="p-3 border-b font-bold text-sm flex items-center justify-between">
              <span>المتصلون الآن</span>
              <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5">{count} من {rows.length}</span>
            </div>
            {rows.map((r: any) => (
              <div key={r.id} className="flex items-center justify-between gap-2 px-3 py-2.5 border-b last:border-0">
                <span className="flex items-center gap-2 min-w-0 text-sm font-bold">
                  <span>{r.icon}</span>
                  <span className="truncate">{nameOf(r.id)}</span>
                  {r.id === me && <span className="text-[10px] font-black text-brand-dark bg-brand-light rounded px-1.5 py-0.5">أنت</span>}
                </span>
                <span className={`flex items-center gap-1.5 text-[11px] shrink-0 ${r.n > 0 ? 'font-black text-emerald-700' : 'font-bold text-slate-400'}`}>
                  <Dot on={r.n > 0} />
                  {r.n > 0 ? (r.n > 1 ? `متصل (${r.n} أجهزة)` : 'متصل') : 'غير متصل'}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}