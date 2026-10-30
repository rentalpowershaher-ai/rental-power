'use client';
import React, { useState } from 'react';
import { eqName, askReason, EqInfo, Btn, Badge, Card, Empty, Section, Tabs, Stat, ReqMeta, RowActions, SCRAP_FIELDS, InventoryStats, act, input, money, NumInput, toNum, SearchBox, Chips, GroupHeader, matches } from '../ui';

const RECEIVER = 'شاهر سليمان';

const NEW_CAT = '__new__';
const BLANK_ITEM = { category: '', newCat: '', name: '', quantity: '', unit_price: '', min_alert: '5' };
const BLANK_SCRAP = { name: '', condition: 'مستعمل', quantity: '1', est_price: '', notes: '' };

const INV_FIELDS: any[] = [
  { key: 'name', label: 'الاسم', required: true },
  { key: 'category', label: 'الفئة', required: true },
  { key: 'quantity', label: 'الكمية', type: 'number' },
  { key: 'min_alert', label: 'حد التنبيه', type: 'number' },
  { key: 'unit_price', label: 'سعر القطعة', type: 'number' },
  { key: 'supplier', label: 'المورد' },
];

function SpareCard({ r, inventory, scrap = [], equipments, supabase, onUpdate }: any) {
  const [who, setWho] = useState(RECEIVER);
  const [other, setOther] = useState('');
  const [busy, setBusy] = useState(false);
  const isScrap = r.source === 'scrap';
  const inv = isScrap ? scrap.find((s: any) => s.id === r.scrap_id) : inventory.find((i: any) => i.id === r.inventory_id);
  const eq = equipments.find((e: any) => e.code === r.equipment_code);
  const short = r.kind === 'صرف' && inv && inv.quantity < r.quantity;
  const gone = r.kind === 'صرف' && !inv; // الصنف اتحذف من المخزون/الخردة

  const run = async (fn: string, args: any) => {
    setBusy(true);
    await act(supabase.rpc(fn, args), onUpdate);
    setBusy(false);
  };
  const dispense = () => {
    const name = who === RECEIVER ? RECEIVER : other.trim();
    if (!name) return alert('اكتب اسم المستلم');
    run('spare_dispense', { p_id: r.id, p_receiver: name });
  };
  const reject = async () => {
    const reason = await askReason(`سبب رفض طلب (${r.item_name}) — يصل للصيانة`);
    if (reason === null) return;
    run('spare_reject', { p_id: r.id, p_reason: reason });
  };

  const tag = r.kind === 'صرف' ? '🔧 طلب صرف' : r.kind === 'شراء' ? '🛒 طلب شراء' : '↩️ استرجاع';
  return (
    <Card className="space-y-2 !bg-amber-50 !border-amber-200">
      <div className="flex justify-between gap-2">
        <div>
          <ReqMeta prefix="SP" no={r.req_no} date={r.created_at} />
          <p className="font-bold">{tag}: {r.item_name} × {r.qty_label || r.quantity}{isScrap && <span className="text-amber-700"> ♻️ (خردة)</span>}</p>
          <p className="text-xs text-slate-600">{isScrap ? `المصدر: ♻️ ${r.kind === 'استرجاع' ? 'الاسترجاع إلى' : 'الصرف من'} الخردة والمستعمل` : `الفئة: ${r.category || '-'}`}</p>
          <EqInfo code={r.equipment_code} equipments={equipments} className="mt-1.5" />
          {r.notes && <p className="text-xs text-slate-700 mt-1">📝 {r.notes}</p>}
          {r.kind === 'استرجاع' && <p className="text-xs font-bold text-emerald-700 mt-1">↩️ عند قبولك تُضاف الكمية تلقائياً {isScrap ? 'للخردة والمستعمل' : 'لأصناف المخزن'}</p>}
        </div>
        {inv && r.kind !== 'شراء' && (
          <span className={`text-xs font-black ${short ? 'text-rose-600' : 'text-slate-700'}`}>المتاح: {inv.quantity}</span>
        )}
      </div>

      {r.kind === 'صرف' && (
        <div className="space-y-2">
          <select className={input} value={who} onChange={(e) => setWho(e.target.value)}>
            <option value={RECEIVER}>{RECEIVER}</option>
            <option value="other">شخص آخر…</option>
          </select>
          {who === 'other' && <input className={input} placeholder="اسم المستلم" value={other} onChange={(e) => setOther(e.target.value)} />}
          {short && <p className="text-xs font-bold text-rose-600">الكمية المتاحة لا تكفي</p>}
          {gone && <p className="text-xs font-bold text-rose-600">الصنف لم يعد موجوداً في {isScrap ? 'الخردة' : 'المخزن'}</p>}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {r.kind === 'صرف' && <Btn disabled={busy || short || gone} className="!py-1.5 !px-3 text-xs" onClick={dispense}>قبول وصرف</Btn>}
        {r.kind === 'استرجاع' && <Btn disabled={busy} className="!py-1.5 !px-3 text-xs" onClick={() => run('spare_return_accept', { p_id: r.id })}>قبول الاسترجاع</Btn>}
        {r.kind === 'شراء' && <Btn disabled={busy} className="!py-1.5 !px-3 text-xs" onClick={() => run('spare_forward_to_purchasing', { p_id: r.id })}>إرسال للمشتريات</Btn>}
        <Btn color="red" disabled={busy} className="!py-1.5 !px-3 text-xs" onClick={reject}>رفض</Btn>
      </div>
    </Card>
  );
}

export default function WarehouseView({ inventory, purchaseReqs, scrap, equipments = [], spareReqs = [], supabase, onUpdate, dept }: any) {
  const [tab, setTab] = useState('stock');
  const pendingSpare = spareReqs.filter((s: any) => s.status === 'معلق_المخزن');
  const atPurchasing = spareReqs.filter((s: any) => ['محوّل_للمشتريات', 'جاري_الشراء', 'متوقف_المالية', 'غير_متوفر'].includes(s.status));
  const [item, setItem] = useState(BLANK_ITEM);
  const cats = Array.from(new Set(inventory.map((i: any) => i.category).filter(Boolean))) as string[];
  const [sc, setSc] = useState<any>(BLANK_SCRAP);
  // بحث وفلترة
  const [q, setQ] = useState('');
  const [catF, setCatF] = useState('all');
  const [lowOnly, setLowOnly] = useState(false);
  const [rq, setRq] = useState('');
  const [sq, setSq] = useState('');
  const [condF, setCondF] = useState('all');

  const incoming = purchaseReqs.filter((r: any) => r.status === 'معلق_المخزن');
  const toReceive = purchaseReqs.filter((r: any) => r.status === 'مقبول');
  const pendingScrap = scrap.filter((s: any) => s.status === 'معلق_المخزن');
  const acceptedScrap = scrap.filter((s: any) => s.status === 'مقبول');

  const decide = async (table: string, id: string, status: string) => {
    let reason: string | null = null;
    if (status === 'مرفوض') {
      reason = await askReason('سبب الرفض — يظهر للقسم صاحب الطلب');
      if (reason === null) return;
    }
    await act(supabase.from(table).update({ status, reject_reason: reason }).eq('id', id), onUpdate);
  };

  const receive = (id: string) => act(supabase.rpc('receive_purchase', { p_id: id }), onUpdate);

  const adjust = (i: any, d: number) =>
    act(supabase.from('inventory').update({ quantity: Math.max(0, i.quantity + d) }).eq('id', i.id), onUpdate);

  const addItem = async () => {
    const category = (item.category === NEW_CAT ? item.newCat : item.category).trim();
    const name = item.name.trim();
    if (!category) return alert('اختر الفئة أو اكتب فئة جديدة');
    if (!name) return alert('اكتب اسم الصنف');
    const qty = toNum(item.quantity), price = toNum(item.unit_price), minA = toNum(item.min_alert);
    if (qty <= 0) return alert('اكتب العدد');
    // لو الصنف موجود بنفس الاسم والفئة: نزوّد كميته بدل ما نكرره
    const same = inventory.find(
      (i: any) => (i.category || '').trim() === category && (i.name || '').trim().toLowerCase() === name.toLowerCase()
    );
    const ok = same
      ? await act(
          supabase.from('inventory').update({ quantity: Number(same.quantity) + qty, unit_price: price || same.unit_price, min_alert: minA }).eq('id', same.id),
          onUpdate
        )
      : await act(
          supabase.from('inventory').insert([{
            name, category, quantity: qty, min_alert: minA, unit_price: price, supplier: '',
          }]),
          onUpdate
        );
    if (ok) setItem(BLANK_ITEM);
  };

  const addScrap = async () => {
    if (!sc.name) return alert('اكتب اسم الصنف');
    const ok = await act(supabase.from('scrap_items').insert([{ ...sc, quantity: toNum(sc.quantity) || 1, est_price: toNum(sc.est_price), status: 'مقبول', added_by: dept }]), onUpdate);
    if (ok) setSc(BLANK_SCRAP);
  };

  const inCat = item.category && item.category !== NEW_CAT;
  const catItems = inCat ? inventory.filter((i: any) => i.category === item.category) : [];
  const typedCat = (item.category === NEW_CAT ? item.newCat : item.category).trim();
  const existing = typedCat && item.name.trim()
    ? inventory.find((i: any) => (i.category || '').trim() === typedCat && (i.name || '').trim().toLowerCase() === item.name.trim().toLowerCase())
    : null;
  const filteredInv = inventory.filter(
    (i: any) => (catF === 'all' || i.category === catF) && (!lowOnly || i.quantity <= i.min_alert) && matches(q, i.name, i.code, i.category, i.supplier)
  );
  const grouped = Object.entries(
    filteredInv.reduce((m: any, i: any) => { const c = i.category || 'بدون فئة'; (m[c] = m[c] || []).push(i); return m; }, {})
  ).sort((a: any, b: any) => a[0].localeCompare(b[0], 'ar'));

  const fPending = pendingSpare.filter((r: any) => matches(rq, r.item_name, r.category, r.equipment_code));
  const fIncoming = incoming.filter((r: any) => matches(rq, r.item_name, r.category));
  const fToReceive = toReceive.filter((r: any) => matches(rq, r.item_name, r.category));
  const fScrap = acceptedScrap.filter((s: any) => (condF === 'all' || s.condition === condF) && matches(sq, s.name, s.condition, s.notes));

  return (
    <div className="space-y-6">
      <InventoryStats inventory={inventory} />

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'stock', label: '📦 المخزون الجديد' },
        { id: 'req', label: 'الطلبات الواردة', count: incoming.length + toReceive.length + pendingSpare.length },
        { id: 'scrap', label: '♻️ الخردة والمستعمل', count: pendingScrap.length },
      ]} />

      {tab === 'stock' && (
        <div className="space-y-5">
          <Card className="!bg-gradient-to-br !from-white !to-brand-light/40 !border-brand/20 space-y-3 shadow-sm">
            <h4 className="font-black text-slate-800">➕ إضافة صنف للمخزون</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500">الفئة</label>
                <select className={input} value={item.category} onChange={(e) => setItem({ ...BLANK_ITEM, category: e.target.value })}>
                  <option value="">اختر الفئة</option>
                  {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                  <option value={NEW_CAT}>➕ فئة جديدة</option>
                </select>
              </div>
              {item.category === NEW_CAT && (
                <div>
                  <label className="text-[11px] font-bold text-slate-500">اسم الفئة الجديدة</label>
                  <input className={input} placeholder="اكتب اسم الفئة" value={item.newCat} onChange={(e) => setItem({ ...item, newCat: e.target.value })} />
                </div>
              )}
            </div>

            {/* محتويات الفئة المختارة */}
            {inCat && (
              <div className="rounded-2xl bg-white border border-brand/20 p-2.5 space-y-2">
                <p className="text-[11px] font-bold text-slate-500">
                  أصناف فئة «{item.category}» ({catItems.length}) — اضغط على صنف لإضافة كمية له
                </p>
                {catItems.length === 0 && <p className="text-xs text-slate-400">لا توجد أصناف في هذه الفئة بعد</p>}
                <div className="flex flex-wrap gap-1.5">
                  {catItems.map((i: any) => (
                    <button
                      key={i.id}
                      type="button"
                      onClick={() => setItem({ ...item, name: i.name, unit_price: String(i.unit_price ?? ''), min_alert: String(i.min_alert ?? '5') })}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition active:scale-95 ${
                        item.name.trim().toLowerCase() === (i.name || '').trim().toLowerCase()
                          ? 'bg-brand text-white border-brand'
                          : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {i.name} <span className="opacity-70">({i.quantity})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-500">الصنف</label>
                <input className={input} placeholder="اسم الصنف (أو اختر من فوق)" value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} />
                {existing && <p className="text-[11px] font-bold text-brand-dark mt-1">✓ الصنف موجود (الكمية الحالية {existing.quantity}) — سيتم زيادة كميته</p>}
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500">العدد</label>
                <NumInput value={item.quantity} onChange={(v: string) => setItem({ ...item, quantity: v })} placeholder="العدد" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500">سعر القطعة (ج.م)</label>
                <NumInput value={item.unit_price} onChange={(v: string) => setItem({ ...item, unit_price: v })} placeholder="السعر" />
              </div>
              <div>
                <label className="text-[11px] font-bold text-slate-500">الحد الأدنى للتنبيه</label>
                <NumInput value={item.min_alert} onChange={(v: string) => setItem({ ...item, min_alert: v })} placeholder="حد التنبيه" />
              </div>
            </div>
            <Btn onClick={addItem} className="w-full">{existing ? 'زيادة الكمية في المخزون' : 'إضافة للمخزون'}</Btn>
          </Card>

          {/* بحث وفلترة */}
          <div className="space-y-2">
            <SearchBox value={q} onChange={setQ} placeholder="ابحث عن صنف أو فئة أو كود..." />
            <Chips
              value={catF}
              onChange={setCatF}
              options={[{ id: 'all', label: 'كل الفئات', count: inventory.length }, ...cats.map((c) => ({ id: c, label: c, count: inventory.filter((i: any) => i.category === c).length }))]}
            />
            <button
              type="button"
              onClick={() => setLowOnly(!lowOnly)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-bold border ${lowOnly ? 'bg-rose-600 text-white border-rose-600' : 'bg-white text-rose-700 border-rose-200'}`}
            >
              ⚠️ الأصناف الشارفة على النفاد فقط
            </button>
          </div>

          <Section title={`المخزون الحالي (${filteredInv.length} من ${inventory.length} صنف)`}>
            {inventory.length === 0 && <Empty text="المخزن فارغ" />}
            {inventory.length > 0 && filteredInv.length === 0 && <Empty text="لا توجد نتائج مطابقة" />}
            <div className="space-y-4">
              {grouped.map(([cat, list]: any) => (
                <div key={cat} className="space-y-2">
                  <GroupHeader title={cat} forceOpen={!!q || catF !== 'all' || lowOnly || grouped.length <= 2} sub={`${list.length} صنف • ${list.reduce((a: number, i: any) => a + Number(i.quantity || 0), 0)} قطعة`}>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    {list.map((i: any) => {
                      const low = i.quantity <= i.min_alert;
                      return (
                        <div key={i.id} className={`relative overflow-hidden p-3.5 pr-4 rounded-2xl border shadow-sm bg-white ${low ? 'border-rose-300' : 'border-slate-200'}`}>
                          <span className={`absolute right-0 top-0 bottom-0 w-1.5 ${low ? 'bg-rose-500' : 'bg-brand'}`} />
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-black text-slate-800 truncate">{i.name}</h4>
                              <p className="text-[11px] text-slate-400" dir="ltr">{i.code}</p>
                            </div>
                            <span className="text-xs font-black text-brand-dark bg-brand-light rounded-lg px-2 py-1 whitespace-nowrap">{money(i.unit_price)} ج.م</span>
                          </div>
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-1.5 bg-slate-100 rounded-xl p-1">
                              <button onClick={() => adjust(i, -1)} className="w-8 h-8 rounded-lg bg-white shadow-sm font-black active:scale-90">−</button>
                              <span className="font-black text-lg min-w-[2.5rem] text-center">{i.quantity}</span>
                              <button onClick={() => adjust(i, 1)} className="w-8 h-8 rounded-lg bg-white shadow-sm font-black active:scale-90">+</button>
                            </div>
                            {low && <span className="text-[11px] font-black text-rose-600 bg-rose-50 rounded-lg px-2 py-1">⚠️ شارف على النفاد</span>}
                          </div>
                          <RowActions className="mt-3 pt-2 border-t border-slate-100" table="inventory" row={i} fields={INV_FIELDS} supabase={supabase} onUpdate={onUpdate}
                            title="تعديل الصنف" confirmText={`حذف الصنف ${i.name} من المخزون نهائياً؟`} />
                        </div>
                      );
                    })}
                  </div>
                  </GroupHeader>
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}

      {tab === 'req' && (
        <div className="space-y-6">
          <SearchBox value={rq} onChange={setRq} placeholder="ابحث في الطلبات بالصنف أو الفئة أو كود المعدة..." />
          <Section title={`طلبات قطع الغيار من الصيانة (${pendingSpare.length})`}>
            {fPending.length === 0 && <Empty text="لا توجد طلبات من الصيانة" />}
            {fPending.map((r: any) => (
              <SpareCard key={r.id} r={r} inventory={inventory} scrap={scrap} equipments={equipments} supabase={supabase} onUpdate={onUpdate} />
            ))}
          </Section>
          {atPurchasing.length > 0 && (
            <Section title="طلبات قطع غيار عند المشتريات">
              {atPurchasing.map((s: any) => (
                <Card key={s.id} className="flex items-center justify-between gap-2 !bg-violet-50 !border-violet-200">
                  <div className="text-sm">
                    <ReqMeta prefix="SP" no={s.req_no} date={s.created_at} />
                    <p className="font-bold">{s.item_name} × {s.qty_label || s.quantity} — {eqName(s.equipment_code)}</p>
                    <EqInfo code={s.equipment_code} equipments={equipments} className="mt-1" />
                    {s.purchasing_note && <p className="text-xs text-slate-600">📝 {s.purchasing_note}</p>}
                  </div>
                  <Badge status={s.status} />
                </Card>
              ))}
            </Section>
          )}
          <Section title={`طلبات الشراء بانتظار قرارك (${incoming.length})`}>
            {fIncoming.length === 0 && <Empty text="لا توجد طلبات جديدة" />}
            {fIncoming.map((r: any) => (
              <Card key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 !bg-slate-50">
                <div>
                  <ReqMeta prefix="PR" no={r.req_no} date={r.created_at} />
                  <p className="font-bold">{r.item_name} ({r.quantity} قطعة)</p>
                  <p className="text-xs text-slate-500">{r.category} • {money(r.total_price)} ج.م</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Btn className="!py-1.5 !px-3 text-xs" onClick={() => act(supabase.rpc('purchase_warehouse_decide', { p_id: r.id, p_route: 'finance' }), onUpdate)}>إرسال للمالية</Btn>
                  <Btn color="dark" className="!py-1.5 !px-3 text-xs" onClick={() => act(supabase.rpc('purchase_warehouse_decide', { p_id: r.id, p_route: 'direct' }), onUpdate)}>قبول في المخزن مباشرة</Btn>
                  <Btn color="red" className="!py-1.5 !px-3 text-xs" onClick={() => decide('purchase_requests', r.id, 'مرفوض')}>رفض</Btn>
                </div>
              </Card>
            ))}
          </Section>
          <Section title={`جاهز للاستلام (${toReceive.length})`}>
            {fToReceive.length === 0 && <Empty text="لا توجد طلبات للاستلام" />}
            {fToReceive.map((r: any) => (
              <Card key={r.id} className="flex items-center justify-between gap-3 !bg-emerald-50 !border-emerald-200">
                <div>
                  <ReqMeta prefix="PR" no={r.req_no} date={r.created_at} />
                  <p className="font-bold">{r.item_name} ({r.quantity})</p>
                </div>
                <Btn onClick={() => receive(r.id)} className="!py-1.5 !px-3 text-xs">📥 تم الاستلام – أضف للمخزون</Btn>
              </Card>
            ))}
          </Section>
        </div>
      )}

      {tab === 'scrap' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="عدد قطع الخردة والمستعمل" value={acceptedScrap.reduce((a: number, s: any) => a + s.quantity, 0)} />
            <Stat label="قيمتها التقديرية" value={`${money(acceptedScrap.reduce((a: number, s: any) => a + s.quantity * Number(s.est_price || 0), 0))} ج.م`} tone="amber" />
          </div>

          <Section title={`طلبات المشتريات بانتظار موافقتك (${pendingScrap.length})`}>
            {pendingScrap.length === 0 && <Empty text="لا توجد طلبات" />}
            {pendingScrap.map((s: any) => (
              <Card key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 !bg-slate-50">
                <div>
                  <ReqMeta prefix="SC" no={s.req_no} date={s.created_at} />
                  <p className="font-bold">{s.name} ({s.quantity}) — {s.condition}</p>
                  <p className="text-xs text-slate-500">تقدير: {money(s.est_price)} ج.م {s.notes && `• ${s.notes}`}</p>
                </div>
                <div className="flex gap-2">
                  <Btn className="!py-1.5 !px-3 text-xs" onClick={() => decide('scrap_items', s.id, 'مقبول')}>قبول</Btn>
                  <Btn color="red" className="!py-1.5 !px-3 text-xs" onClick={() => decide('scrap_items', s.id, 'مرفوض')}>رفض</Btn>
                </div>
              </Card>
            ))}
          </Section>

          <Card className="!bg-slate-50 space-y-3">
            <h4 className="font-bold">إضافة مباشرة لقسم الخردة</h4>
            <div className="grid sm:grid-cols-2 gap-3">
              <input className={input} placeholder="اسم الصنف" value={sc.name} onChange={(e) => setSc({ ...sc, name: e.target.value })} />
              <select className={input} value={sc.condition} onChange={(e) => setSc({ ...sc, condition: e.target.value })}>
                <option>مستعمل</option><option>خردة</option><option>تالف</option>
              </select>
              <NumInput placeholder="الكمية" value={sc.quantity} onChange={(v: string) => setSc({ ...sc, quantity: v })} />
              <NumInput placeholder="السعر التقديري" value={sc.est_price} onChange={(v: string) => setSc({ ...sc, est_price: v })} />
            </div>
            <Btn onClick={addScrap}>إضافة</Btn>
          </Card>

          <div className="space-y-2">
            <SearchBox value={sq} onChange={setSq} placeholder="ابحث في الخردة والمستعمل..." />
            <Chips value={condF} onChange={setCondF} options={[
              { id: 'all', label: 'الكل', count: acceptedScrap.length },
              ...['مستعمل', 'خردة', 'تالف'].map((c) => ({ id: c, label: c, count: acceptedScrap.filter((s: any) => s.condition === c).length })),
            ]} />
          </div>
          <Section title={`مخزون الخردة والمستعمل (${fScrap.length})`}>
            {fScrap.length === 0 && <Empty text="لا يوجد" />}
            <div className="grid sm:grid-cols-2 gap-3">
              {fScrap.map((s: any) => (
                <div key={s.id} className="p-3.5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-sm">
                  <h4 className="font-bold">{s.name}</h4>
                  <p className="text-xs text-slate-600">{s.condition} | الكمية: {s.quantity} | تقدير: {money(s.est_price)} ج.م</p>
                  <RowActions className="mt-2" table="scrap_items" row={s} fields={SCRAP_FIELDS} supabase={supabase} onUpdate={onUpdate}
                    title="تعديل صنف الخردة" confirmText={`حذف ${s.name} من الخردة والمستعمل نهائياً؟`} />
                </div>
              ))}
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}