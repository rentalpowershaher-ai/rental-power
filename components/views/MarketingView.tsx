'use client';
import React, { useState } from 'react';
import { RejectNote, EqInfo, Btn, Badge, Card, Empty, Section, Stat, Item, Tag, Tabs, FormCard, Field2, SearchBox, Chips, RowActions, ReqMeta, act, input, matches } from '../ui';

const OTHER = '__other__';
const BLANK = { code: '', equip_type: '', power: '', location: '', needed_date: '', notes: '' };
const REQ_FIELDS: any[] = [
  { key: 'location', label: 'الموقع المطلوب', required: true },
  { key: 'notes', label: 'ملاحظات', type: 'textarea', nullable: true },
];

export default function MarketingView({ equipments, equipmentReqs = [], supabase, onUpdate, dept }: any) {
  const [tab, setTab] = useState('ready');
  const [q, setQ] = useState('');
  const [tp, setTp] = useState('all');
  const [st, setSt] = useState('all');
  const [f, setF] = useState<any>(BLANK);
  const [busy, setBusy] = useState(false);

  // التسويق يشوف كل المعدات، لكن الطلب يكون من الجاهزة للعمل فقط
  const READY = 'جاهز للعمل';
  const STATUSES = ['جاهز للعمل', 'مؤجر', 'في المخزن للصيانة'];
  const ready = equipments.filter((e: any) => e.status === READY);
  const types = Array.from(new Set(equipments.map((e: any) => e.equip_type).filter(Boolean))) as string[];
  const list = equipments
    .filter((e: any) => (st === 'all' || e.status === st) && (tp === 'all' || e.equip_type === tp) && matches(q, e.code, e.name, e.location, e.power, e.equip_type))
    .sort((a: any, b: any) => (a.status === READY ? 0 : 1) - (b.status === READY ? 0 : 1) || String(a.code).localeCompare(String(b.code), 'en', { numeric: true }));
  const by = (s: string) => equipments.filter((e: any) => e.status === s).length;
  const accent = (s: string) => (s === 'مؤجر' ? 'amber' : s === READY ? 'brand' : 'red');
  const tone = (s: string) => (s === 'مؤجر' ? 'bg-amber-100 text-amber-800' : s === READY ? 'bg-brand text-white' : 'bg-rose-100 text-rose-800');

  const eq = ready.find((e: any) => e.code === f.code);
  const isOther = f.code === OTHER;
  const pending = equipmentReqs.filter((r: any) => r.status === 'معلق_الصيانة');

  const send = async () => {
    if (!f.code) return alert('اختر المعدة أو "معدة أخرى حسب المواصفات"');
    if (isOther && !f.equip_type.trim() && !f.power.trim()) return alert('اكتب نوع المعدة أو القدرة المطلوبة');
    if (!f.location.trim()) return alert('اكتب الموقع المطلوب');
    setBusy(true);
    const ok = await act(
      supabase.from('equipment_requests').insert([{
        equipment_code: eq?.code ?? null, equipment_name: eq?.name ?? null,
        equip_type: eq ? eq.equip_type ?? null : f.equip_type.trim() || null,
        power: eq ? eq.power ?? null : f.power.trim() || null,
        location: f.location.trim(), needed_date: f.needed_date || null, notes: f.notes.trim() || null,
        requested_by: dept, status: 'معلق_الصيانة',
      }]),
      onUpdate
    );
    setBusy(false);
    if (ok) { setF(BLANK); alert('تم إرسال الطلب للصيانة'); }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat icon="✅" label="جاهز للتأجير" value={ready.length} />
        <Stat icon="🚛" label="مؤجر" value={by('مؤجر')} tone="amber" />
        <Stat icon="🔧" label="بالصيانة" value={by('في المخزن للصيانة')} tone="red" />
      </div>

      <Tabs value={tab} onChange={setTab} tabs={[
        { id: 'ready', label: '⚡ المعدات' },
        { id: 'req', label: '🚛 طلب معدة من الصيانة', count: 0 },
        { id: 'mine', label: 'طلباتي', count: pending.length },
      ]} />

      {tab === 'ready' && (
        <div className="space-y-4">
          <div className="space-y-2">
            <SearchBox value={q} onChange={setQ} placeholder="ابحث بالكود أو الاسم أو القدرة أو الموقع..." />
            <Chips value={st} onChange={setSt} options={[{ id: 'all', label: 'كل الحالات', count: equipments.length }, ...STATUSES.map((s) => ({ id: s, label: s, count: by(s) }))]} />
            {types.length > 0 && <Chips value={tp} onChange={setTp} options={[{ id: 'all', label: 'كل الأنواع' }, ...types.map((t) => ({ id: t, label: t, count: equipments.filter((e: any) => e.equip_type === t).length }))]} />}
          </div>
          <h3 className="font-black text-slate-800">المعدات ({list.length} من {equipments.length})</h3>
          {list.length === 0 && <Empty text="لا توجد معدات مطابقة" />}
          <div className="grid sm:grid-cols-2 gap-3">
            {list.map((e: any) => (
              <Item key={e.id} collapsible accent={accent(e.status)} icon="⚡"
                preview={<p>{[e.equip_type, e.power, e.location].filter(Boolean).join(' • ')}</p>}
                title={<>{e.name} <span className="text-[11px] font-black text-brand-dark bg-brand-light rounded-md px-1.5 py-0.5 mr-1" dir="ltr">{e.code}</span></>}
                sub={<div className="flex flex-wrap gap-1 pt-1">{e.equip_type && <Tag tone="violet" value={e.equip_type} />}<Tag label="القدرة" value={e.power} /><Tag label="الموقع" value={e.location} /><Tag label="العداد" value={`${e.hours_meter ?? 0} س`} tone="blue" /></div>}
                right={<span className={`px-2.5 py-1 font-black text-[11px] rounded-full whitespace-nowrap ${tone(e.status)}`}>{e.status === READY ? 'جاهز' : e.status === 'مؤجر' ? 'مؤجر' : 'بالصيانة'}</span>}>
                <EqInfo eq={e} defaultOpen className="mb-2" />
                {e.status === READY
                  ? <Btn onClick={() => { setF({ ...BLANK, code: e.code }); setTab('req'); }} className="!py-1.5 !px-3 text-xs w-full">🚛 اطلب هذه المعدة</Btn>
                  : <p className="text-[11px] font-bold text-slate-400 text-center">غير متاحة للطلب حالياً</p>}
              </Item>
            ))}
          </div>
        </div>
      )}

      {tab === 'req' && (
        <FormCard title="طلب معدة من الصيانة (تجهّزها وتحوّلها للمالية)" icon="🚛">
          <Field2 label="المعدة">
            <select className={input} value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })}>
              <option value="">اختر المعدة</option>
              {ready.map((e: any) => <option key={e.id} value={e.code}>{e.code} — {e.name}{e.power ? ` (${e.power})` : ''}</option>)}
              <option value={OTHER}>➕ معدة أخرى حسب المواصفات</option>
            </select>
          </Field2>
          {eq && <EqInfo eq={eq} defaultOpen />}
          {isOther && (
            <div className="grid sm:grid-cols-2 gap-3">
              <Field2 label="نوع المعدة"><input className={input} list="mk-types" placeholder="مثال: مولد كهرباء" value={f.equip_type} onChange={(e) => setF({ ...f, equip_type: e.target.value })} /><datalist id="mk-types">{types.map((t) => <option key={t} value={t} />)}</datalist></Field2>
              <Field2 label="القدرة المطلوبة (KVA)"><input className={input} placeholder="القدرة" value={f.power} onChange={(e) => setF({ ...f, power: e.target.value })} /></Field2>
            </div>
          )}
          <Field2 label="الموقع المطلوب / العميل"><input className={input} placeholder="الموقع المطلوب" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field2>
          <Field2 label="تاريخ التسليم المطلوب (اختياري)"><input className={input} type="date" value={f.needed_date} onChange={(e) => setF({ ...f, needed_date: e.target.value })} /></Field2>
          <textarea className={input} rows={2} placeholder="ملاحظات للصيانة (اختياري)" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          <Btn onClick={send} disabled={busy} className="w-full">إرسال للصيانة</Btn>
        </FormCard>
      )}

      {tab === 'mine' && (
        <Section title={`طلباتي (${equipmentReqs.length})`}>
          {equipmentReqs.length === 0 && <Empty text="لا توجد طلبات" />}
          {equipmentReqs.slice(0, 30).map((r: any) => {
            const open = r.status === 'معلق_الصيانة';
            return (
              <Card key={r.id} className="flex items-start justify-between gap-2">
                <div className="text-sm min-w-0">
                  <ReqMeta no={r.req_no} date={r.created_at} />
                  <p className="font-bold">{r.equipment_name ? `${r.equipment_name} (${r.equipment_code})` : `${r.equip_type || 'معدة'}${r.power ? ` — ${r.power}` : ''}`}</p>
                  {r.equipment_code && <EqInfo code={r.equipment_code} equipments={equipments} className="my-1.5" />}
                  <p className="text-xs text-slate-500">الموقع المطلوب: {r.location}{r.needed_date && ` • التسليم: ${new Date(r.needed_date).toLocaleDateString('ar-EG')}`}</p>
                  <RejectNote reason={r.reject_reason} by="الصيانة" />
                  <RowActions className="mt-2" table="equipment_requests" row={r} fields={REQ_FIELDS} supabase={supabase} onUpdate={onUpdate}
                    title="تعديل الطلب" canEdit={dept === 'general' || open} canDelete={dept === 'general' || open}
                    confirmText="حذف طلب المعدة نهائياً؟" />
                </div>
                <Badge status={r.status} />
              </Card>
            );
          })}
        </Section>
      )}
    </div>
  );
}