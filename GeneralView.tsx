'use client';
import React, { useState } from 'react';
import { eqName, WORKSHOP_DEFAULTS, Stat, Card, Section, Empty, Tag, Badge, Chips, ReqMeta, money } from '../ui';

function Bar({ label, value, max, color = 'bg-brand', right }: any) {
  const pct = max > 0 ? Math.max(3, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-slate-700 truncate">{label}</span>
        <span className="font-black text-slate-500 shrink-0 mr-2">{right ?? value}</span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function GeneralView({ inventory, equipments, repairReqs, purchaseReqs, scrap, spareReqs = [], rentalReqs = [], workshops = [] }: any) {
  const accepted = scrap.filter((s: any) => s.status === 'مقبول');
  const num = (v: any) => Number(v || 0);
  const newQty = inventory.reduce((a: number, i: any) => a + num(i.quantity), 0);
  const newVal = inventory.reduce((a: number, i: any) => a + num(i.quantity) * num(i.unit_price), 0);
  const scrapQty = accepted.reduce((a: number, i: any) => a + num(i.quantity), 0);
  const scrapVal = accepted.reduce((a: number, i: any) => a + num(i.quantity) * num(i.est_price), 0);
  const repairsCost = repairReqs.filter((r: any) => r.status === 'مقبول').reduce((a: number, r: any) => a + num(r.cost), 0);
  const low = inventory.filter((i: any) => i.quantity <= i.min_alert);
  const by = (s: string) => equipments.filter((e: any) => e.status === s).length;

  // ===== تكلفة أقسام الورشة: المصروف من المخزون الجديد + من الخردة + الإصلاحات المعتمدة − المرتجع =====
  const unitCost = (r: any) => (r.unit_cost != null ? num(r.unit_cost)
    : r.source === 'scrap' ? num(scrap.find((s: any) => s.id === r.scrap_id)?.est_price)
    : num(inventory.find((i: any) => i.id === r.inventory_id)?.unit_price));
  const worth = (rows: any[], src: string) => rows.filter((r: any) => (r.source || 'new') === src).reduce((a: number, r: any) => a + num(r.quantity) * unitCost(r), 0);
  const wsStats = (workshops.length ? workshops : WORKSHOP_DEFAULTS).map((w: any) => {
    const mine = spareReqs.filter((r: any) => r.equipment_code === w.code);
    const out = mine.filter((r: any) => r.kind === 'صرف' && r.status === 'تم_الصرف');
    const back = mine.filter((r: any) => r.kind === 'استرجاع' && r.status === 'تم_الاسترجاع');
    const newV = worth(out, 'new') - worth(back, 'new');
    const scrapV = worth(out, 'scrap') - worth(back, 'scrap');
    const repairs = repairReqs.filter((r: any) => r.equipment_code === w.code && r.status === 'مقبول').reduce((a: number, r: any) => a + num(r.cost), 0);
    return { ...w, newV, scrapV, repairs, total: newV + scrapV + repairs, count: mine.length };
  });
  const wsTotal = wsStats.reduce((a: number, w: any) => a + w.total, 0);
  const maxWs = Math.max(...wsStats.map((w: any) => w.total), 0);

  const catMap: Record<string, number> = {};
  inventory.forEach((i: any) => { const c = i.category || 'بدون فئة'; catMap[c] = (catMap[c] || 0) + num(i.quantity) * num(i.unit_price); });
  const cats = Object.entries(catMap).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxCat = cats[0]?.[1] || 0;

  const typeMap: Record<string, number> = {};
  equipments.forEach((e: any) => { const t = e.equip_type || 'غير محدد'; typeMap[t] = (typeMap[t] || 0) + 1; });
  const types = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

  const total = equipments.length || 1;
  const rent = by('مؤجر'), ready = by('جاهز للعمل'), shop = by('في المخزن للصيانة');

  const whPending = purchaseReqs.filter((r: any) => r.status === 'معلق_المخزن').length + spareReqs.filter((s: any) => s.status === 'معلق_المخزن').length;
  const finPending = purchaseReqs.filter((r: any) => r.status === 'معلق_المالية').length + repairReqs.filter((r: any) => r.status === 'معلق_المالية').length + rentalReqs.filter((r: any) => r.status === 'معلق_المالية').length;
  const scrapPending = scrap.filter((s: any) => s.status === 'معلق_المخزن').length;
  const repairAtPurchasing = repairReqs.filter((r: any) => r.status === 'معلق_المشتريات').length;

  // كل المعاملات المالية في مكان واحد (شراء + إصلاح + إيجار)
  const [txF, setTxF] = useState('all');
  const PEND = ['معلق_المخزن', 'معلق_المشتريات', 'معلق_المالية'];
  const OK = ['مقبول', 'تم_الاستلام'];
  const tx = [
    ...purchaseReqs.map((r: any) => ({ id: 'pr' + r.id, icon: '🛒', accent: 'bg-blue-500', kind: 'شراء', title: `${r.item_name} (${r.quantity})`, amount: num(r.total_price), status: r.status, no: r.req_no, date: r.created_at, reason: r.reject_reason })),
    ...repairReqs.map((r: any) => ({ id: 'rp' + r.id, icon: '🔧', accent: 'bg-amber-500', kind: 'إصلاح', title: `${r.part_name} — ${eqName(r.equipment_code)}`, amount: num(r.cost), status: r.status, no: r.req_no, date: r.created_at, reason: r.reject_reason })),
    ...rentalReqs.map((r: any) => ({ id: 'rt' + r.id, icon: '🚛', accent: 'bg-violet-500', kind: 'إيجار', title: `${r.equipment_name} (${r.equipment_code}) — ${r.location}`, amount: null, status: r.status, no: r.req_no, date: r.created_at, reason: r.reject_reason })),
  ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const txList = tx.filter((t: any) => txF === 'all' || (txF === 'pending' ? PEND.includes(t.status) : txF === 'ok' ? OK.includes(t.status) : t.status === 'مرفوض')).slice(0, 40);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat icon="📦" label="إجمالي القطع (جديد + خردة)" value={money(newQty + scrapQty)} sub={`جديد ${money(newQty)} • خردة ${money(scrapQty)}`} />
        <Stat icon="💰" label="إجمالي قيمة المخزون" value={`${money(newVal + scrapVal)} ج.م`} sub={`جديد ${money(newVal)} • خردة ${money(scrapVal)}`} tone="amber" />
        <Stat icon="🔧" label="تكلفة الإصلاحات المعتمدة" value={`${money(repairsCost)} ج.م`} tone="red" />
        <Stat icon="⚡" label="عدد المعدات الكلي" value={`${equipments.length} معدة`} sub={`مؤجر ${rent} • جاهز ${ready} • صيانة ${shop}`} tone="blue" />
      </div>

      <Section title="تكلفة أقسام الورشة" defaultOpen>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat icon="🏭" label="إجمالي تكلفة الورشة" value={`${money(wsTotal)} ج.م`} sub="صرف جديد + خردة + إصلاحات − المرتجع" tone="violet" />
          {wsStats.map((w: any) => (
            <Stat key={w.code} icon={w.icon} label={w.name} value={`${money(w.total)} ج.م`}
              sub={`جديد ${money(w.newV)} • خردة ${money(w.scrapV)} • إصلاح ${money(w.repairs)}`} tone="amber" />
          ))}
        </div>
        <Card className="space-y-3">
          {wsStats.map((w: any) => (
            <Bar key={w.code} label={`${w.icon} ${w.name} (${w.count} طلب)`} value={w.total} max={maxWs} color="bg-violet-500" right={`${money(w.total)} ج.م`} />
          ))}
        </Card>
      </Section>

      <Card className="space-y-3">
        <p className="font-black text-sm text-slate-800">حالة المعدات</p>
        <div className="flex h-4 rounded-full overflow-hidden bg-slate-100">
          <div className="bg-amber-500" style={{ width: `${(rent / total) * 100}%` }} />
          <div className="bg-brand" style={{ width: `${(ready / total) * 100}%` }} />
          <div className="bg-rose-500" style={{ width: `${(shop / total) * 100}%` }} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Tag tone="amber" label="مؤجر" value={rent} />
          <Tag tone="brand" label="جاهز" value={ready} />
          <Tag tone="red" label="بالصيانة" value={shop} />
        </div>
        {types.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100">
            {types.map(([t, n]) => <Tag key={t} tone="violet" label={t} value={n} />)}
          </div>
        )}
      </Card>

      <div className="grid sm:grid-cols-2 gap-3">
        <Card className="space-y-3">
          <p className="font-black text-sm text-slate-800">قيمة المخزون حسب الفئة</p>
          {cats.length === 0 && <p className="text-xs text-slate-400">لا توجد بيانات</p>}
          {cats.map(([c, v]) => <Bar key={c} label={c} value={v} max={maxCat} right={`${money(v)} ج.م`} />)}
        </Card>

        <Card className="space-y-2">
          <p className="font-black text-sm text-slate-800">طلبات معلقة</p>
          <Bar label="عند المخزن" value={whPending} max={Math.max(whPending, finPending, scrapPending, 1)} color="bg-amber-500" />
          <Bar label="إصلاح عند المشتريات" value={repairAtPurchasing} max={Math.max(whPending, finPending, scrapPending, repairAtPurchasing, 1)} color="bg-orange-500" />
          <Bar label="عند المالية" value={finPending} max={Math.max(whPending, finPending, scrapPending, 1)} color="bg-blue-500" />
          <Bar label="خردة بانتظار المخزن" value={scrapPending} max={Math.max(whPending, finPending, scrapPending, 1)} color="bg-violet-500" />
        </Card>
      </div>

      <Section title={`المعاملات المالية (${tx.length})`}>
        <Chips value={txF} onChange={setTxF} options={[
          { id: 'all', label: 'الكل', count: tx.length },
          { id: 'pending', label: 'جارية', count: tx.filter((t: any) => PEND.includes(t.status)).length },
          { id: 'ok', label: 'معتمدة', count: tx.filter((t: any) => OK.includes(t.status)).length },
          { id: 'rej', label: 'مرفوضة', count: tx.filter((t: any) => t.status === 'مرفوض').length },
        ]} />
        {txList.length === 0 && <Empty text="لا توجد معاملات" />}
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {txList.map((t: any) => (
            <div key={t.id} className="relative flex items-center justify-between gap-2 px-3 py-2.5 pr-4">
              <span className={`absolute right-0 top-0 bottom-0 w-1 ${t.accent}`} />
              <div className="min-w-0">
                <ReqMeta no={t.no} date={t.date} />
                <p className="text-sm font-bold text-slate-800 truncate">{t.icon} {t.title}</p>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  <Tag value={t.kind} tone="slate" />
                  {t.amount != null && <Tag label="القيمة" value={`${money(t.amount)} ج.م`} tone="brand" />}
                </div>
                {t.reason && <p className="text-[11px] text-rose-600 mt-0.5">السبب: {t.reason}</p>}
              </div>
              <Badge status={t.status} />
            </div>
          ))}
        </div>
      </Section>

      <Section title={`أصناف شارفت على النفاد (${low.length})`}>
        {low.length === 0 && <Empty text="لا توجد أصناف شارفت على النفاد" />}
        <div className="grid sm:grid-cols-2 gap-2">
          {low.slice(0, 8).map((i: any) => (
            <div key={i.id} className="flex items-center justify-between rounded-xl bg-rose-50 border border-rose-200 px-3 py-2">
              <span className="text-sm font-bold text-rose-800 truncate">⚠️ {i.name}</span>
              <span className="text-xs font-black text-rose-700 shrink-0 mr-2">المتبقي {i.quantity}</span>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}