'use client';
import React, { useState } from 'react';
import { eqName, WORKSHOP_DEFAULTS, RejectNote, askReason, EqInfo, Btn, Badge, Card, Empty, Section, Tabs, ReqMeta, RowActions, Item, Tag, FormCard, Field2, SearchBox, Chips, NumInput, act, input, money, toNum, norm, matches } from '../ui';

const RENT_FIELDS: any[] = [
  { key: 'location', label: 'الموقع المطلوب', required: true },
  { key: 'notes', label: 'ملاحظات', type: 'textarea', nullable: true },
];
const SPARE_FIELDS: any[] = [
  { key: 'quantity', label: 'الكمية (باللتر للزيت)', type: 'number' },
  { key: 'notes', label: 'ملاحظات', type: 'textarea', nullable: true },
];
const OIL_FIELDS: any[] = [
  { key: 'current_hours', label: 'عداد الساعات وقت التغيير', type: 'number' },
  { key: 'next_hours', label: 'التغيير القادم عند (ساعة)', type: 'number' },
  { key: 'liters_added', label: 'لترات إضافية', type: 'number' },
  { key: 'change_date', label: 'تاريخ التغيير (سنة-شهر-يوم)', required: true },
];

const KIND_LABEL: Record<string, string> = { 'صرف': '🔧 صرف', 'شراء': '🛒 شراء', 'استرجاع': '↩️ استرجاع' };

const JERRY = 20; // الجركن = 20 لتر
const isOilCat = (c: string) => norm(c).includes('زيت');
const qtyText = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

function SpareForm({ equipments, workshops = [], inventory, scrap = [], spareReqs = [], supabase, onUpdate }: any) {
  const NEW = '__new__';
  const [kind, setKind] = useState('صرف');
  const [eqCode, setEqCode] = useState('');
  const [cat, setCat] = useState('');
  const [catNew, setCatNew] = useState('');
  const [itemId, setItemId] = useState('');
  const [itemNew, setItemNew] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState<'لتر' | 'جركن'>('لتر');
  const [src, setSrc] = useState<'new' | 'scrap'>('new'); // مصدر الصرف / وجهة الاسترجاع
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);

  const eq = equipments.find((x: any) => x.code === eqCode);
  const wsList = workshops.length ? workshops : WORKSHOP_DEFAULTS;
  const cats = Array.from(new Set(inventory.map((i: any) => i.category).filter(Boolean))) as string[];
  const items = inventory.filter((i: any) => i.category === cat);
  const inv = inventory.find((i: any) => i.id === itemId);
  const isBuy = kind === 'شراء';
  const isNewItem = isBuy && (cat === NEW || itemId === NEW);
  const useScrap = kind !== 'شراء' && src === 'scrap';
  const oil = !useScrap && cat !== NEW && isOilCat(cat);
  // الصرف: الخردة المتاحة فقط. الاسترجاع: كل أصناف الخردة (حتى لو كميتها صفر الآن)
  const scrapItems = scrap.filter((s: any) => s.status === 'مقبول' && (kind === 'استرجاع' || Number(s.quantity) > 0));
  const sc = scrapItems.find((s: any) => s.id === itemId);
  const n = toNum(qty);
  // المخزون بالزيت محسوب باللتر؛ الجركن يتحول لـ 20 لتر (ويقبل 0.5 جركن)
  const liters = oil ? (unit === 'جركن' ? n * JERRY : n) : n;

  const changeSrc = (v: 'new' | 'scrap') => { setSrc(v); setCat(''); setItemId(''); setQty(''); setUnit('لتر'); };
  const changeKind = (k: string) => { setKind(k); setCat(''); setItemId(''); setCatNew(''); setItemNew(''); };

  const send = async () => {
    if (!eqCode) return alert('اختر كود المعدة');
    if (useScrap) {
      if (!sc) return alert('اختر الصنف من الخردة والمستعمل');
      if (!(n > 0)) return alert('اكتب الكمية');
      if (!Number.isInteger(n)) return alert('كمية الخردة لازم تكون رقم صحيح');
      if (kind === 'صرف' && n > Number(sc.quantity)) return alert(`الكمية المطلوبة أكبر من المتاح في الخردة (${sc.quantity})`);
      setBusy(true);
      // في الاسترجاع قاعدة البيانات بتتأكد إن الصنف اتصرف من الخردة فعلاً، وإلا بترجع خطأ
      const okScrap = await act(
        supabase.from('spare_requests').insert([{
          kind, equipment_code: eqCode, category: sc.category || 'خردة ومستعمل', item_name: sc.name,
          inventory_id: null, scrap_id: sc.id, source: 'scrap', quantity: n, notes: notes.trim() || null, status: 'معلق_المخزن', qty_label: null,
        }]),
        onUpdate
      );
      setBusy(false);
      if (okScrap) { setItemId(''); setQty(''); setNotes(''); alert(kind === 'استرجاع' ? 'تم إرسال طلب الاسترجاع للمخزن' : 'تم إرسال الطلب للمخزن'); }
      return;
    }
    if (!cat) return alert('اختر الفئة');
    if (!itemId) return alert('اختر الصنف');
    if (!(n > 0)) return alert('اكتب الكمية');
    const category = cat === NEW ? catNew.trim() : cat;
    const itemName = itemId === NEW || cat === NEW ? itemNew.trim() : inv?.name;
    if (!category || !itemName) return alert('اكتب اسم الفئة والصنف');
    if (kind === 'صرف' && inv && liters > Number(inv.quantity)) {
      return alert(`الكمية المطلوبة أكبر من المتاح بالمخزن (${qtyText(Number(inv.quantity))}${oil ? ' لتر' : ''})`);
    }
    setBusy(true);
    const ok = await act(
      supabase.from('spare_requests').insert([{
        kind, equipment_code: eqCode, category, item_name: itemName,
        inventory_id: isNewItem ? null : itemId, scrap_id: null, source: 'new', quantity: liters, notes: notes.trim() || null, status: 'معلق_المخزن',
        qty_label: oil ? `${qtyText(n)} ${unit}${unit === 'جركن' ? ` (${qtyText(liters)} لتر)` : ''}` : null,
      }]),
      onUpdate
    );
    setBusy(false);
    if (ok) { setCat(''); setItemId(''); setCatNew(''); setItemNew(''); setQty(''); setUnit('لتر'); setNotes(''); alert('تم إرسال الطلب للمخزن'); }
  };

  return (
    <FormCard title={kind === 'استرجاع' ? 'طلب استرجاع للمخزن' : 'طلب قطعة غيار'} icon={kind === 'استرجاع' ? '↩️' : '🔩'}>
      <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-2xl">
        {['صرف', 'شراء', 'استرجاع'].map((k) => (
          <button key={k} onClick={() => changeKind(k)}
            className={`py-2 rounded-xl text-[11px] font-black transition active:scale-95 ${kind === k ? 'bg-white text-brand-dark shadow ring-1 ring-brand/20' : 'text-slate-500'}`}>
            {k === 'صرف' ? '🔧 صرف من المخزن' : k === 'شراء' ? '🛒 طلب شراء' : '↩️ استرجاع للمخزن'}
          </button>
        ))}
      </div>

      <Field2 label="كود المعدة">
        <select className={input} value={eqCode} onChange={(e) => setEqCode(e.target.value)}>
          <option value="">اختر كود المعدة أو قسم الورشة</option>
          <optgroup label="⚡ المعدات">
            {equipments.map((e: any) => <option key={e.id} value={e.code}>{e.code} — {e.name}</option>)}
          </optgroup>
          <optgroup label="🏭 أقسام الورشة">
            {wsList.map((w: any) => <option key={w.code} value={w.code}>{w.icon} {w.name}</option>)}
          </optgroup>
        </select>
      </Field2>
      {eq ? <EqInfo eq={eq} defaultOpen /> : eqCode ? <EqInfo code={eqCode} /> : null}

      {kind !== 'شراء' && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500">{kind === 'استرجاع' ? 'الاسترجاع إلى' : 'الصرف من'}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([['new', '📦 المخزون الجديد'], ['scrap', '♻️ الخردة والمستعمل']] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => changeSrc(id)}
                className={`py-2 rounded-xl text-xs font-black transition active:scale-95 ${src === id ? (id === 'scrap' ? 'bg-amber-500 text-white shadow' : 'bg-brand text-white shadow') : 'bg-white border border-slate-200 text-slate-600'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {useScrap && (
        <>
          <Field2 label="الصنف (من الخردة والمستعمل)">
            <select className={input} value={itemId} onChange={(e) => setItemId(e.target.value)}>
              <option value="">اختر الصنف</option>
              {scrapItems.map((s: any) => <option key={s.id} value={s.id}>{s.name} — {s.condition} — المتبقي: {s.quantity}</option>)}
            </select>
          </Field2>
          {scrapItems.length === 0 && <p className="text-xs font-bold text-slate-400">لا توجد أصناف في الخردة والمستعمل حالياً</p>}
          {sc && (
            <p className="text-xs font-black rounded-xl px-3 py-2 bg-amber-50 text-amber-800">♻️ المتاح في الخردة: {sc.quantity} • {sc.condition}</p>
          )}
        </>
      )}

      {!useScrap && (<>
      <Field2 label="الفئة">
        <select className={input} value={cat} onChange={(e) => { setCat(e.target.value); setItemId(''); setQty(''); setUnit('لتر'); }}>
          <option value="">اختر الفئة</option>
          {cats.map((c) => <option key={c} value={c}>{c}</option>)}
          {isBuy && <option value={NEW}>➕ فئة جديدة</option>}
        </select>
      </Field2>
      {cat === NEW && <input className={input} placeholder="اسم الفئة الجديدة" value={catNew} onChange={(e) => setCatNew(e.target.value)} />}

      {cat && cat !== NEW && (
        <Field2 label="الصنف">
          <select className={input} value={itemId} onChange={(e) => setItemId(e.target.value)}>
            <option value="">اختر الصنف</option>
            {items.map((i: any) => (
              <option key={i.id} value={i.id}>{i.name} — المتبقي: {qtyText(Number(i.quantity))}{oil ? ' لتر' : ''}</option>
            ))}
            {isBuy && <option value={NEW}>➕ صنف جديد غير موجود</option>}
          </select>
        </Field2>
      )}
      {cat === NEW && <input className={input} placeholder="اسم الصنف" value={itemNew} onChange={(e) => { setItemNew(e.target.value); setItemId(NEW); }} />}
      {cat !== NEW && itemId === NEW && <input className={input} placeholder="اسم الصنف الجديد" value={itemNew} onChange={(e) => setItemNew(e.target.value)} />}
      </>)}

      {!useScrap && inv && (
        <p className={`text-xs font-black rounded-xl px-3 py-2 ${Number(inv.quantity) <= Number(inv.min_alert) ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
          المتبقي في المخزن: {qtyText(Number(inv.quantity))}{oil ? ` لتر (≈ ${qtyText(Number(inv.quantity) / JERRY)} جركن)` : ''}
          {Number(inv.quantity) <= Number(inv.min_alert) && ' ⚠️ شارف على النفاد'}
        </p>
      )}

      {/* الزيت: لتر أو جركن (20 لتر) */}
      {oil && (
        <div className="space-y-2 p-2.5 rounded-2xl bg-amber-50 border border-amber-200">
          <p className="text-[11px] font-black text-amber-800">🛢️ وحدة الصرف (الجركن = {JERRY} لتر)</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(['لتر', 'جركن'] as const).map((u) => (
              <button key={u} type="button" onClick={() => setUnit(u)}
                className={`py-2 rounded-xl text-xs font-black transition active:scale-95 ${unit === u ? 'bg-amber-500 text-white shadow' : 'bg-white border border-amber-200 text-amber-800'}`}>
                {u === 'لتر' ? 'باللتر' : 'بالجركن'}
              </button>
            ))}
          </div>
        </div>
      )}

      <Field2 label={oil ? (unit === 'جركن' ? 'عدد الجراكن (مثال: 0.5 = نصف جركن)' : 'عدد اللترات') : 'الكمية'}>
        <NumInput placeholder={oil ? (unit === 'جركن' ? 'اكتب عدد الجراكن' : 'اكتب عدد اللترات') : 'الكمية'} value={qty} onChange={setQty} />
      </Field2>
      {oil && n > 0 && (
        <p className="text-xs font-black text-brand-dark">
          = {qtyText(liters)} لتر {unit === 'لتر' && `(≈ ${qtyText(liters / JERRY)} جركن)`}
        </p>
      )}

      <textarea className={input} rows={2} placeholder="ملاحظات (تصل للمخزن مع الطلب)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <Btn onClick={send} disabled={busy} className="w-full">{kind === 'استرجاع' ? '↩️ طلب ارتجاع' : 'إرسال للمخزن'}</Btn>
    </FormCard>
  );
}

// ================= طلبات المعدات من التسويق =================
function MkReqCard({ r, equipments, supabase, onUpdate }: any) {
  const ready = equipments.filter((e: any) => e.status === 'جاهز للعمل');
  const [code, setCode] = useState(r.equipment_code || '');
  const [hours, setHours] = useState('');
  const [loc, setLoc] = useState(r.location || '');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const eq = equipments.find((e: any) => e.code === code);
  const options = eq && eq.status !== 'جاهز للعمل' ? [...ready, eq] : ready;

  const forward = async () => {
    if (!code) return alert('اختر كود المعدة');
    if (eq && eq.status !== 'جاهز للعمل') return alert('هذه المعدة غير جاهزة للعمل حالياً');
    if (!String(hours).trim()) return alert('اكتب عدد الساعات الحالي');
    if (!loc.trim()) return alert('اكتب الموقع المطلوب');
    setBusy(true);
    const ok = await act(
      supabase.rpc('equipment_request_forward', {
        p_id: r.id, p_equipment_code: code, p_current_hours: toNum(hours), p_location: loc.trim(), p_notes: notes.trim() || null,
      }),
      onUpdate
    );
    setBusy(false);
    if (ok) alert('تم إرسال الطلب للمالية');
  };
  const reject = async () => {
    const reason = await askReason('سبب رفض طلب المعدة — يظهر للتسويق');
    if (reason === null) return;
    setBusy(true);
    await act(supabase.from('equipment_requests').update({ status: 'مرفوض', reject_reason: reason || null }).eq('id', r.id), onUpdate);
    setBusy(false);
  };

  return (
    <Item accent="violet" icon="🤝" meta={<ReqMeta no={r.req_no} date={r.created_at} />}
      title={r.equipment_name ? `${r.equipment_name} (${r.equipment_code})` : 'معدة حسب المواصفات'}
      sub={
        <div className="space-y-1 pt-1">
          <div className="flex flex-wrap gap-1">
            {r.equip_type && <Tag tone="violet" value={r.equip_type} />}
            {r.power && <Tag label="القدرة" value={r.power} />}
            <Tag label="الموقع المطلوب" value={r.location} tone="brand" />
            {r.needed_date && <Tag label="مطلوبة بتاريخ" value={new Date(r.needed_date).toLocaleDateString('ar-EG')} tone="amber" />}
          </div>
          {r.notes && <p className="text-slate-600">📝 {r.notes}</p>}
        </div>
      }>
      <div className="space-y-2.5 pt-2 border-t border-slate-100">
        <Field2 label="كود المعدة">
          <select className={input} value={code} onChange={(e) => setCode(e.target.value)}>
            <option value="">اختر كود المعدة</option>
            {options.map((e: any) => <option key={e.id} value={e.code}>{e.code} — {e.name}{e.power ? ` (${e.power})` : ''}</option>)}
          </select>
        </Field2>
        {eq && <EqInfo eq={eq} defaultOpen />}
        <Field2 label="عدد الساعات الحالي (اكتبه بنفسك)"><NumInput placeholder="اكتب عدد الساعات الحالي" value={hours} onChange={setHours} /></Field2>
        <Field2 label="الموقع المطلوب"><input className={input} value={loc} onChange={(e) => setLoc(e.target.value)} /></Field2>
        <textarea className={input} rows={2} placeholder="تفاصيل إضافية من الصيانة (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="flex gap-2">
          <Btn onClick={forward} disabled={busy} className="flex-1">إرسال للمالية</Btn>
          <Btn color="red" onClick={reject} disabled={busy} className="!px-4">رفض</Btn>
        </div>
      </div>
    </Item>
  );
}

function MarketingRequests({ equipmentReqs, equipments, supabase, onUpdate }: any) {
  const pending = equipmentReqs.filter((x: any) => x.status === 'معلق_الصيانة');
  const done = equipmentReqs.filter((x: any) => x.status !== 'معلق_الصيانة').slice(0, 20);
  return (
    <div className="space-y-5">
      <Section title={`طلبات المعدات من التسويق (${pending.length})`}>
        {pending.length === 0 && <Empty text="لا توجد طلبات جديدة من التسويق" />}
        {pending.map((r: any) => <MkReqCard key={r.id} r={r} equipments={equipments} supabase={supabase} onUpdate={onUpdate} />)}
      </Section>
      {done.length > 0 && (
        <Section title="آخر الطلبات">
          {done.map((r: any) => (
            <Card key={r.id} className="flex items-center justify-between gap-2">
              <div className="text-sm">
                <ReqMeta no={r.req_no} date={r.created_at} />
                <p className="font-bold">{r.equipment_name ? `${r.equipment_name} (${r.equipment_code})` : (r.equip_type || 'معدة')} — {r.location}</p>
                <RejectNote reason={r.reject_reason} />
              </div>
              <Badge status={r.status} />
            </Card>
          ))}
        </Section>
      )}
    </div>
  );
}

function RentalForm({ equipments, rentalReqs, supabase, onUpdate, dept }: any) {
  const [code, setCode] = useState('');
  const [loc, setLoc] = useState('');
  const [notes, setNotes] = useState('');
  const [curHours, setCurHours] = useState('');
  const eq = equipments.find((x: any) => x.code === code);

  const send = async () => {
    if (!eq) return alert('اختر كود المعدة');
    if (!loc.trim()) return alert('اكتب الموقع المطلوب');
    if (!String(curHours).trim()) return alert('اكتب عدد الساعات الحالي');
    const ok = await act(
      supabase.from('rental_requests').insert([{
        equipment_code: eq.code, equipment_name: eq.name, power: eq.power, hours_meter: eq.hours_meter || 0,
        location: loc.trim(), notes: notes.trim() || null, current_hours: toNum(curHours), status: 'معلق_المالية',
      }]),
      onUpdate
    );
    if (ok) { setCode(''); setLoc(''); setNotes(''); setCurHours(''); alert('تم إرسال الطلب للمالية'); }
  };

  return (
    <div className="space-y-5">
      <FormCard title="طلب إيجار معدة (يصل للمالية بإشعار)" icon="🚛">
        <Field2 label="كود المعدة">
          <select className={input} value={code} onChange={(e) => setCode(e.target.value)}>
            <option value="">اختر كود المعدة</option>
            {equipments.map((e: any) => <option key={e.id} value={e.code}>{e.code} — {e.name}</option>)}
          </select>
        </Field2>
        {eq && <EqInfo eq={eq} defaultOpen />}
        <Field2 label="عدد الساعات الحالي (اكتبه بنفسك)">
          <NumInput placeholder="اكتب عدد الساعات الحالي" value={curHours} onChange={setCurHours} />
        </Field2>
        <Field2 label="الموقع المطلوب"><input className={input} placeholder="الموقع المطلوب" value={loc} onChange={(e) => setLoc(e.target.value)} /></Field2>
        <textarea className={input} rows={2} placeholder="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Btn onClick={send} className="w-full">إرسال للمالية</Btn>
      </FormCard>
      <Section title={`طلبات الإيجار (${rentalReqs.length})`}>
        {rentalReqs.length === 0 && <Empty text="لا توجد طلبات" />}
        {rentalReqs.slice(0, 20).map((r: any) => (
          <Card key={r.id} className="flex items-center justify-between gap-2">
            <div className="text-sm">
              <ReqMeta prefix="RT" no={r.req_no} date={r.created_at} />
              <p className="font-bold">{r.equipment_name} ({r.equipment_code}) — {r.power}</p>
              <p className="text-xs text-slate-500">الموقع المطلوب: {r.location} • العداد: {r.hours_meter}{r.current_hours != null && ` • الساعات الحالية: ${r.current_hours}`}</p>
              <RejectNote reason={r.reject_reason} />
              <RowActions className="mt-2" table="rental_requests" row={r} fields={RENT_FIELDS} supabase={supabase} onUpdate={onUpdate}
                title="تعديل طلب الإيجار"
                canEdit={dept === 'general' || r.status === 'معلق_المالية'} canDelete={dept === 'general' || r.status === 'معلق_المالية'}
                confirmText="حذف طلب الإيجار نهائياً؟" />
            </div>
            <Badge status={r.status} />
          </Card>
        ))}
      </Section>
    </div>
  );
}

// ================= سجل تغييرات الزيت (تعديل / حذف + تنبيه الـ 10 أيام) =================
const daysSince = (d: any) => (d ? Math.floor((Date.now() - new Date(d).getTime()) / 86400000) : 0);

function OilLog({ oilLogs, equipments, supabase, onUpdate }: any) {
  const [q, setQ] = useState('');
  const [lim, setLim] = useState(10);
  const list = oilLogs.filter((o: any) => {
    const e = equipments.find((x: any) => x.code === o.equipment_code);
    return matches(q, o.equipment_code, e?.name, o.change_date);
  });
  return (
    <Section title={`سجل تغييرات الزيت (${list.length})`}>
      <SearchBox value={q} onChange={(v: string) => { setQ(v); setLim(10); }} placeholder="ابحث بكود المعدة أو اسمها أو التاريخ..." />
      {list.length === 0 && <Empty text="لا توجد سجلات" />}
      <div className="grid sm:grid-cols-2 gap-2.5">
        {list.slice(0, lim).map((o: any) => {
          const e = equipments.find((x: any) => x.code === o.equipment_code);
          const days = daysSince(o.change_date);
          const done = !!o.reminded_at;
          const chip = done
            ? { t: '🔔 تم التنبيه', c: 'bg-emerald-100 text-emerald-700' }
            : days >= 10
              ? { t: '⏳ التنبيه قريباً', c: 'bg-rose-100 text-rose-700' }
              : { t: `تنبيه بعد ${10 - days} يوم`, c: 'bg-amber-100 text-amber-800' };
          return (
            <Item key={o.id} collapsible accent={done ? 'slate' : days >= 10 ? 'red' : 'amber'} icon="🛢️"
              title={`${e?.name || 'معدة'} (${o.equipment_code})`}
              preview={<p>{o.change_date} • من {days} يوم</p>}
              right={<span className={`text-[11px] font-black px-2 py-1 rounded-full whitespace-nowrap ${chip.c}`}>{chip.t}</span>}
              sub={
                <div className="flex flex-wrap gap-1 pt-1">
                  <Tag label="العداد وقت التغيير" value={`${o.current_hours} س`} tone="blue" />
                  <Tag label="القادم عند" value={`${o.next_hours} س`} tone="brand" />
                  {Number(o.liters_added) > 0 && <Tag label="لترات إضافية" value={o.liters_added} tone="amber" />}
                  <Tag label="التنبيه" value={o.alert_date} />
                </div>
              }>
              <RowActions className="pt-2 border-t border-slate-100" table="oil_changes" row={o} fields={OIL_FIELDS} supabase={supabase} onUpdate={onUpdate}
                title={`تعديل تغيير الزيت (${o.equipment_code})`} confirmText={`حذف سجل تغيير الزيت بتاريخ ${o.change_date} للمعدة ${o.equipment_code}؟`} />
            </Item>
          );
        })}
      </div>
      {list.length > lim && (
        <button type="button" onClick={() => setLim(lim + 10)} className="w-full py-2 rounded-xl bg-slate-100 text-xs font-black text-slate-600 active:scale-95">
          عرض المزيد ({list.length - lim})
        </button>
      )}
    </Section>
  );
}

export default function MaintenanceView({ equipments, oilLogs, repairReqs, inventory = [], scrap = [], workshops = [], spareReqs = [], rentalReqs = [], equipmentReqs = [], supabase, onUpdate, dept }: any) {
  const [tab, setTab] = useState('oil');
  const [eqCode, setEqCode] = useState('');
  const [hours, setHours] = useState<any>('');
  const [liters, setLiters] = useState<any>('');
  const [sq, setSq] = useState('');
  const [rsq, setRsq] = useState('');
  // الحد الأدنى للساعات وعدد اللترات يُقرآن تلقائياً من إدارة المعدات
  const eqSel = equipments.find((x: any) => x.code === eqCode);
  const interval = Number(eqSel?.oil_interval_hours) || 250;
  const perLiter = Number(eqSel?.oil_liters) > 0 ? interval / Number(eqSel.oil_liters) : 0;
  const extra = Math.round(toNum(liters) * perLiter);
  const [rep, setRep] = useState<any>({ equipment_code: '', part_name: '', cost: '' });

  const pickEq = (code: string) => {
    setEqCode(code);
    const e = equipments.find((x: any) => x.code === code);
    if (e) setHours(e.hours_meter ? String(e.hours_meter) : '');
  };

  const saveOil = async () => {
    if (!eqCode) return alert('اختر المعدة');
    if (!String(hours).trim()) return alert('اكتب عداد الساعات الحالي');
    const h = toNum(hours);
    const next = h + interval + extra;
    const d = new Date();
    const alertDate = new Date(Date.now() + 10 * 86400000); // تنبيه الصيانة بعد 10 أيام
    const ok = await act(
      supabase.from('oil_changes').insert([{
        equipment_code: eqCode, current_hours: h, next_hours: next, liters_added: toNum(liters),
        change_date: d.toISOString().split('T')[0], alert_date: alertDate.toISOString().split('T')[0],
      }]),
      null
    );
    if (ok) {
      await act(supabase.from('equipment').update({ hours_meter: h }).eq('code', eqCode), onUpdate);
      alert(`تم التسجيل. تغيير الزيت القادم عند ${next} ساعة\nوسيصلك تنبيه صوتي بعد 10 أيام من اليوم`);
      setEqCode(''); setHours(''); setLiters('');
    }
  };

  const sendRepair = async () => {
    if (!rep.equipment_code || !rep.part_name) return alert('اختر المعدة واكتب القطعة');
    const ok = await act(supabase.from('repair_requests').insert([{ ...rep, cost: toNum(rep.cost), status: 'معلق_المشتريات' }]), onUpdate);
    if (ok) setRep({ equipment_code: '', part_name: '', cost: '' });
  };

  const fixed = (e: any) => act(supabase.from('equipment').update({ status: 'جاهز للعمل' }).eq('id', e.id), onUpdate);

  const pendingMk = equipmentReqs.filter((x: any) => x.status === 'معلق_الصيانة');
  const inShop = equipments.filter((e: any) => e.status === 'في المخزن للصيانة');
  const latestOil = (code: string) => oilLogs.find((o: any) => o.equipment_code === code);

  return (
    <div className="space-y-6">
      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'oil', label: '🛢️ تغيير الزيت' },
        { id: 'shop', label: 'معدات بالصيانة', count: inShop.length },
        { id: 'spare', label: '🔩 قطع الغيار', count: spareReqs.filter((s: any) => s.status === 'تم_الشراء').length },
        { id: 'mreq', label: '🤝 طلبات من التسويق', count: pendingMk.length },
        { id: 'rent', label: '🚛 طلب معدة إيجار' },
        { id: 'rep', label: '🔧 طلب إصلاح للمشتريات' },
      ]} />

      {tab === 'mreq' && <MarketingRequests equipmentReqs={equipmentReqs} equipments={equipments} supabase={supabase} onUpdate={onUpdate} />}

      {tab === 'rent' && <RentalForm equipments={equipments} rentalReqs={rentalReqs} supabase={supabase} onUpdate={onUpdate} dept={dept} />}

      {tab === 'spare' && (
        <div className="space-y-5">
          <SpareForm equipments={equipments} workshops={workshops} inventory={inventory} scrap={scrap} spareReqs={spareReqs} supabase={supabase} onUpdate={onUpdate} />
          <Section title={`طلبات قطع الغيار (${spareReqs.length})`}>
            <SearchBox value={rsq} onChange={setRsq} placeholder="ابحث بالصنف أو كود المعدة..." />
            {spareReqs.length === 0 && <Empty text="لا توجد طلبات" />}
            {spareReqs.filter((r: any) => matches(rsq, r.item_name, r.category, r.equipment_code)).slice(0, 30).map((r: any) => (
              <Card key={r.id} className="flex items-start justify-between gap-2">
                <div className="text-sm">
                  <ReqMeta prefix="SP" no={r.req_no} date={r.created_at} />
                  <p className="font-bold">{KIND_LABEL[r.kind]} — {r.item_name} × {r.qty_label || r.quantity}{r.source === 'scrap' && <span className="text-amber-700"> ♻️ خردة</span>}</p>
                  <p className="text-xs text-slate-500">{eqName(r.equipment_code)} • {new Date(r.created_at).toLocaleString('ar-EG')}</p>
                  {r.notes && <p className="text-xs text-slate-500">ملاحظات: {r.notes}</p>}
                  {r.receiver_name && <p className="text-xs text-emerald-700">المستلم: {r.receiver_name}</p>}
                  <RejectNote reason={r.reject_reason} />
                  {r.status === 'تم_الشراء' && <p className="text-xs font-bold text-emerald-700">تم شراء الصنف وإضافته للمخزن – يمكنك الآن طلب صرفه</p>}
                  <RowActions className="mt-2" table="spare_requests" row={r} fields={SPARE_FIELDS} supabase={supabase} onUpdate={onUpdate}
                    title="تعديل طلب قطعة الغيار"
                    canEdit={dept === 'general' || r.status === 'معلق_المخزن'} canDelete={dept === 'general' || r.status === 'معلق_المخزن'}
                    confirmText={`حذف طلب (${r.item_name}) نهائياً؟`} />
                </div>
                <Badge status={r.status} />
              </Card>
            ))}
          </Section>
        </div>
      )}

      {tab === 'oil' && (
        <div className="space-y-5">
          <FormCard title="تسجيل تغيير زيت" icon="🛢️">
            <select className={input} value={eqCode} onChange={(e) => pickEq(e.target.value)}>
              <option value="">اختر المعدة</option>
              {equipments.map((e: any) => <option key={e.id} value={e.code}>{e.code} — {e.name}</option>)}
            </select>
            {eqSel && <EqInfo eq={eqSel} />}
            <NumInput placeholder="عداد الساعات الحالي" value={hours} onChange={setHours} />
            {eqSel && (
              <div className="p-2 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 space-y-0.5">
                <p>الحد الأدنى لتغيير الزيت: <b>{interval} ساعة</b> • لترات المعدة: <b>{Number(eqSel.oil_liters) || 0}</b></p>
                {perLiter > 0 && <p>كل لتر يعادل تقريباً <b>{Math.round(perLiter)}</b> ساعة تشغيل</p>}
              </div>
            )}
            <NumInput placeholder="لترات زيت إضافية تم تزويد المعدة بها بعد التغيير (اختياري)" value={liters} onChange={setLiters} />
            {eqSel && <p className="text-xs font-black text-brand-dark">التغيير القادم عند {toNum(hours) + interval + extra} ساعة{extra > 0 && ` (شامل +${extra} ساعة من اللترات الإضافية)`}</p>}
            <Btn color="red" onClick={saveOil} className="w-full">تسجيل وتوليد العداد القادم</Btn>
          </FormCard>

          <Section title="حالة الزيت للمعدات">
            <SearchBox value={sq} onChange={setSq} placeholder="ابحث بكود المعدة أو اسمها..." />
            {equipments.length === 0 && <Empty text="لا توجد معدات" />}
            <div className="grid sm:grid-cols-2 gap-2.5">
              {equipments.filter((e: any) => matches(sq, e.code, e.name, e.equip_type)).map((e: any) => {
                const o = latestOil(e.code);
                if (!o) return (
                  <Item key={e.id} accent="slate" icon="🛢️" title={`${e.name} (${e.code})`} right={<span className="text-xs text-slate-400 font-bold">لا يوجد سجل</span>} />
                );
                const left = o.next_hours - (e.hours_meter || 0);
                const due = left <= 25;
                const pct = Math.max(0, Math.min(100, (left / (Number(e.oil_interval_hours) || 250)) * 100));
                return (
                  <Item key={e.id} collapsible accent={due ? 'red' : 'brand'} icon="🛢️" title={`${e.name} (${e.code})`}
                    right={<span className={`text-[11px] font-black px-2 py-1 rounded-full ${due ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{left <= 0 ? '⏰ مستحق الآن' : `متبقي ${left} ساعة`}</span>}
                    sub={<p>القادم عند {o.next_hours} ساعة • العداد الحالي {e.hours_meter || 0}</p>}>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden mb-2">
                      <div className={`h-full rounded-full ${due ? 'bg-rose-500' : 'bg-brand'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <RowActions table="oil_changes" row={o} fields={OIL_FIELDS} supabase={supabase} onUpdate={onUpdate}
                      title={`تعديل آخر تغيير زيت (${e.code})`} confirmText={`حذف آخر تسجيل تغيير زيت للمعدة ${e.code}؟`} />
                  </Item>
                );
              })}
            </div>
          </Section>

          <OilLog oilLogs={oilLogs} equipments={equipments} supabase={supabase} onUpdate={onUpdate} />
        </div>
      )}

      {tab === 'shop' && (
        <Section title="المعدات الموجودة للصيانة">
          {inShop.length === 0 && <Empty text="لا توجد معدات بالصيانة" />}
          {inShop.map((e: any) => (
            <Item key={e.id} accent="red" icon="🔧" title={`${e.name} (${e.code})`}
              sub={<p>{e.equip_type && `${e.equip_type} • `}{e.power} • {e.location}</p>}
              right={<Btn onClick={() => fixed(e)} className="!py-1.5 !px-3 text-xs">✅ تم الإصلاح</Btn>} />
          ))}
        </Section>
      )}

      {tab === 'rep' && (
        <div className="space-y-5">
          <FormCard title="طلب إصلاح / قطعة غيار (يصل للمشتريات وتحوّله للمالية)" icon="🔧">
            <select className={input} value={rep.equipment_code} onChange={(e) => setRep({ ...rep, equipment_code: e.target.value })}>
              <option value="">اختر المعدة</option>
              <optgroup label="⚡ المعدات">
                {equipments.map((e: any) => <option key={e.id} value={e.code}>{e.name} ({e.code})</option>)}
              </optgroup>
              <optgroup label="🏭 أقسام الورشة">
                {(workshops.length ? workshops : WORKSHOP_DEFAULTS).map((w: any) => <option key={w.code} value={w.code}>{w.icon} {w.name}</option>)}
              </optgroup>
            </select>
            {rep.equipment_code && <EqInfo code={rep.equipment_code} equipments={equipments} />}
            <input className={input} placeholder="اسم القطعة / العطل" value={rep.part_name} onChange={(e) => setRep({ ...rep, part_name: e.target.value })} />
            <NumInput placeholder="التكلفة المتوقعة" value={rep.cost} onChange={(v: string) => setRep({ ...rep, cost: v })} />
            <Btn onClick={sendRepair} className="w-full">إرسال للمشتريات</Btn>
          </FormCard>
          <Section title={`طلباتي (${repairReqs.length})`}>
            {repairReqs.length === 0 && <Empty text="لا توجد طلبات" />}
            {repairReqs.slice(0, 20).map((r: any) => (
              <Card key={r.id} className="flex items-center justify-between gap-2">
                <div>
                  <ReqMeta prefix="RP" no={r.req_no} date={r.created_at} />
                  <p className="font-bold text-sm">{r.part_name} — {eqName(r.equipment_code)} ({money(r.cost)} ج.م)</p>
                  <RejectNote reason={r.reject_reason} />
                  <RowActions className="mt-2" table="repair_requests" row={r} supabase={supabase} onUpdate={onUpdate}
                    title="تعديل طلب الإصلاح"
                    fields={[
                      { key: 'equipment_code', label: 'المعدة', type: 'select', options: [...equipments.map((e: any) => e.code), ...(workshops.length ? workshops : WORKSHOP_DEFAULTS).map((w: any) => w.code)] },
                      { key: 'part_name', label: 'اسم القطعة / العطل', required: true },
                      { key: 'cost', label: 'التكلفة المتوقعة', type: 'number' },
                    ]}
                    canEdit={dept === 'general' || r.status === 'معلق_المشتريات'} canDelete={dept === 'general' || r.status === 'معلق_المشتريات'}
                    confirmText={`حذف طلب الإصلاح (${r.part_name}) نهائياً؟`} />
                </div>
                <Badge status={r.status} />
              </Card>
            ))}
          </Section>
        </div>
      )}
    </div>
  );
}