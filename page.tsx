'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { DEPARTMENTS, deptOf } from '@/lib/depts';
import { unlockAudio } from '@/lib/sound';
import { useNotifications } from '@/hooks/useNotifications';
import NotificationBell from '@/components/NotificationBell';
import OnlineUsers from '@/components/OnlineUsers';
import { usePresence } from '@/hooks/usePresence';
import LoginScreen from '@/components/LoginScreen';
import { Logo, setWorkshops, WORKSHOP_DEFAULTS } from '@/components/ui';
import GeneralView from '@/components/views/GeneralView';
import FinanceView from '@/components/views/FinanceView';
import MarketingView from '@/components/views/MarketingView';
import PurchasingView from '@/components/views/PurchasingView';
import WarehouseView from '@/components/views/WarehouseView';
import MaintenanceView from '@/components/views/MaintenanceView';
import EquipmentView from '@/components/views/EquipmentView';
import SitesView from '@/components/views/SitesView';

// قسم الموارد البشرية (hr) بقى «مواقع العمل» — نفس الكود ونفس الباسورد، بس الاسم والأيقونة متغيّرين
const OVERRIDE: Record<string, { name?: string; icon?: string }> = { hr: { name: 'مواقع العمل', icon: '📍' } };
const DEPTS = DEPARTMENTS.map((d: any) => ({ ...d, ...(OVERRIDE[d.id] || {}) }));
const deptInfo = (id: string | null) => DEPTS.find((d: any) => d.id === id) ?? deptOf(id);

// اسم القسم للعرض (المخزن بدل إدارة المخزن)
const nameOf = (id: string | null) => (id === 'warehouse' ? 'المخزن' : deptInfo(id)?.name);

const EMPTY = { equipments: [], inventory: [], employees: [], purchaseReqs: [], repairReqs: [], oilLogs: [], scrap: [], spareReqs: [], rentalReqs: [], equipmentReqs: [], sites: [], workshops: [] } as any;

export default function RentalPowerApp() {
  const supabase = useMemo(() => createClient(), []);
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [dept, setDept] = useState<string | null>(null);
  const [view, setView] = useState<string | null>(null);
  const [data, setData] = useState<any>(EMPTY);

  const notif = useNotifications(supabase, dept, user?.id ?? null);
  const online = usePresence(supabase, dept); // مين متصل الآن

  const loadSession = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setUser(null); setDept(null); setReady(true); return; }
    const { data: p } = await supabase.from('profiles').select('dept').eq('user_id', user.id).maybeSingle();
    setUser(user);
    setDept(p?.dept ?? null);
    setReady(true);
  }, [supabase]);

  useEffect(() => {
    loadSession();
    const { data: sub } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_OUT') { setUser(null); setDept(null); setView(null); }
    });
    const unlock = () => unlockAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    return () => sub.subscription.unsubscribe();
  }, [supabase, loadSession]);

  const fetchData = useCallback(async () => {
    const q = (t: string) => supabase.from(t).select('*').order('created_at', { ascending: false });
    const [eq, inv, emp, pr, rr, ol, sc, sp, rt, er, ws, wu] = await Promise.all([
      q('equipment'), q('inventory'), q('employees'), q('purchase_requests'), q('repair_requests'), q('oil_changes'), q('scrap_items'), q('spare_requests'), q('rental_requests'), q('equipment_requests'), q('work_sites'), q('workshop_units'),
    ]);
    // أقسام الورشة: لو الجدول لسه مش موجود نستخدم الأسماء الافتراضية
    const wsRows = (wu.data ?? []).slice().sort((a: any, b: any) => String(a.code).localeCompare(String(b.code)));
    setWorkshops(wsRows);
    setData({
      equipments: eq.data ?? [], inventory: inv.data ?? [], employees: emp.data ?? [],
      purchaseReqs: pr.data ?? [], repairReqs: rr.data ?? [], oilLogs: ol.data ?? [], scrap: sc.data ?? [],
      spareReqs: sp.data ?? [], rentalReqs: rt.data ?? [], equipmentReqs: er.data ?? [], sites: ws.data ?? [], workshops: wsRows.length ? wsRows : WORKSHOP_DEFAULTS,
    });
  }, [supabase]);

  // تحميل البيانات + تحديث فوري عند أي تغيير + عند العودة للتطبيق
  useEffect(() => {
    if (!dept) return;
    fetchData();
    let t: any;
    const refresh = () => { clearTimeout(t); t = setTimeout(fetchData, 300); };
    const ch = supabase.channel('data-changes');
    ['equipment', 'inventory', 'employees', 'purchase_requests', 'repair_requests', 'oil_changes', 'scrap_items', 'spare_requests', 'rental_requests', 'equipment_requests', 'work_sites', 'workshop_units']
      .forEach((table) => ch.on('postgres_changes', { event: '*', schema: 'public', table }, refresh));
    ch.subscribe();
    const vis = () => document.visibilityState === 'visible' && fetchData();
    document.addEventListener('visibilitychange', vis);
    return () => { clearTimeout(t); supabase.removeChannel(ch); document.removeEventListener('visibilitychange', vis); };
  }, [dept, supabase, fetchData]);

  // يعمل مع أي نسخة من useNotifications (الجديدة فيها dismissToast، القديمة لا)
  const dismissToast = () => {
    const n: any = notif;
    if (n.dismissToast) n.dismissToast();
    else notif.setToast(null);
  };

  const logout = async () => {
    await notif.unsubscribeDevice();
    await supabase.auth.signOut();
    setUser(null); setDept(null); setView(null); setData(EMPTY);
  };

  if (!ready) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-brand-light flex items-center justify-center">
        <Logo className="w-28 h-28 animate-pulse" />
      </div>
    );
  }
  if (!user) return <LoginScreen supabase={supabase} onDone={loadSession} />;
  if (!dept) {
    return (
      <div className="min-h-screen bg-white text-slate-700 flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p>هذا الحساب غير مرتبط بأي قسم. راجع إعداد جدول profiles.</p>
        <button onClick={logout} className="px-4 py-2 bg-slate-100 rounded-xl">تسجيل الخروج</button>
      </div>
    );
  }

  const { equipments, inventory, employees, purchaseReqs, repairReqs, oilLogs, scrap, spareReqs, rentalReqs, equipmentReqs } = data;
  const allowed = dept === 'general' ? DEPTS : DEPTS.filter((d: any) => d.id === dept);

  const pending = (id: string) => {
    switch (id) {
      case 'warehouse':
        return purchaseReqs.filter((r: any) => r.status === 'معلق_المخزن' || r.status === 'مقبول').length +
          scrap.filter((s: any) => s.status === 'معلق_المخزن').length +
          spareReqs.filter((s: any) => s.status === 'معلق_المخزن').length;
      case 'purchasing':
        return spareReqs.filter((s: any) => s.status === 'محوّل_للمشتريات').length +
          repairReqs.filter((r: any) => r.status === 'معلق_المشتريات').length;
      case 'finance':
        return purchaseReqs.filter((r: any) => r.status === 'معلق_المالية').length +
          repairReqs.filter((r: any) => r.status === 'معلق_المالية').length +
          rentalReqs.filter((r: any) => r.status === 'معلق_المالية').length;
      case 'maintenance':
        return equipments.filter((e: any) => e.status === 'في المخزن للصيانة').length +
          equipmentReqs.filter((x: any) => x.status === 'معلق_الصيانة').length;
      case 'marketing':
        return equipments.filter((e: any) => e.status === 'جاهز للعمل').length;
      default:
        return 0;
    }
  };

  const common = { supabase, onUpdate: fetchData, dept };

  const SUB: Record<string, string> = {
    general: 'نظرة شاملة وإحصائيات',
    finance: 'اعتماد الطلبات والمصروفات',
    marketing: 'المعدات الجاهزة وطلب معدة من الصيانة',
    purchasing: 'طلبات الشراء والمتابعة',
    warehouse: 'المخزون والخردة والطلبات',
    maintenance: 'الزيت والإصلاح وقطع الغيار',
    equipment: 'سجل المعدات وحالتها',
    hr: 'المواقع والمعدات والمشغلين',
  };
  const nReady = equipments.filter((e: any) => e.status === 'جاهز للعمل').length;
  const nRent = equipments.filter((e: any) => e.status === 'مؤجر').length;
  const nLow = inventory.filter((i: any) => i.quantity <= i.min_alert).length;
  const hr = new Date().getHours();
  const greet = hr < 12 ? 'صباح الخير ☀️' : hr < 18 ? 'مساء النور 🌤️' : 'مساء الخير 🌙';
  const today = new Date().toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm px-3 py-2" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <button onClick={() => setView(null)} className="flex items-center gap-3">
            <Logo className="w-9 h-9" />
            <div className="text-right">
              <h1 className="font-extrabold text-base text-slate-900 leading-tight">رينتال باور</h1>
              <p className="text-[11px] text-brand font-semibold">{nameOf(dept)}</p>
            </div>
          </button>
          <div className="flex items-center gap-2">
            {view && (
              <button onClick={() => setView(null)} className="px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl">
                الرئيسية
              </button>
            )}
            <NotificationBell items={notif.items} unread={notif.unread} markSeen={notif.markSeen} />
            <button onClick={logout} className="px-3 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-rose-100 hover:text-rose-700 rounded-xl">خروج</button>
            <OnlineUsers online={online} depts={DEPTS} me={dept} nameOf={nameOf} />
          </div>
        </div>
      </header>

      {/* In-app toast */}
      {notif.toast && (
        <div className="fixed top-3 inset-x-3 z-50 flex justify-center pointer-events-none">
          <div className={`toast-in pointer-events-auto max-w-md w-full rounded-2xl p-4 shadow-2xl ${(notif.toast as any).urgent ? 'bg-bolt text-white animate-pulse' : 'bg-white text-slate-800 border border-slate-200 border-r-4 border-r-bolt'}`} onClick={dismissToast}>
            <p className="font-black text-sm">{notif.toast.title}</p>
            <p className={`text-xs mt-1 ${(notif.toast as any).urgent ? 'text-white/90' : 'text-slate-500'}`}>{notif.toast.body}</p>
            {(notif.toast as any).urgent && <p className="text-[10px] mt-2 font-bold text-white/80">اضغط لإيقاف الصوت</p>}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-3 pt-3 space-y-3">
        {/* Push banner */}
        {notif.needsInstall && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
            📲 على الآيفون: افتح الموقع في Safari ثم اضغط مشاركة ← <b>إضافة إلى الشاشة الرئيسية</b>، وافتح التطبيق من الأيقونة لتصلك الإشعارات.
          </div>
        )}
        {!notif.needsInstall && notif.perm === 'default' && (
          <div className="p-3 rounded-2xl bg-brand-light border border-brand/30 flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-brand-dark">🔔 فعّل الإشعارات لتصلك التنبيهات بالصوت حتى والتطبيق مقفول</p>
            <button onClick={notif.enablePush} className="px-4 py-2 bg-brand text-white text-sm font-black rounded-xl whitespace-nowrap">تفعيل</button>
          </div>
        )}
        {notif.perm === 'denied' && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
            الإشعارات محظورة لهذا الموقع. فعّلها من إعدادات المتصفح أو إعدادات التطبيق ثم أعد فتحه.
          </div>
        )}
        {notif.perm === 'unsupported' && !notif.needsInstall && (
          <div className="p-3 rounded-2xl bg-slate-100 text-xs text-slate-600">هذا المتصفح لا يدعم الإشعارات الخارجية. استخدم Chrome على أندرويد أو Safari (بعد الإضافة للشاشة الرئيسية) على الآيفون.</div>
        )}

        {!view ? (
          <div>
            {/* Hero */}
            <div className="rounded-3xl bg-gradient-to-br from-brand via-emerald-500 to-teal-500 text-white p-4 shadow-xl shadow-brand/25 mb-4 relative overflow-hidden rise">
              <div className="absolute -left-12 -top-12 w-52 h-52 rounded-full border-[20px] border-white/10" />
              <div className="absolute -right-8 -bottom-16 w-44 h-44 rounded-full bg-white/10 blur-2xl" />
              <div className="relative flex items-center gap-4">
                <Logo className="w-20 h-20 shrink-0 bolt-glow ring-4 ring-white/30" />
                <div className="text-right min-w-0">
                  <p className="text-white/80 text-[10px] font-bold tracking-[0.25em] mb-1">MOBILE ENERGY SOLUTION</p>
                  <h2 className="text-lg font-black leading-tight">{greet}</h2>
                  <p className="text-white/90 text-xs mt-1">{today}</p>
                  <p className="text-white/80 text-xs mt-0.5">{dept === 'general' ? 'اختر القسم الذي تريد متابعته' : `قسم ${nameOf(dept)}`}</p>
                </div>
              </div>
              <div className="relative grid grid-cols-3 gap-2 mt-4">
                {[
                  { n: nReady, l: 'معدة جاهزة', i: '✅' },
                  { n: nRent, l: 'معدة مؤجرة', i: '🚛' },
                  { n: nLow, l: 'صنف شارف على النفاد', i: '⚠️' },
                ].map((x) => (
                  <div key={x.l} className="rounded-2xl bg-white/15 backdrop-blur px-2 py-2 text-center border border-white/20">
                    <p className="text-xl font-black leading-none">{x.n}</p>
                    <p className="text-[10px] font-bold mt-1 text-white/90 leading-tight">{x.i} {x.l}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className={`grid gap-3 ${allowed.length > 1 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 max-w-xs mx-auto'}`}>
              {allowed.map((d: any, idx: number) => {
                const n = pending(d.id);
                return (
                  <button
                    key={d.id}
                    onClick={() => setView(d.id)}
                    style={{ animationDelay: `${idx * 60}ms` }}
                    className="group relative overflow-hidden bg-white rounded-3xl p-4 border border-slate-200/80 shadow-sm active:scale-95 hover:shadow-xl hover:-translate-y-0.5 transition text-right rise"
                  >
                    <div className={`absolute -left-6 -top-6 w-24 h-24 rounded-full bg-gradient-to-br ${d.color} opacity-10 group-hover:opacity-20 transition`} />
                    {n > 0 && d.id !== 'marketing' && (
                      <span className="absolute top-3 left-3 min-w-[24px] h-6 px-1.5 rounded-full bg-bolt text-white text-xs font-black flex items-center justify-center shadow-lg shadow-bolt/40 animate-pulse">{n}</span>
                    )}
                    <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${d.color} flex items-center justify-center text-2xl mb-3 shadow-lg text-white`}>
                      {d.icon}
                      {online[d.id] > 0 && (
                        <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5" title="متصل الآن">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white" />
                        </span>
                      )}
                    </div>
                    <h3 className="relative font-black text-slate-800 text-[14px] group-hover:text-brand transition">{nameOf(d.id)}</h3>
                    <p className="relative text-[11px] text-slate-400 font-semibold mt-0.5 leading-snug">{SUB[d.id]}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm rise">
            <div className="flex items-center gap-3 pb-3 mb-4 border-b border-slate-100">
              <span className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${deptInfo(view)?.color} flex items-center justify-center text-2xl text-white shadow-lg`}>{deptInfo(view)?.icon}</span>
              <div>
                <h2 className="text-lg font-black text-slate-800 leading-tight">{nameOf(view)}</h2>
                <p className="text-[11px] text-slate-400 font-semibold">{SUB[view]}</p>
              </div>
            </div>

            {view === 'general' && <GeneralView {...data} />}
            {view === 'finance' && <FinanceView {...data} {...common} />}
            {view === 'marketing' && <MarketingView {...data} {...common} />}
            {view === 'purchasing' && <PurchasingView {...data} {...common} dept={dept} />}
            {view === 'warehouse' && <WarehouseView {...data} {...common} dept={dept} />}
            {view === 'maintenance' && <MaintenanceView {...data} {...common} />}
            {view === 'equipment' && <EquipmentView {...data} {...common} />}
            {view === 'hr' && <SitesView {...data} {...common} />}
          </div>
        )}
      </main>
    </div>
  );
}