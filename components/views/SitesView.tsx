'use client';
import React, { useState } from 'react';
import { Btn, Empty, Item, Tag, Stat, FormCard, Field2, SearchBox, Section, RowActions, EditModal, act, input, norm, toEn, matches } from '../ui';

const SITE_FIELDS: any[] = [
  { key: 'name', label: 'اسم الموقع', required: true },
  { key: 'start_date', label: 'تاريخ بداية الموقع (سنة-شهر-يوم، مثال 2026-10-30)', nullable: true },
  { key: 'operator_name', label: 'اسم المشغل', nullable: true },
  { key: 'operator_phone', label: 'رقم المشغل', nullable: true },
  { key: 'notes', label: 'ملاحظات الموقع', type: 'textarea', nullable: true },
];

const BLANK = { name: '', start_date: '', operator_name: '', operator_phone: '', notes: '' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const statusTone = (s: string) => (s === 'مؤجر' ? 'amber' : s === 'جاهز للعمل' ? 'brand' : 'red');
const daysSince = (d: any) => (d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0);

export default function SitesView({ sites = [], equipments = [], supabase, onUpdate }: any) {
  const [f, setF] = useState<any>(BLANK);
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  // ربط المعدات بالموقع: اسم موقع المعدة في إدارة المعدات = اسم الموقع
  const eqOf = (s: any) => equipments.filter((e: any) => norm(e.location) === norm(s.name));
  const siteKeys = new Set(sites.map((s: any) => norm(s.name)));
  const unassigned = equipments.filter((e: any) => !siteKeys.has(norm(e.location)));
  const assigned = equipments.length - unassigned.length;

  const add = async () => {
    const name = f.name.trim();
    if (!name) return alert('اكتب اسم الموقع');
    if (sites.some((s: any) => norm(s.name) === norm(name))) return alert('اسم الموقع مسجّل من قبل');
    setBusy(true);
    const ok = await act(
      supabase.from('work_sites').insert([{
        name,
        start_date: f.start_date || null,
        operator_name: f.operator_name.trim() || null,
        operator_phone: toEn(f.operator_phone).trim() || null,
        notes: f.notes.trim() || null,
      }]),
      onUpdate
    );
    setBusy(false);
    if (ok) setF(BLANK);
  };

  const saveEdit = async (v: any) => {
    const s = editing;
    const name = String(v.name).trim();
    const renamed = name !== String(s.name).trim();
    if (renamed && sites.some((x: any) => x.id !== s.id && norm(x.name) === norm(name))) { alert('اسم الموقع مسجّل من قبل'); return false; }
    const date = v.start_date ? toEn(v.start_date).trim() : null;
    if (date && !DATE_RE.test(date)) { alert('التاريخ لازم يكون بالشكل 2026-10-30'); return false; }
    if (renamed) {
      // دالة في قاعدة البيانات تغيّر الاسم وتحدّث موقع المعدات المرتبطة بنفس الاسم
      const { error } = await supabase.rpc('rename_work_site', { p_id: s.id, p_name: name });
      if (error) { alert('حدث خطأ: ' + (error.message || 'غير معروف')); return false; }
    }
    const { data, error } = await supabase.from('work_sites').update({
      start_date: date,
      operator_name: v.operator_name || null,
      operator_phone: v.operator_phone ? toEn(v.operator_phone).trim() : null,
      notes: v.notes || null,
    }).eq('id', s.id).select('id');
    if (error) { alert('حدث خطأ: ' + (error.message || 'غير معروف')); return false; }
    if (!data || data.length === 0) { alert('ليس لديك صلاحية على هذا السجل'); return false; }
    onUpdate?.();
    return true;
  };

  const list = sites.filter((s: any) => matches(q, s.name, s.operator_name, s.operator_phone, s.notes));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-2.5">
        <Stat icon="📍" label="عدد المواقع" value={sites.length} tone="violet" />
        <Stat icon="⚡" label="معدات في مواقع" value={assigned} />
        <Stat icon="❓" label="بدون موقع مسجّل" value={unassigned.length} tone={unassigned.length ? 'amber' : 'brand'} />
      </div>

      <FormCard title="إضافة موقع عمل جديد" icon="📍">
        <div className="grid sm:grid-cols-2 gap-3">
          <Field2 label="اسم الموقع"><input className={input} placeholder="اسم الموقع" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field2>
          <Field2 label="تاريخ بداية الموقع"><input className={input} type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></Field2>
          <Field2 label="اسم المشغل"><input className={input} placeholder="اسم المشغل في الموقع" value={f.operator_name} onChange={(e) => setF({ ...f, operator_name: e.target.value })} /></Field2>
          <Field2 label="رقم المشغل"><input className={input} inputMode="tel" dir="ltr" placeholder="01xxxxxxxxx" value={f.operator_phone} onChange={(e) => setF({ ...f, operator_phone: e.target.value })} /></Field2>
          <Field2 label="ملاحظات الموقع" className="sm:col-span-2">
            <textarea className={input} rows={2} placeholder="أي ملاحظات عن الموقع..." value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
          </Field2>
        </div>
        <p className="text-[11px] text-slate-500">المعدات بتظهر داخل الموقع تلقائياً لما يكون «موقع المعدة» في إدارة المعدات مطابق لاسم الموقع.</p>
        <Btn onClick={add} disabled={busy} className="w-full">حفظ الموقع</Btn>
      </FormCard>

      <div className="space-y-3">
        <h4 className="font-black text-slate-800">مواقع العمل ({list.length})</h4>
        <SearchBox value={q} onChange={setQ} placeholder="ابحث باسم الموقع أو المشغل أو رقمه..." />
        {list.length === 0 && <Empty text="لا توجد مواقع" />}
        <div className="grid sm:grid-cols-2 gap-2.5 items-start">
          {list.map((s: any) => {
            const eqs = eqOf(s);
            return (
              <Item
                key={s.id}
                collapsible
                accent={eqs.length ? 'violet' : 'slate'}
                icon="📍"
                title={s.name}
                preview={<p>{eqs.length} معدة{s.operator_name ? ` • المشغل: ${s.operator_name}` : ''}</p>}
                right={<span className="px-2.5 py-1 text-[11px] font-black rounded-full whitespace-nowrap bg-violet-100 text-violet-800">{eqs.length} معدة</span>}
                sub={
                  <div className="space-y-1.5 pt-1">
                    <div className="flex flex-wrap gap-1">
                      {s.start_date && <Tag label="بداية الموقع" value={new Date(s.start_date).toLocaleDateString('ar-EG')} tone="blue" />}
                      {s.start_date && <Tag label="مدة العمل" value={`${daysSince(s.start_date)} يوم`} tone="violet" />}
                      {s.operator_name && <Tag label="المشغل" value={s.operator_name} tone="brand" />}
                    </div>
                    {s.operator_phone && (
                      <a href={`tel:${s.operator_phone}`} dir="ltr" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-black">
                        📞 {s.operator_phone}
                      </a>
                    )}
                    {s.notes && <p className="text-xs text-slate-700 whitespace-pre-line bg-slate-50 rounded-lg p-2 border border-slate-100">📝 {s.notes}</p>}
                  </div>
                }
              >
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <p className="text-[11px] font-black text-slate-500">المعدات في الموقع ({eqs.length})</p>
                  {eqs.length === 0 && <p className="text-[11px] text-slate-400">لا توجد معدات مربوطة بهذا الموقع — اكتب اسم الموقع في خانة «الموقع» للمعدة من إدارة المعدات</p>}
                  {eqs.map((e: any) => (
                    <div key={e.id} className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-100 px-2.5 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">
                          ⚡ {e.name} <span dir="ltr" className="text-[11px] font-black text-brand-dark bg-brand-light rounded-md px-1.5 py-0.5 mr-1">{e.code}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{[e.equip_type, e.power].filter(Boolean).join(' • ')}</p>
                      </div>
                      <Tag value={e.status} tone={statusTone(e.status)} />
                    </div>
                  ))}
                  <div className="flex gap-1.5 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setEditing(s)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold transition active:scale-95 bg-slate-100 hover:bg-slate-200 text-slate-700">✏️ تعديل</button>
                    <RowActions table="work_sites" row={s} canEdit={false} supabase={supabase} onUpdate={onUpdate}
                      confirmText={`حذف الموقع ${s.name} نهائياً؟${eqs.length ? ` (المعدات الـ ${eqs.length} المسجلة فيه هتفضل موجودة في إدارة المعدات)` : ''}`} />
                  </div>
                </div>
              </Item>
            );
          })}
        </div>
      </div>

      {unassigned.length > 0 && (
        <Section title={`معدات بدون موقع مسجّل (${unassigned.length})`}>
          <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
            {unassigned.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between gap-2 text-sm px-3 py-2.5">
                <span className="min-w-0 truncate font-semibold">⚡ {e.name} <span dir="ltr" className="text-[11px] text-slate-400">{e.code}</span></span>
                <span className="text-[11px] text-slate-500 shrink-0">{e.location || 'بدون موقع'}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      {editing && (
        <EditModal title={`تعديل موقع ${editing.name}`} row={editing} fields={SITE_FIELDS} onSave={saveEdit} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}