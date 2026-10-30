'use client';
import React, { useState } from 'react';
import { eqName, askReason, EqInfo, Btn, Badge, Section, Empty, ReqMeta, RowActions, Item, Tag, Stat, SearchBox, fmtDate, act, money, matches } from '../ui';

export default function FinanceView({ purchaseReqs, repairReqs, rentalReqs = [], equipments = [], supabase, onUpdate, dept }: any) {
  const [q, setQ] = useState('');

  const getReason = async (status: string) => {
    if (status !== 'مرفوض') return null;
    return await askReason('سبب رفض المالية — يظهر للقسم صاحب الطلب');
  };
  const decideRental = async (id: string, status: string) => {
    const reason = await getReason(status);
    if (status === 'مرفوض' && reason === null) return;
    await act(supabase.rpc('rental_decide', { p_id: id, p_status: status, p_reason: reason }), onUpdate);
  };
  const decide = async (table: string, id: string, status: string) => {
    const reason = await getReason(status);
    if (status === 'مرفوض' && reason === null) return;
    await act(supabase.from(table).update({ status, reject_reason: reason }).eq('id', id), onUpdate);
  };

  const pendPR = purchaseReqs.filter((r: any) => r.status === 'معلق_المالية' && matches(q, r.item_name, r.category, r.supplier));
  const pendRR = repairReqs.filter((r: any) => r.status === 'معلق_المالية' && matches(q, r.part_name, r.equipment_code));
  const pendRent = rentalReqs.filter((r: any) => r.status === 'معلق_المالية' && matches(q, r.equipment_name, r.equipment_code, r.location));
  const histPR = purchaseReqs.filter((r: any) => r.status !== 'معلق_المالية' && r.status !== 'معلق_المخزن').slice(0, 10);
  const histRR = repairReqs.filter((r: any) => r.status !== 'معلق_المالية' && r.status !== 'معلق_المشتريات').slice(0, 10);
  const histRT = rentalReqs.filter((r: any) => r.status !== 'معلق_المالية').slice(0, 10);
  const history = [
    ...histPR.map((r: any) => ({ ...r, label: r.item_name, _t: 'purchase_requests' })),
    ...histRR.map((r: any) => ({ ...r, label: r.part_name, _t: 'repair_requests' })),
    ...histRT.map((r: any) => ({ ...r, label: `إيجار ${r.equipment_name}`, _t: 'rental_requests' })),
  ]
    .filter((r: any) => matches(q, r.label))
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const total = pendPR.length + pendRR.length + pendRent.length;
  const pendingValue = pendPR.reduce((a: number, r: any) => a + Number(r.total_price || 0), 0) + pendRR.reduce((a: number, r: any) => a + Number(r.cost || 0), 0);

  const Actions = ({ onOk, onNo }: any) => (
    <div className="flex gap-2">
      <Btn onClick={onOk} className="!py-1.5 !px-3 text-xs">✓ قبول</Btn>
      <Btn color="red" onClick={onNo} className="!py-1.5 !px-3 text-xs">رفض</Btn>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-2.5">
        <Stat icon="⏳" label="طلبات بانتظار قرارك" value={total} tone={total ? 'amber' : 'brand'} />
        <Stat icon="💰" label="قيمة الشراء والإصلاح المعلّقة" value={`${money(pendingValue)} ج.م`} tone="blue" />
      </div>
      <SearchBox value={q} onChange={setQ} placeholder="ابحث في الطلبات بالصنف أو كود المعدة أو المورد..." />

      <Section title={`طلبات الشراء بانتظار موافقتك (${pendPR.length})`}>
        {pendPR.length === 0 && <Empty text="لا توجد طلبات شراء معلقة" />}
        {pendPR.map((r: any) => (
          <Item key={r.id} accent="blue" icon="🛒" meta={<ReqMeta prefix="PR" no={r.req_no} date={r.created_at} />}
            title={`${r.item_name} (${r.quantity} قطعة)`}
            sub={<div className="flex flex-wrap gap-1 pt-1"><Tag label="القيمة" value={`${money(r.total_price)} ج.م`} tone="brand" />{r.category && <Tag value={r.category} />}{r.supplier && <Tag label="المورد" value={r.supplier} />}</div>}
            right={<Actions onOk={() => decide('purchase_requests', r.id, 'مقبول')} onNo={() => decide('purchase_requests', r.id, 'مرفوض')} />} />
        ))}
      </Section>

      <Section title={`طلبات الإصلاح من الصيانة (${pendRR.length})`}>
        {pendRR.length === 0 && <Empty text="لا توجد طلبات إصلاح معلقة" />}
        {pendRR.map((r: any) => (
          <Item key={r.id} accent="amber" icon="🔧" meta={<ReqMeta prefix="RP" no={r.req_no} date={r.created_at} />}
            title={`${r.part_name} — ${eqName(r.equipment_code)}`}
            sub={<div className="flex flex-wrap gap-1 pt-1"><Tag label="التكلفة" value={`${money(r.cost)} ج.م`} tone="amber" /><Tag value="مرّ على المشتريات" tone="violet" /></div>}
            preview={<EqInfo code={r.equipment_code} equipments={equipments} className="mt-1" />}
            right={<Actions onOk={() => decide('repair_requests', r.id, 'مقبول')} onNo={() => decide('repair_requests', r.id, 'مرفوض')} />} />
        ))}
      </Section>

      <Section title={`طلبات إيجار معدة من الصيانة (${pendRent.length})`}>
        {pendRent.length === 0 && <Empty text="لا توجد طلبات إيجار معلقة" />}
        {pendRent.map((r: any) => (
          <Item key={r.id} accent="violet" icon="🚛" meta={<ReqMeta prefix="RT" no={r.req_no} date={r.created_at} />}
            title={`${r.equipment_name} (${r.equipment_code})`}
            sub={
              <div className="space-y-1 pt-1">
                <div className="flex flex-wrap gap-1">
                  <Tag label="القدرة" value={r.power} />
                  <Tag label="العداد" value={`${r.hours_meter ?? 0} س`} tone="blue" />
                  {r.current_hours != null && <Tag label="الساعات الحالية" value={`${r.current_hours} س`} tone="amber" />}
                  <Tag label="الموقع المطلوب" value={r.location} tone="violet" />
                </div>
                {r.notes && <p className="text-slate-600">📝 {r.notes}</p>}
                <EqInfo code={r.equipment_code} equipments={equipments} />
              </div>
            }
            right={<Actions onOk={() => decideRental(r.id, 'مقبول')} onNo={() => decideRental(r.id, 'مرفوض')} />} />
        ))}
      </Section>

      <Section title="آخر القرارات">
        {history.length === 0 && <Empty text="لا يوجد سجل" />}
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
          {history.map((r: any) => (
            <div key={r.id} className="flex items-center justify-between gap-2 text-sm px-3 py-2.5">
              <span className="min-w-0 truncate font-semibold">{r.label} <span className="text-[11px] text-slate-400 font-normal">• {fmtDate(r.created_at)}</span></span>
              <div className="flex items-center gap-2 shrink-0">
                <Badge status={r.status} />
                {dept === 'general' && (
                  <RowActions table={r._t} row={r} canEdit={false} supabase={supabase} onUpdate={onUpdate} confirmText={`حذف (${r.label}) من السجل نهائياً؟`} />
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}