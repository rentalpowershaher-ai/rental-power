'use client';
import React, { useState } from 'react';
import { DEPARTMENTS } from '@/lib/depts';
import { unlockAudio } from '@/lib/sound';
import { Logo } from './ui';

// أسماء مختصرة محلية (لا تعتمد على lib/depts.ts)
const SHORT: Record<string, string> = {
  general: 'المدير', finance: 'الماليات', marketing: 'التسويق', purchasing: 'المشتريات',
  warehouse: 'المخزن', maintenance: 'الصيانة', equipment: 'المعدات', hr: 'المواقع',
};
const labelOf = (id: string) => (id === 'warehouse' ? 'المخزن' : id === 'hr' ? 'مواقع العمل' : DEPARTMENTS.find((d) => d.id === id)?.name ?? id);

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'];

export default function LoginScreen({ supabase, onDone }: any) {
  const [dept, setDept] = useState('');
  const [pin, setPin] = useState('');
  const [err, setErr] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (code: string) => {
    setBusy(true);
    // الرقم الرباعي يتحول لكلمة سر أطول (Supabase يطلب 6 حروف على الأقل)
    const { error } = await supabase.auth.signInWithPassword({ email: `${dept}@rentalpower.app`, password: `RP@${code}!` });
    setBusy(false);
    if (error) {
      setErr(true);
      (navigator as any).vibrate?.([120, 60, 120]);
      setTimeout(() => { setErr(false); setPin(''); }, 600);
      return;
    }
    onDone();
  };

  const press = (k: string) => {
    unlockAudio();
    (navigator as any).vibrate?.(8);
    if (busy || err) return;
    if (k === '⌫') return setPin(pin.slice(0, -1));
    if (!k || !dept || pin.length >= 4) return;
    const n = pin + k;
    setPin(n);
    if (n.length === 4) submit(n);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-b from-white via-emerald-50 to-brand-light relative overflow-hidden flex flex-col items-center px-5 pb-6"
      style={{ paddingTop: 'max(2.5rem, env(safe-area-inset-top))' }}
    >
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-brand/15 blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-bolt/10 blur-3xl" />

      {/* Logo مع حلقة متحركة */}
      <div className="relative w-36 h-36 mb-3">
        <div className="absolute inset-0 rounded-full spin-ring" />
        <div className="absolute inset-[5px] rounded-full bg-white" />
        <Logo className="absolute inset-[9px] w-[calc(100%-18px)] h-[calc(100%-18px)] bolt-glow" />
      </div>
      <h1 className="text-slate-900 font-black text-xl">رينتال باور</h1>
      <p className="text-brand-dark text-[10px] font-bold tracking-[0.25em] mb-4">MOBILE ENERGY SOLUTION</p>

      {/* الأقسام */}
      <div className="w-full max-w-xs grid grid-cols-4 gap-1.5 mb-4 relative">
        {DEPARTMENTS.map((d) => (
          <button
            key={d.id}
            onClick={() => { setDept(d.id); setPin(''); }}
            className={`py-2 rounded-xl text-center transition active:scale-95 ${
              dept === d.id
                ? 'bg-brand text-white shadow-lg shadow-brand/30'
                : 'bg-white text-slate-500 border border-slate-200 shadow-sm'
            }`}
          >
            <div className="text-lg leading-none">{d.id === 'hr' ? '📍' : d.icon}</div>
            <div className="text-[9px] font-bold mt-1 leading-tight px-0.5">{SHORT[d.id] ?? d.name}</div>
          </button>
        ))}
      </div>

      <p className="text-slate-500 text-[11px] mb-2 h-4 relative">
        {dept ? `أدخل رمز ${labelOf(dept)}` : 'اختر قسمك أولاً'}
      </p>

      {/* نقاط الرمز */}
      <div className={`flex gap-3 mb-4 relative ${err ? 'shake' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`w-3.5 h-3.5 rounded-full border-2 transition ${
              err ? 'bg-bolt border-bolt' : i < pin.length ? 'bg-brand border-brand scale-110' : 'border-slate-300 bg-white'
            }`}
          />
        ))}
      </div>

      {/* لوحة الأرقام */}
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[17rem] relative" dir="ltr">
        {KEYS.map((k, i) => (
          <button
            key={i}
            onClick={() => press(k)}
            disabled={!k}
            className={`h-12 rounded-2xl text-lg font-bold transition active:scale-90 active:bg-brand active:text-white ${
              k ? 'bg-white text-slate-800 border border-slate-200 shadow-sm' : 'invisible'
            } ${!dept ? 'opacity-50' : ''}`}
          >
            {k}
          </button>
        ))}
      </div>
      {busy && <p className="text-brand-dark text-xs font-bold mt-3 animate-pulse">جاري الدخول...</p>}
    </div>
  );
}