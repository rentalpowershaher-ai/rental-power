'use client';
import React, { useState } from 'react';
import { Btn, Card, Empty, RowActions, Item, Tag, Stat, FormCard, Field2, SearchBox, NumInput, act, input, money, toNum, matches } from '../ui';

const blank = { name: '', national_id: '', location: '', base_salary: '', site_allowance: '', transport: '', deductions: '', loans: '' };
const NUMS = ['base_salary', 'site_allowance', 'transport', 'deductions', 'loans'];
const HR_FIELDS: any[] = [
  { key: 'name', label: 'اسم الموظف', required: true },
  { key: 'national_id', label: 'الرقم القومي' },
  { key: 'location', label: 'موقع العمل' },
  { key: 'base_salary', label: 'الراتب الأساسي', type: 'number' },
  { key: 'site_allowance', label: 'بدل موقع', type: 'number' },
  { key: 'transport', label: 'بدل انتقالات', type: 'number' },
  { key: 'deductions', label: 'خصومات', type: 'number' },
  { key: 'loans', label: 'سلف', type: 'number' },
];
const net = (e: any) => Number(e.base_salary) + Number(e.site_allowance || 0) + Number(e.transport || 0) - Number(e.deductions || 0) - Number(e.loans || 0);

export default function HrView({ employees, supabase, onUpdate }: any) {
  const [f, setF] = useState<any>(blank);
  const [slip, setSlip] = useState<any>(null);
  const [q, setQ] = useState('');

  const add = async () => {
    if (!f.name) return alert('اكتب اسم الموظف');
    const row: any = { ...f };
    NUMS.forEach((k) => { row[k] = toNum(f[k]); });
    const ok = await act(supabase.from('employees').insert([{ ...row, join_date: new Date().toISOString().split('T')[0] }]), onUpdate);
    if (ok) setF(blank);
  };

  const print = (e: any) => {
    setSlip(e);
    setTimeout(() => window.print(), 150);
  };

  const num = (k: string, ph: string) => (
    <Field2 label={ph}><NumInput placeholder={ph} value={f[k]} onChange={(v: string) => setF({ ...f, [k]: v })} /></Field2>
  );
  const list = employees.filter((e: any) => matches(q, e.name, e.national_id, e.location));
  const totalNet = employees.reduce((a: number, e: any) => a + net(e), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2.5 no-print">
        <Stat icon="👥" label="عدد الموظفين" value={employees.length} tone="violet" />
        <Stat icon="💵" label="إجمالي صافي المرتبات" value={`${money(totalNet)} ج.م`} />
      </div>

      <div className="no-print">
        <FormCard title="إضافة موظف جديد" icon="👤">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field2 label="اسم الموظف"><input className={input} placeholder="اسم الموظف" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field2>
            <Field2 label="الرقم القومي"><input className={input} inputMode="numeric" placeholder="الرقم القومي" value={f.national_id} onChange={(e) => setF({ ...f, national_id: e.target.value })} /></Field2>
            <Field2 label="موقع العمل"><input className={input} placeholder="موقع العمل" value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} /></Field2>
            {num('base_salary', 'الراتب الأساسي')}
            {num('site_allowance', 'بدل موقع')}
            {num('transport', 'بدل انتقالات')}
            {num('deductions', 'خصومات')}
            {num('loans', 'سلف')}
          </div>
          <Btn onClick={add} className="w-full !from-purple-600 !to-violet-500">حفظ الموظف</Btn>
        </FormCard>
      </div>

      <div className="space-y-3 no-print">
        <h4 className="font-black text-slate-800">كشوف مرتبات الموظفين ({list.length})</h4>
        <SearchBox value={q} onChange={setQ} placeholder="ابحث بالاسم أو الرقم القومي أو الموقع..." />
        {list.length === 0 && <Empty text="لا يوجد موظفون" />}
        <div className="grid sm:grid-cols-2 gap-2.5">
          {list.map((e: any) => (
            <Item key={e.id} accent="violet" icon="👤" title={e.name}
              sub={<div className="flex flex-wrap gap-1 pt-1">{e.location && <Tag label="الموقع" value={e.location} />}<Tag label="الأساسي" value={`${money(e.base_salary)} ج.م`} /><Tag label="الصافي" value={`${money(net(e))} ج.م`} tone="brand" /></div>}
              right={<Btn color="slate" onClick={() => print(e)} className="!py-1.5 !px-3 text-xs">طباعة 🖨️</Btn>}>
              <RowActions table="employees" row={e} fields={HR_FIELDS} supabase={supabase} onUpdate={onUpdate}
                title="تعديل بيانات الموظف" confirmText={`حذف الموظف ${e.name} نهائياً؟`} />
            </Item>
          ))}
        </div>
      </div>

      {/* إذن الصرف المطبوع */}
      {slip && (
        <div className="print-area hidden print:block">
          <h2 style={{ textAlign: 'center', fontSize: 22, fontWeight: 900 }}>رينتال باور – إذن صرف مرتب</h2>
          <hr style={{ margin: '12px 0' }} />
          <p>الاسم: <b>{slip.name}</b></p>
          <p>الرقم القومي: {slip.national_id || '-'} | موقع العمل: {slip.location || '-'}</p>
          <table style={{ width: '100%', marginTop: 16, borderCollapse: 'collapse' }} border={1} cellPadding={8}>
            <tbody>
              <tr><td>الراتب الأساسي</td><td>{money(slip.base_salary)}</td></tr>
              <tr><td>بدل موقع</td><td>{money(slip.site_allowance)}</td></tr>
              <tr><td>بدل انتقالات</td><td>{money(slip.transport)}</td></tr>
              <tr><td>خصومات</td><td>{money(slip.deductions)}</td></tr>
              <tr><td>سلف</td><td>{money(slip.loans)}</td></tr>
              <tr><td><b>الصافي</b></td><td><b>{money(net(slip))} ج.م</b></td></tr>
            </tbody>
          </table>
          <p style={{ marginTop: 40 }}>توقيع الموظف: ____________ &nbsp;&nbsp; توقيع المدير: ____________</p>
        </div>
      )}
    </div>
  );
}