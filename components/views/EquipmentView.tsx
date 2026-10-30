'use client';
import React, { useState } from 'react';
import { WORKSHOP_DEFAULTS, Section, Btn, Empty, RowActions, Stat, Item, Tag, FormCard, Field2, SearchBox, Chips, NumInput, act, input, toNum, matches } from '../ui';

const STATUSES = ['مؤجر', 'جاهز للعمل', 'في المخزن للصيانة'];
const DEFAULT_TYPES = ['مولد كهرباء', 'كمبروسر', 'ونش', 'برج إنارة', 'لودر'];

const EQ_FIELDS: any[] = [
  { key: 'code', label: 'الكود', required: true },
  { key: 'name', label: 'اسم المعدة', required: true },
  { key: 'equip_type', label: 'نوع المعدة', nullable: true },
  { key: 'power', label: 'القدرة (KVA)', required: true },
  { key: 'location', label: 'الموقع', required: true },
  { key: 'hours_meter', label: 'عداد الساعات', type: 'number' },
  { key: 'oil_interval_hours', label: 'الحد الأدنى لساعات تغيير الزيت', type: 'number' },
  { key: 'oil_liters', label: 'عدد لترات الزيت للمعدة', type: 'number' },
  { key: 'details', label: 'تفاصيل المعدة (ماركة، موديل، رقم تسلسلي، ملاحظات...)', type: 'textarea', nullable: true },
];

const WS_FIELDS: any[] = [
  { key: 'name', label: 'اسم القسم', required: true },
  { key: 'notes', label: 'ملاحظات القسم', type: 'textarea', nullable: true },
];
const WS_OPEN = ['معلق_المخزن', 'محوّل_للمشتريات', 'جاري_الشراء', 'متوقف_المالية'];

const BLANK = { code: '', name: '', equip_type: '', power: '', location: '', status: 'جاهز للعمل', hours_meter: '', oil_interval_hours: '', oil_liters: '', details: '' };

const tone = (s: string) => (s === 'مؤجر' ? 'bg-amber-100 text-amber-800' : s === 'جاهز للعمل' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800');
const accent = (s: string) => (s === 'مؤجر' ? 'amber' : s === 'جاهز للعمل' ? 'brand' : 'red');

export default function EquipmentView({ equipments, sites = [], workshops = [], spareReqs = [], supabase, onUpdate }: any) {
  const [f, setF] = useState<any>(BLANK);
  const [q, setQ] = useState('');
  const [st, setSt] = useState('all');
  const [tp, setTp] = useState('all');

  const types = Array.from(new Set([...DEFAULT_TYPES, ...equipments.map((e: any) => e.equip_type).filter(Boolean)])) as string[];
  const usedTypes = Array.from(new Set(equipments.map((e: any) => e.equip_type).filter(Boolean))) as string[];

  const add = async () => {
    if (!f.code.trim() || !f.name.trim() || !String(f.power).trim() || !f.location.trim()) return alert('الكود والاسم والقدرة والموقع مطلوبين');
    if (equipments.some((e: any) => (e.code || '').trim().toLowerCase() === f.code.trim().toLowerCase())) return alert('هذا الكود مسجّل من قبل');
    const row = {
      code: f.code.trim(), name: f.name.trim(), equip_type: f.equip_type.trim() || null, power: String(f.power).trim(), location: f.location.trim(),
      status: f.status, hours_meter: toNum(f.hours_meter), oil_interval_hours: toNum(f.oil_interval_hours) || 250, oil_liters: toNum(f.oil_liters), details: f.details.trim() || null,
    };
    const ok = await act(supabase.from('equipment').insert([row]), onUpdate);
    if (ok) setF(BLANK);
  };

  const setStatus = (id: string, status: string) => act(supabase.from('equipment').update({ status }).eq('id', id), onUpdate);

  const order: Record<string, number> = { 'مؤجر': 1, 'جاهز للعمل': 2, 'في المخزن للصيانة': 3 };
  const list = equipments
    .filter((e: any) => (st === 'all' || e.status === st) && (tp === 'all' || e.equip_type === tp) && matches(q, e.code, e.name, e.location, e.equip_type, e.power))
    .sort((a: any, b: any) => (order[a.status] || 99) - (order[b.status] || 99) || String(a.code).localeCompare(String(b.code), 'en', { numeric: true }));

  const by = (s: string) => equipments.filter((e: any) => e.status === s).length;
  const interval = toNum(f.oil_interval_hours), liters = toNum(f.oil_liters);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat icon="🚛" label="مؤجر" value={by('مؤجر')} tone="amber" />
        <Stat icon="✅" label="جاهز" value={by('جاهز للعمل')} />
        <Stat icon="🔧" label="بالصيانة" value={by('في المخزن للصيانة')} tone="red" />
      </div>

      <Section title="🏭 أقسام الورشة" defaultOpen>
        <p className="text-[11px] text-slate-500">بتظهر كخيار في طلبات الصرف والخردة والإصلاح من الصيانة وبتوصل للمخزن والمشتريات والمالية زي المعدة، وتكلفتها عند المدير العام.</p>
        <div className="grid sm:grid-cols-3 gap-2.5 items-start">
          {(workshops.length ? workshops : WORKSHOP_DEFAULTS).map((w: any) => {
            const reqs = spareReqs.filter((r: any) => r.equipment_code === w.code);
            const open = reqs.filter((r: any) => WS_OPEN.includes(r.status)).length;
            return (
              <Item key={w.code} accent="violet" icon={w.icon || '🏭'} title={w.name}
                preview={<p>{reqs.length} طلب قطع غيار • {open} جاري</p>}
                sub={w.notes ? <p className="text-xs text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-2 border border-slate-100">📝 {w.notes}</p> : <p className="text-[11px] text-slate-400">لا توجد ملاحظات — اضغط تعديل لإضافتها</p>}>
                {w.id
                  ? <RowActions table="workshop_units" row={w} fields={WS_FIELDS} canDelete={false} supabase={supabase} onUpdate={onUpdate} title={`تعديل ${w.name}`} />
                  : <p className="text-[11px] text-amber-700">شغّل ملف update_workshops.sql لتفعيل التعديل</p>}
              </Item>
            );
          })}
        </div>
      </Section>

      <FormCard title="إضافة معدة جديدة" icon="⚡">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field2 label="الكود"><input className={input} placeholder="مثال: G-101" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field2>
          <Field2 label="اسم المعدة"><input className={input} placeholder="اسم المعدة" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field2>
          <Field2 label="نوع المعدة">
            <input className={input} list="eq-types" placeholder="اختر أو اكتب نوع جديد" value={f.equip_type} onChange={(e) => setF({ ...f, equip_type: e.target.value })} />
            <datalist id="eq-types">{types.map((t) => <option key={t} value={t} />)}</datalist>
          </Field2>
          <Field2 label="القدرة (KVA)"><input className={input} placeholder="القدرة" value={f.power} onChange={(e) => setF({ ...f, power: e.target.value })} /></Field2>
          <Field2 label="الموقع">
            <input className={input} list="eq-sites" placeholder="اختر موقع العمل أو اكتب" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} />
            <datalist id="eq-sites">{sites.map((s: any) => <option key={s.id} value={s.name} />)}</datalist>
          </Field2>
          <Field2 label="الحالة">
            <select className={input} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </Field2>
          <Field2 label="عداد الساعات"><NumInput placeholder="اكتب عدد الساعات" value={f.hours_meter} onChange={(v: string) => setF({ ...f, hours_meter: v })} /></Field2>
          <Field2 label="الحد الأدنى لساعات تغيير الزيت"><NumInput placeholder="مثال: 250" value={f.oil_interval_hours} onChange={(v: string) => setF({ ...f, oil_interval_hours: v })} /></Field2>
          <Field2 label="عدد لترات الزيت للمعدة"><NumInput placeholder="عدد اللترات" value={f.oil_liters} onChange={(v: string) => setF({ ...f, oil_liters: v })} /></Field2>
          <Field2 label="تفاصيل المعدة (تظهر تلقائياً مع الكود في كل الأقسام)" className="sm:col-span-2">
            <textarea className={input} rows={3} placeholder="الماركة، موديل المحرك، الرقم التسلسلي، سنة الصنع، أي ملاحظات..." value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} />
          </Field2>
          {liters > 0 && (
            <p className="text-xs font-bold text-brand-dark self-end pb-2">كل لتر زيت يعادل تقريباً {Math.round((interval || 250) / liters)} ساعة تشغيل</p>
          )}
        </div>
        <Btn color="amber" onClick={add} className="w-full">إضافة المعدة</Btn>
      </FormCard>

      <div className="space-y-2">
        <SearchBox value={q} onChange={setQ} placeholder="ابحث بالكود أو الاسم أو الموقع أو النوع..." />
        <Chips value={st} onChange={setSt} options={[{ id: 'all', label: 'كل الحالات', count: equipments.length }, ...STATUSES.map((s) => ({ id: s, label: s, count: by(s) }))]} />
        {usedTypes.length > 0 && (
          <Chips value={tp} onChange={setTp} options={[{ id: 'all', label: 'كل الأنواع' }, ...usedTypes.map((t) => ({ id: t, label: t, count: equipments.filter((e: any) => e.equip_type === t).length }))]} />
        )}
      </div>

      <div className="space-y-2.5">
        <h4 className="font-black text-slate-800">قائمة المعدات ({list.length} من {equipments.length})</h4>
        {list.length === 0 && <Empty text="لا توجد معدات مطابقة" />}
        <div className="grid sm:grid-cols-2 gap-2.5">
          {list.map((eq: any) => (
            <Item
              key={eq.id}
              collapsible
              accent={accent(eq.status)}
              icon="⚡"
              title={<>{eq.name} <span className="text-[11px] font-black text-brand-dark bg-brand-light rounded-md px-1.5 py-0.5 mr-1" dir="ltr">{eq.code}</span></>}
              preview={<p>{[eq.equip_type, eq.power, eq.location].filter(Boolean).join(' • ')}</p>}
              right={<span className={`px-2.5 py-1 text-[11px] font-black rounded-full whitespace-nowrap ${tone(eq.status)}`}>{eq.status === 'جاهز للعمل' ? 'جاهز' : eq.status === 'مؤجر' ? 'مؤجر' : 'بالصيانة'}</span>}
              sub={
                <div className="space-y-1.5 pt-1">
                  <div className="flex flex-wrap gap-1">
                    {eq.equip_type && <Tag tone="violet" value={eq.equip_type} />}
                    <Tag label="القدرة" value={eq.power} />
                    <Tag label="الموقع" value={eq.location} />
                    <Tag label="العداد" value={`${eq.hours_meter ?? 0} س`} tone="blue" />
                    <Tag label="زيت كل" value={`${eq.oil_interval_hours || 250} س${Number(eq.oil_liters) > 0 ? ` • ${eq.oil_liters} لتر` : ''}`} tone="amber" />
                  </div>
                  <p className="text-xs text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-2 border border-slate-100">
                    📋 {eq.details || 'لا توجد تفاصيل مسجلة — اضغط تعديل لإضافتها'}
                  </p>
                </div>
              }
            >
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <select value={eq.status} onChange={(e) => setStatus(eq.id, e.target.value)} className={`px-2.5 py-1.5 text-xs font-black rounded-full border-0 outline-none ${tone(eq.status)}`}>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                <RowActions table="equipment" row={eq} fields={EQ_FIELDS} supabase={supabase} onUpdate={onUpdate}
                  title="تعديل المعدة" confirmText={`حذف المعدة ${eq.name} (${eq.code}) نهائياً؟`} />
              </div>
            </Item>
          ))}
        </div>
      </div>
    </div>
  );
}