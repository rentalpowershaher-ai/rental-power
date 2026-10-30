'use client';
import React, { useState } from 'react';
import { eqName, RejectNote, EqInfo, fmtDate, Btn, Badge, Card, Empty, Stat, Tabs, ReqMeta, RowActions, SCRAP_FIELDS, InventoryStats, Item, Tag, FormCard, Field2, SearchBox, Chips, GroupHeader, NumInput, act, input, money, toNum, matches } from '../ui';

const ALERT_H = 72; // ساعات التنبيه للطلبات المعلّقة
const PR_FIELDS: any[] = [
  { key: 'item_name', label: 'اسم الصنف', required: true },
  { key: 'category', label: 'الفئة', required: true },
  { key: 'quantity', label: 'الكمية', type: 'number' },
  { key: 'unit_price', label: 'سعر القطعة', type: 'number' },
  { key: 'supplier', label: 'المورد' },
];

export default function PurchasingView({ inventory, purchaseReqs, scrap, spareReqs = [], repairReqs = [], equipments = [], supabase, onUpdate, dept }: any) {
  const [tab, setTab] = useState('buy');
  const [spareId, setSpareId] = useState<string | null>(null);
  const fromWarehouse = spareReqs.filter((x: any) => ['محوّل_للمشتريات', 'جاري_الشراء', 'متوقف_المالية', 'غير_متوفر'].includes(x.status));
  // الساعات منذ آخر تحديث لحالة الطلب (وصل المشتريات / جاري الشراء / تعليق / غير متوفر) — إنذار بعد 72 ساعة
  const startOf = (x: any) => x.status_changed_at || x.forwarded_at || x.created_at;
  const hoursAt = (x: any) => { const t = x.status_changed_at || x.forwarded_at || x.created_at; return t ? Math.floor((Date.now() - new Date(t).getTime()) / 3600000) : 0; };
  const setSpare = async (id: string, status: string, ask = false) => {
    let note: string | null = null;
    if (ask) {
      note = window.prompt('ملاحظة للمخزن (اختياري)');
      if (note === null) return;
    }
    await act(supabase.rpc('spare_purchasing_update', { p_id: id, p_status: status, p_note: note }), onUpdate);
  };
  const prepare = (x: any) => {
    setF({ item_name: x.item_name, category: x.category || '', quantity: String(x.quantity), unit_price: '', supplier: '', min_alert: '5' });
    setSpareId(x.id);
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };
  // طلبات إصلاح الصيانة: تصل هنا أولاً وتبعتها للمالية كما هي
  const pendRepair = repairReqs.filter((x: any) => x.status === 'معلق_المشتريات');
  const doneRepair = repairReqs.filter((x: any) => x.status !== 'معلق_المشتريات').slice(0, 15);
  const forwardRepair = (id: string) => act(supabase.rpc('repair_forward_to_finance', { p_id: id }), onUpdate);
  const [q, setQ] = useState('');
  const [catF, setCatF] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [sq, setSq] = useState('');
  const [condF, setCondF] = useState('all');
  const [tq, setTq] = useState('');
  const [stF, setStF] = useState('all');
  const lowCount = inventory.filter((i: any) => i.quantity <= i.min_alert).length;
  const acceptedScrap = scrap.filter((x: any) => x.status === 'مقبول');

  // طلب سريع من صنف في المخزون: يعبّي النموذج تلقائياً
  const reorder = (i: any) => {
    setF({ item_name: i.name, category: i.category, quantity: String(Math.max(1, (i.min_alert || 5) * 2)), unit_price: String(i.unit_price ?? ''), supplier: i.supplier || '', min_alert: String(i.min_alert ?? 5) });
    setTab('buy');
  };
  // شراء
  const [f, setF] = useState<any>({ item_name: '', category: '', quantity: '', unit_price: '', supplier: '', min_alert: '5' });
  // خردة
  const [s, setS] = useState<any>({ name: '', condition: 'مستعمل', quantity: '1', est_price: '', notes: '' });

  const sendBuy = async () => {
    if (!f.item_name.trim() || !f.category.trim()) return alert('اكتب اسم الصنف والفئة');
    const qty = toNum(f.quantity), price = toNum(f.unit_price);
    if (qty <= 0) return alert('اكتب الكمية');
    const ok = await act(
      supabase.from('purchase_requests').insert([{
        item_name: f.item_name.trim(), category: f.category.trim(), supplier: f.supplier, quantity: qty, unit_price: price, min_alert: toNum(f.min_alert),
        total_price: qty * price, status: 'معلق_المخزن', spare_request_id: spareId,
      }]),
      onUpdate
    );
    if (ok) setSpareId(null);
    if (ok) setF({ item_name: '', category: '', quantity: '', unit_price: '', supplier: '', min_alert: '5' });
  };

  const sendScrap = async () => {
    if (!s.name) return alert('اكتب اسم الصنف');
    const ok = await act(supabase.from('scrap_items').insert([{ ...s, quantity: toNum(s.quantity) || 1, est_price: toNum(s.est_price), status: 'معلق_المخزن', added_by: dept }]), onUpdate);
    if (ok) setS({ name: '', condition: 'مستعمل', quantity: '1', est_price: '', notes: '' });
  };

  const cats = Array.from(new Set(inventory.map((i: any) => i.category).filter(Boolean))) as string[];
  const catNames = f.category ? inventory.filter((i: any) => i.category === f.category).map((i: any) => i.name) : [];
  const filteredInv = inventory.filter(
    (i: any) => (catF === 'all' || i.category === catF) && (!lowOnly || i.quantity <= i.min_alert) && matches(q, i.name, i.code, i.category, i.supplier)
  );
  const grouped = Object.entries(
    filteredInv.reduce((m: any, i: any) => { const c = i.category || 'بدون فئة'; (m[c] = m[c] || []).push(i); return m; }, {})
  ).sort((a: any, b: any) => a[0].localeCompare(b[0], 'ar'));
  const fScrap = acceptedScrap.filter((x: any) => (condF === 'all' || x.condition === condF) && matches(sq, x.name, x.condition, x.notes));
  const fPR = purchaseReqs.filter((r: any) => (stF === 'all' || r.status === stF) && matches(tq, r.item_name, r.category, r.supplier));
  const fSC = scrap.filter((r: any) => (stF === 'all' || r.status === stF) && matches(tq, r.name, r.condition));

  return (
    <div className="space-y-6">
      <InventoryStats inventory={inventory} />

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'buy', label: '🛒 طلب شراء جديد', count: fromWarehouse.length },
        { id: 'repair', label: '🔧 إصلاح الصيانة', count: pendRepair.length },
        { id: 'stock', label: '📦 المخزون', count: lowCount },
        { id: 'scrap', label: '♻️ خردة / مستعمل' },
        { id: 'track', label: 'متابعة طلباتي' },
      ]} />

      {tab === 'buy' && fromWarehouse.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-bold">طلبات قطع غيار محوّلة من المخزن ({fromWarehouse.length})</h4>
          {fromWarehouse.map((x: any) => (
            <Card key={x.id} className={`space-y-2 ${hoursAt(x) >= ALERT_H ? '!bg-rose-50 !border-rose-300' : '!bg-violet-50 !border-violet-200'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm">
                  <ReqMeta prefix="SP" no={x.req_no} date={x.created_at} />
                  <p className="font-bold">{x.item_name} × {x.quantity} {x.category && `(${x.category})`}</p>
                  <div className="space-y-1 pt-1">
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div className={`h-full rounded-full ${hoursAt(x) >= ALERT_H ? 'bg-rose-500' : 'bg-violet-500'}`} style={{ width: `${Math.min(100, Math.max(4, (hoursAt(x) / ALERT_H) * 100))}%` }} />
                    </div>
                    <p className="text-[11px] font-bold text-slate-600">⏱️ العدّاد بدأ: {fmtDate(startOf(x))} — {hoursAt(x) >= ALERT_H ? `تعدّى ${ALERT_H} ساعة` : `باقي ${ALERT_H - hoursAt(x)} ساعة على التنبيه`}</p>
                    {x.last_alert_at && <p className="text-[11px] font-bold text-rose-600">🔔 آخر تنبيه اتبعت: {fmtDate(x.last_alert_at)}</p>}
                    {hoursAt(x) >= ALERT_H && <p className="text-xs font-black text-rose-600">⏰ مرّ {hoursAt(x)} ساعة ({Math.floor(hoursAt(x) / 24)} يوم) والطلب لسه معلّق — لازم يتم شراء الصنف</p>}
                  </div>
                  <EqInfo code={x.equipment_code} equipments={equipments} className="my-1" />
                  {x.notes && <p className="text-xs text-slate-500">📝 {x.notes}</p>}
                  {x.purchasing_note && <p className="text-xs text-slate-600">📝 {x.purchasing_note}</p>}
                </div>
                <Badge status={x.status} />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Btn color="slate" onClick={() => setSpare(x.id, 'جاري_الشراء')} className="!py-1.5 !px-3 text-xs">جاري الشراء</Btn>
                <Btn color="amber" onClick={() => setSpare(x.id, 'متوقف_المالية', true)} className="!py-1.5 !px-3 text-xs">تعليق بسبب الماليات</Btn>
                <Btn color="red" onClick={() => setSpare(x.id, 'غير_متوفر', true)} className="!py-1.5 !px-3 text-xs">غير متوفر بالأسواق</Btn>
                <Btn onClick={() => prepare(x)} className="!py-1.5 !px-3 text-xs">✅ تم الشراء – إضافة للمخزن</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === 'buy' && (
        <FormCard title="طلب إضافة صنف جديد للمخزن (يمر على المخزن ثم المالية)" icon="🛒">
          {spareId && <p className="text-xs font-bold text-violet-700 bg-violet-50 rounded-xl px-3 py-2">🔗 هذا الطلب مرتبط بطلب قطعة غيار من الصيانة — سيصلهم إشعار عند وصوله للمخزن</p>}
          <div className="grid sm:grid-cols-2 gap-3">
            <Field2 label="الفئة">
              <input className={input} list="pur-cats" placeholder="اختر فئة موجودة أو اكتب جديدة" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} />
              <datalist id="pur-cats">{cats.map((c) => <option key={c} value={c} />)}</datalist>
            </Field2>
            <Field2 label="اسم الصنف">
              <input className={input} list="pur-items" placeholder="اسم الصنف" value={f.item_name} onChange={(e) => setF({ ...f, item_name: e.target.value })} />
              <datalist id="pur-items">{catNames.map((n: string) => <option key={n} value={n} />)}</datalist>
            </Field2>
            <Field2 label="الكمية"><NumInput placeholder="الكمية" value={f.quantity} onChange={(v: string) => setF({ ...f, quantity: v })} /></Field2>
            <Field2 label="سعر القطعة"><NumInput placeholder="سعر القطعة" value={f.unit_price} onChange={(v: string) => setF({ ...f, unit_price: v })} /></Field2>
            <Field2 label="المورد"><input className={input} placeholder="المورد" value={f.supplier} onChange={(e) => setF({ ...f, supplier: e.target.value })} /></Field2>
            <Field2 label="حد التنبيه"><NumInput placeholder="حد التنبيه" value={f.min_alert} onChange={(v: string) => setF({ ...f, min_alert: v })} /></Field2>
          </div>
          {f.category && catNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 self-center">أصناف الفئة:</span>
              {catNames.map((n: string) => (
                <button key={n} type="button" onClick={() => setF({ ...f, item_name: n })} className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-white border border-slate-200 text-slate-700 active:scale-95">{n}</button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between rounded-xl bg-white border border-brand/20 px-3 py-2">
            <span className="text-xs font-bold text-slate-500">الإجمالي</span>
            <span className="font-black text-brand-dark">{money(toNum(f.quantity) * toNum(f.unit_price))} ج.م</span>
          </div>
          <Btn onClick={sendBuy} className="w-full">إرسال للمخزن</Btn>
        </FormCard>
      )}

      {tab === 'repair' && (
        <div className="space-y-5">
          <div className="space-y-2.5">
            <h4 className="font-black text-slate-800">طلبات إصلاح من الصيانة بانتظار تحويلها للمالية ({pendRepair.length})</h4>
            {pendRepair.length === 0 && <Empty text="لا توجد طلبات إصلاح جديدة" />}
            {pendRepair.map((r: any) => (
              <Item key={r.id} accent="amber" icon="🔧" meta={<ReqMeta no={r.req_no} date={r.created_at} />}
                title={`${r.part_name} — ${eqName(r.equipment_code)}`}
                sub={<div className="pt-1 space-y-1"><Tag label="التكلفة المتوقعة" value={`${money(r.cost)} ج.م`} tone="amber" /><EqInfo code={r.equipment_code} equipments={equipments} /></div>}
                right={<Btn onClick={() => forwardRepair(r.id)} className="!py-1.5 !px-3 text-xs">إرسال للمالية ←</Btn>} />
            ))}
          </div>
          {doneRepair.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-black text-slate-800">آخر ما تم تحويله</h4>
              {doneRepair.map((r: any) => (
                <Card key={r.id} className="flex items-center justify-between gap-2">
                  <div className="text-sm">
                    <ReqMeta no={r.req_no} date={r.created_at} />
                    <p className="font-bold">{r.part_name} — {eqName(r.equipment_code)} ({money(r.cost)} ج.م)</p>
                    <RejectNote reason={r.reject_reason} by="المخزن" />
                  </div>
                  <Badge status={r.status} />
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'stock' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="أصناف المخزون الجديد" value={inventory.length} sub={`${lowCount} شارف على النفاد`} tone={lowCount ? 'red' : 'brand'} />
            <Stat label="الخردة والمستعمل" value={acceptedScrap.reduce((a: number, x: any) => a + x.quantity, 0)} sub="قطعة (مستقل عن الجديد)" tone="amber" />
          </div>
          <SearchBox value={q} onChange={setQ} placeholder="ابحث عن صنف أو فئة أو كود..." />
          <Chips value={catF} onChange={setCatF} options={[{ id: 'all', label: 'كل الفئات', count: inventory.length }, ...cats.map((c) => ({ id: c, label: c, count: inventory.filter((i: any) => i.category === c).length }))]} />
          <button type="button" onClick={() => setLowOnly(!lowOnly)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${lowOnly ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-700 border-rose-200'}`}>
            ⚠️ الأصناف الشارفة على النفاد فقط
          </button>

          <h4 className="font-black text-slate-800">المخزون الجديد ({filteredInv.length})</h4>
          {filteredInv.length === 0 && <Empty text="لا توجد أصناف مطابقة" />}
          <div className="space-y-4">
            {grouped.map(([cat, list]: any) => (
              <div key={cat} className="space-y-2">
                <GroupHeader title={cat} forceOpen={!!q || catF !== 'all' || lowOnly || grouped.length <= 2} sub={`${list.length} صنف`}>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {list.map((i: any) => {
                    const low = i.quantity <= i.min_alert;
                    return (
                      <Item key={i.id} accent={low ? 'red' : 'brand'} title={i.name}
                        sub={<p><span dir="ltr">{i.code}</span> • {money(i.unit_price)} ج.م</p>}
                        right={<span className={`text-2xl font-black ${low ? 'text-rose-600' : 'text-slate-800'}`}>{i.quantity}</span>}>
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-400">حد التنبيه: {i.min_alert}</span>
                          {low && <Btn color="red" onClick={() => reorder(i)} className="!py-1 !px-2.5 !text-[11px]">⚠️ اطلب الآن</Btn>}
                        </div>
                      </Item>
                    );
                  })}
                </div>
                </GroupHeader>
              </div>
            ))}
          </div>

          <h4 className="font-black text-slate-800 pt-2">الخردة والمستعمل ({fScrap.length})</h4>
          <SearchBox value={sq} onChange={setSq} placeholder="ابحث في الخردة والمستعمل..." />
          <Chips value={condF} onChange={setCondF} options={[
            { id: 'all', label: 'الكل', count: acceptedScrap.length },
            ...['مستعمل', 'خردة', 'تالف'].map((c) => ({ id: c, label: c, count: acceptedScrap.filter((x: any) => x.condition === c).length })),
          ]} />
          {fScrap.length === 0 && <Empty text="لا يوجد" />}
          <div className="grid sm:grid-cols-2 gap-2.5">
            {fScrap.map((x: any) => (
              <Item key={x.id} accent="amber" icon="♻️" title={x.name}
                sub={<div className="flex flex-wrap gap-1 pt-1"><Tag value={x.condition} tone="amber" /><Tag label="الكمية" value={x.quantity} /><Tag label="تقدير" value={`${money(x.est_price)} ج.م`} tone="brand" /></div>} />
            ))}
          </div>
        </div>
      )}

      {tab === 'scrap' && (
        <FormCard title="إضافة صنف خردة / مستعمل (يحتاج موافقة المخزن)" icon="♻️">
          <div className="grid sm:grid-cols-2 gap-3">
            <input className={input} placeholder="اسم الصنف" value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} />
            <select className={input} value={s.condition} onChange={(e) => setS({ ...s, condition: e.target.value })}>
              <option>مستعمل</option><option>خردة</option><option>تالف</option>
            </select>
            <NumInput placeholder="الكمية" value={s.quantity} onChange={(v: string) => setS({ ...s, quantity: v })} />
            <NumInput placeholder="السعر التقديري للقطعة" value={s.est_price} onChange={(v: string) => setS({ ...s, est_price: v })} />
            <input className={`${input} sm:col-span-2`} placeholder="ملاحظات" value={s.notes} onChange={(e) => setS({ ...s, notes: e.target.value })} />
          </div>
          <Btn onClick={sendScrap} className="w-full">إرسال لموافقة المخزن</Btn>
        </FormCard>
      )}

      {tab === 'track' && (
        <div className="space-y-5">
          <div className="space-y-2">
            <SearchBox value={tq} onChange={setTq} placeholder="ابحث في طلباتك بالصنف أو الفئة أو المورد..." />
            <Chips value={stF} onChange={setStF} options={[
              { id: 'all', label: 'كل الحالات' },
              { id: 'معلق_المخزن', label: 'بانتظار المخزن' },
              { id: 'معلق_المالية', label: 'بانتظار المالية' },
              { id: 'مقبول', label: 'مقبول' },
              { id: 'مرفوض', label: 'مرفوض' },
            ]} />
            <h4 className="font-black text-slate-800 pt-1">طلبات الشراء ({fPR.length})</h4>
            {fPR.length === 0 && <Empty text="لا توجد طلبات" />}
            {fPR.slice(0, 40).map((r: any) => (
              <Card key={r.id} className="flex items-center justify-between gap-2">
                <div>
                  <ReqMeta prefix="PR" no={r.req_no} date={r.created_at} />
                  <p className="font-bold text-sm">{r.item_name} ({r.quantity})</p>
                  <RejectNote reason={r.reject_reason} by="المخزن" />
                  <RowActions className="mt-2" table="purchase_requests" row={r} fields={PR_FIELDS} supabase={supabase} onUpdate={onUpdate}
                    title="تعديل طلب الشراء"
                    canEdit={dept === 'general' || r.status === 'معلق_المخزن'} canDelete={dept === 'general' || r.status === 'معلق_المخزن'}
                    beforeSave={(v: any) => ({ ...v, total_price: Number(v.quantity) * Number(v.unit_price) })}
                    confirmText={`حذف طلب الشراء (${r.item_name}) نهائياً؟`} />
                </div>
                <Badge status={r.status} />
              </Card>
            ))}
          </div>
          <div className="space-y-2">
            <h4 className="font-black text-slate-800">طلبات الخردة ({fSC.length})</h4>
            {fSC.length === 0 && <Empty text="لا توجد طلبات" />}
            {fSC.slice(0, 40).map((r: any) => (
              <Card key={r.id} className="flex items-center justify-between gap-2">
                <div>
                  <ReqMeta prefix="SC" no={r.req_no} date={r.created_at} />
                  <p className="font-bold text-sm">{r.name} ({r.quantity}) — {r.condition}</p>
                  <RejectNote reason={r.reject_reason} by="المخزن" />
                  <RowActions className="mt-2" table="scrap_items" row={r} fields={SCRAP_FIELDS} supabase={supabase} onUpdate={onUpdate}
                    title="تعديل طلب الخردة"
                    canEdit={dept === 'general' || r.status === 'معلق_المخزن'} canDelete={dept === 'general' || r.status === 'معلق_المخزن'}
                    confirmText={`حذف طلب الخردة (${r.name}) نهائياً؟`} />
                </div>
                <Badge status={r.status} />
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}