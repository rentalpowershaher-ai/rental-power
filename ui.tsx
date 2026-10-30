'use client';
import React from 'react';
import ReactDOM from 'react-dom';
import { createRoot } from 'react-dom/client';

export const input =
  'w-full px-3 py-2.5 border border-slate-200 rounded-xl bg-white text-sm placeholder:text-slate-400 focus:ring-2 focus:ring-brand/30 focus:border-brand outline-none transition';

const colors: Record<string, string> = {
  brand: 'bg-gradient-to-l from-brand to-emerald-500 hover:from-brand-dark hover:to-brand text-white shadow-sm shadow-brand/25',
  red: 'bg-gradient-to-l from-rose-600 to-red-500 hover:from-rose-700 hover:to-rose-600 text-white shadow-sm shadow-rose-500/25',
  dark: 'bg-gradient-to-l from-ink to-ink-soft hover:from-black hover:to-ink text-white shadow-sm',
  slate: 'bg-slate-100 hover:bg-slate-200 text-slate-700',
  amber: 'bg-gradient-to-l from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-sm shadow-amber-500/25',
};

export function Btn({ color = 'brand', className = '', ...p }: any) {
  return (
    <button {...p} className={`px-4 py-2.5 rounded-xl text-[13px] font-bold transition active:scale-95 disabled:opacity-50 disabled:active:scale-100 ${colors[color]} ${className}`} />
  );
}

export function Card({ children, className = '' }: any) {
  return <div className={`p-3.5 bg-white border border-slate-200/80 rounded-2xl shadow-sm ${className}`}>{children}</div>;
}

// عدد العناصر المكتوب في العنوان، مثال: "طلبات (12)" أو "(5 من 40 صنف)"
const countIn = (t: any) => {
  if (typeof t !== 'string') return 0;
  const m = t.match(/\((\d+)(?:\s*من\s*\d+)?[^)]*\)\s*$/);
  return m ? Number(m[1]) : 0;
};

// قسم قابل للطي بسهم. القوائم الكبيرة (أكثر من 5 عناصر) تبدأ مطوية لتخفيف الصفحة.
export function Section({ title, children, defaultOpen, collapsible = true }: any) {
  const [manual, setManual] = React.useState<boolean | null>(null);
  const open = manual ?? (defaultOpen ?? countIn(title) <= 5);
  return (
    <div className="space-y-2.5">
      <button type="button" onClick={() => collapsible && setManual(!open)} className="w-full flex items-center justify-between gap-2 text-right">
        <h3 className="font-black text-[15px] text-slate-800 flex items-center gap-2">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-brand to-emerald-400" />
          {title}
        </h3>
        {collapsible && (
          <span className={`w-7 h-7 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        )}
      </button>
      {open && children}
    </div>
  );
}

// صندوق قابل للطي (عام)
export function Collapse({ title, sub, icon, defaultOpen = false, right, children, className = '' }: any) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden ${className}`}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-right">
        <span className="flex items-center gap-2 min-w-0">
          {icon && <span className="w-8 h-8 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center">{icon}</span>}
          <span className="min-w-0">
            <span className="block font-black text-sm text-slate-800 truncate">{title}</span>
            {sub && <span className="block text-[11px] text-slate-500">{sub}</span>}
          </span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          {right}
          <span className={`w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </span>
      </button>
      {open && <div className="px-3 pb-3 pt-1 border-t border-slate-100">{children}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone = 'brand', icon }: any) {
  const tones: any = {
    brand: 'from-brand-light to-white border-brand/30 text-brand-dark',
    red: 'from-rose-50 to-white border-rose-200 text-rose-800',
    blue: 'from-blue-50 to-white border-blue-200 text-blue-800',
    amber: 'from-amber-50 to-white border-amber-200 text-amber-800',
    violet: 'from-violet-50 to-white border-violet-200 text-violet-800',
  };
  return (
    <div className={`relative overflow-hidden p-3 border rounded-2xl bg-gradient-to-br shadow-sm ${tones[tone] || tones.brand}`}>
      {icon && <span className="absolute -left-1 -bottom-2 text-4xl opacity-10 select-none">{icon}</span>}
      <p className="text-[11px] font-bold mb-1 opacity-80">{label}</p>
      <p className="text-xl font-black leading-tight">{value}</p>
      {sub && <p className="text-[11px] mt-1 opacity-70">{sub}</p>}
    </div>
  );
}

const STATUS: Record<string, [string, string]> = {
  'معلق_المخزن': ['بانتظار المخزن', 'bg-amber-100 text-amber-800'],
  'معلق_المالية': ['بانتظار المالية', 'bg-blue-100 text-blue-800'],
  'مقبول': ['مقبول', 'bg-emerald-100 text-emerald-800'],
  'مرفوض': ['مرفوض', 'bg-rose-100 text-rose-800'],
  'تم_الاستلام': ['تم الاستلام', 'bg-slate-200 text-slate-700'],
  'تم_الصرف': ['تم الصرف', 'bg-emerald-100 text-emerald-800'],
  'تم_الاسترجاع': ['تم الاسترجاع', 'bg-emerald-100 text-emerald-800'],
  'محوّل_للمشتريات': ['عند المشتريات', 'bg-violet-100 text-violet-800'],
  'قيد_الشراء': ['تم الشراء – بانتظار المخزن', 'bg-blue-100 text-blue-800'],
  'جاري_الشراء': ['جاري الشراء', 'bg-blue-100 text-blue-800'],
  'متوقف_المالية': ['معلق بسبب الماليات', 'bg-amber-100 text-amber-800'],
  'غير_متوفر': ['غير متوفر بالأسواق', 'bg-rose-100 text-rose-800'],
  'تم_الشراء': ['تم الشراء', 'bg-emerald-100 text-emerald-800'],
  'معلق_المشتريات': ['بانتظار المشتريات', 'bg-violet-100 text-violet-800'],
  'معلق_الصيانة': ['بانتظار الصيانة', 'bg-amber-100 text-amber-800'],
  'محوّل_للمالية': ['عند المالية', 'bg-blue-100 text-blue-800'],
};
export function Badge({ status }: { status: string }) {
  const [label, cls] = STATUS[status] || [status, 'bg-slate-100 text-slate-700'];
  return <span className={`px-2.5 py-1 text-[11px] font-black rounded-full whitespace-nowrap ${cls}`}>{label}</span>;
}

export function Empty({ text }: { text: string }) {
  return (
    <div className="text-center py-7 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60">
      <p className="text-2xl opacity-40 mb-1">📭</p>
      <p className="text-sm text-slate-400 font-semibold">{text}</p>
    </div>
  );
}

export function Tabs({ tabs, value, onChange }: any) {
  return (
    <div className="flex gap-1.5 overflow-x-auto p-1 bg-slate-100 rounded-2xl">
      {tabs.map((t: any) => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap transition active:scale-95 ${
            value === t.id ? 'bg-white text-brand-dark shadow ring-1 ring-brand/20' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {t.label}
          {t.count > 0 && <span className="mr-2 px-1.5 py-0.5 rounded-full bg-bolt text-white text-[10px]">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ينفذ عملية Supabase ويعرض الخطأ لو حصل
export async function act(p: PromiseLike<{ error: any }>, onDone?: (() => void) | null) {
  const { error } = await p;
  if (error) {
    alert('حدث خطأ: ' + (error.message || 'غير معروف'));
    return false;
  }
  onDone?.();
  return true;
}

export const money = (n: any) => Number(n || 0).toLocaleString('en-US');

// ================= أقسام الورشة (كهرباء / ميكانيكا / صيانة شركات أخرى) =================
// بتتعامل في الطلبات (صرف / خردة / شراء / إصلاح) زي المعدة بالظبط، وكودها بيتخزن في equipment_code
export const WORKSHOP_DEFAULTS: any[] = [
  { code: 'WS-ELEC', name: 'ورشة الكهرباء', icon: '🔌', notes: null },
  { code: 'WS-MECH', name: 'ورشة الميكانيكا', icon: '⚙️', notes: null },
  { code: 'WS-OTHER', name: 'صيانة شركات أخرى', icon: '🏢', notes: null },
];
let WS_LIST: any[] = WORKSHOP_DEFAULTS;
export const setWorkshops = (l: any[] | null | undefined) => { WS_LIST = l && l.length ? l : WORKSHOP_DEFAULTS; };
export const workshopOf = (code: any) => WS_LIST.find((w) => w.code === code);
// اسم للعرض: قسم الورشة باسمه، أو "معدة + الكود"
export const eqName = (code: any) => { const w = workshopOf(code); return w ? `${w.icon || '🏭'} ${w.name}` : `معدة ${code}`; };

export function Logo({ className = 'w-10 h-10' }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.png" alt="Rental Power" className={`rounded-full bg-white ${className}`} />;
}

export const fmtDate = (d: any) =>
  d ? new Date(d).toLocaleString('ar-EG', { day: 'numeric', month: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

// رقم الطلب المتسلسل: رقم فقط بدون أي إضافات (1 ، 2 ، 3 ...)
export const reqNo = (n: any) => {
  const d = String(n ?? '').replace(/\D/g, '');
  return d ? String(Number(d)) : '';
};

export function ReqMeta({ no, date }: { prefix?: string; no?: number | string | null; date?: string | null }) {
  const n = reqNo(no);
  return (
    <p className="text-[11px] text-slate-400 font-semibold flex items-center gap-1.5 flex-wrap">
      {n && (
        <span dir="ltr" className="inline-block font-black text-slate-600">{n}</span>
      )}
      <span>{fmtDate(date)}</span>
    </p>
  );
}

// ================= تعديل / حذف =================
export type Field = {
  key: string;
  label: string;
  type?: 'text' | 'number' | 'textarea' | 'select';
  options?: string[];
  required?: boolean;
  nullable?: boolean; // النص الفاضي يتحفظ NULL
  step?: string;
};

// حقول الخردة والمستعمل (مشتركة بين المخزن والمشتريات)
export const SCRAP_FIELDS: Field[] = [
  { key: 'name', label: 'اسم الصنف', required: true },
  { key: 'condition', label: 'الحالة', type: 'select', options: ['مستعمل', 'خردة', 'تالف'] },
  { key: 'quantity', label: 'الكمية', type: 'number' },
  { key: 'est_price', label: 'السعر التقديري للقطعة', type: 'number' },
  { key: 'notes', label: 'ملاحظات', type: 'textarea' },
];

export function EditModal({ title, row, fields, onSave, onClose }: any) {
  const [v, setV] = React.useState<any>(() =>
    Object.fromEntries(fields.map((f: Field) => [f.key, row[f.key] ?? (f.type === 'number' ? 0 : '')]))
  );
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    const out: any = {};
    for (const f of fields as Field[]) {
      let x = v[f.key];
      if (f.type === 'number') {
        x = toNum(x);
      } else {
        x = typeof x === 'string' ? x.trim() : x;
        if (f.required && !x) return alert(`حقل "${f.label}" مطلوب`);
        if (x === '' && f.nullable) x = null;
      }
      out[f.key] = x;
    }
    setBusy(true);
    const ok = await onSave(out);
    setBusy(false);
    if (ok) onClose();
  };

  const modal = (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl p-4 space-y-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h4 className="font-black text-base text-slate-800">{title}</h4>
        {(fields as Field[]).map((f) => (
          <div key={f.key}>
            <label className="text-[11px] font-bold text-slate-500">{f.label}</label>
            {f.type === 'select' ? (
              <select className={input} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })}>
                {(f.options || []).map((o) => <option key={o}>{o}</option>)}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea className={input} rows={2} value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
            ) : (
              f.type === 'number' ? (
                <NumInput className={input} value={v[f.key]} onChange={(val: string) => setV({ ...v, [f.key]: val })} />
              ) : (
                <input className={input} type="text" value={v[f.key]} onChange={(e) => setV({ ...v, [f.key]: e.target.value })} />
              )
            )}
          </div>
        ))}
        <div className="flex gap-2 pt-1">
          <Btn onClick={save} disabled={busy} className="flex-1">حفظ التعديل</Btn>
          <Btn color="slate" onClick={onClose} className="flex-1">إلغاء</Btn>
        </div>
      </div>
    </div>
  );
  // نعرضها على body عشان الأنيميشن في الصفحة ما يبوّظش الـ fixed
  return ReactDOM.createPortal(modal, document.body);
}

// زرار تعديل + حذف لأي سجل
export function RowActions({
  table, row, fields, supabase, onUpdate, title = 'تعديل', canEdit = true, canDelete = true,
  confirmText, beforeSave, className = '',
}: any) {
  const [open, setOpen] = React.useState(false);
  const showEdit = canEdit && !!fields;
  if (!showEdit && !canDelete) return null;

  const fail = (error: any, rows: any[] | null) => {
    if (error) { alert('حدث خطأ: ' + (error.message || 'غير معروف')); return true; }
    if (!rows || rows.length === 0) { alert('ليس لديك صلاحية على هذا السجل (أو تغيرت حالته)'); return true; }
    return false;
  };

  const save = async (values: any) => {
    const payload = beforeSave ? beforeSave(values) : values;
    const { data, error } = await supabase.from(table).update(payload).eq('id', row.id).select('id');
    if (fail(error, data)) return false;
    onUpdate?.();
    return true;
  };

  const remove = async () => {
    if (!window.confirm(confirmText || 'هل أنت متأكد من الحذف؟ لا يمكن التراجع.')) return;
    const { data, error } = await supabase.from(table).delete().eq('id', row.id).select('id');
    if (fail(error, data)) return;
    onUpdate?.();
  };

  const b = 'px-2.5 py-1 rounded-lg text-[11px] font-bold transition active:scale-95';
  return (
    <>
      <div className={`flex gap-1.5 ${className}`}>
        {showEdit && <button type="button" onClick={() => setOpen(true)} className={`${b} bg-slate-100 hover:bg-slate-200 text-slate-700`}>✏️ تعديل</button>}
        {canDelete && <button type="button" onClick={remove} className={`${b} bg-rose-50 hover:bg-rose-100 text-rose-700`}>🗑️ حذف</button>}
      </div>
      {open && <EditModal title={title} row={row} fields={fields} onSave={save} onClose={() => setOpen(false)} />}
    </>
  );
}

// إحصائيات الفئات والأصناف (تظهر أعلى المخزن والمشتريات)
export function InventoryStats({ inventory = [] }: any) {
  const cats: Record<string, { items: number; qty: number }> = {};
  inventory.forEach((i: any) => {
    const c = i.category || 'بدون فئة';
    cats[c] = cats[c] || { items: 0, qty: 0 };
    cats[c].items += 1;
    cats[c].qty += Number(i.quantity || 0);
  });
  const list = Object.entries(cats).sort((a, b) => b[1].items - a[1].items);
  const totalQty = list.reduce((a, [, v]) => a + v.qty, 0);
  const totalValue = inventory.reduce((a: number, i: any) => a + Number(i.quantity || 0) * Number(i.unit_price || 0), 0);

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Stat label="قيمة المخزون الكلية" value={`${money(totalValue)} ج.م`} />
        <Stat label="عدد الفئات" value={list.length} />
        <Stat label="عدد الأصناف" value={inventory.length} tone="blue" />
        <Stat label="إجمالي القطع" value={money(totalQty)} tone="amber" />
      </div>
    </div>
  );
}

// ================= أدوات مشتركة: أرقام / بحث / فلترة =================
const AR = '٠١٢٣٤٥٦٧٨٩';
const FA = '۰۱۲۳۴۵۶۷۸۹';
// يحوّل الأرقام العربية/الفارسية لإنجليزية
export const toEn = (s: any) =>
  String(s ?? '')
    .replace(/[٠-٩]/g, (d) => String(AR.indexOf(d)))
    .replace(/[۰-۹]/g, (d) => String(FA.indexOf(d)))
    .replace(/٫/g, '.')
    .replace(/[٬,]/g, '');
export const toNum = (s: any) => {
  const n = Number(toEn(s));
  return isFinite(n) ? n : 0;
};

// خانة رقم: تقبل عربي وإنجليزي، وتقدر تسيبها فاضية وتكتب براحتك (القيمة نص، حوّلها بـ toNum عند الحفظ)
export function NumInput({ value, onChange, placeholder, className = input, ...p }: any) {
  return (
    <input
      {...p}
      className={className}
      type="text"
      inputMode="decimal"
      placeholder={placeholder}
      value={value ?? ''}
      onChange={(e) => onChange(toEn(e.target.value).replace(/[^0-9.]/g, ''))}
    />
  );
}

// تطبيع النص العربي للبحث (يتجاهل التشكيل والهمزات والتاء المربوطة)
export const norm = (s: any) =>
  toEn(s)
    .toLowerCase()
    .replace(/[\u064B-\u0652\u0640]/g, '')
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim();
export const matches = (q: string, ...fields: any[]) => {
  const n = norm(q);
  if (!n) return true;
  const hay = norm(fields.filter((x) => x != null).join(' '));
  return n.split(/\s+/).every((w) => hay.includes(w));
};

export function SearchBox({ value, onChange, placeholder = 'بحث...' }: any) {
  return (
    <div className="relative">
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">🔍</span>
      <input
        className={`${input} !pr-9 !pl-9 !py-2.5 !rounded-2xl !bg-slate-50`}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button type="button" onClick={() => onChange('')} className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-black">
          ✕
        </button>
      )}
    </div>
  );
}

// أزرار فلترة أفقية: options = [{ id, label, count? }]
export function Chips({ options, value, onChange }: any) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
      {options.map((o: any) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap border transition active:scale-95 ${
            value === o.id ? 'bg-ink text-white border-ink shadow' : 'bg-white text-slate-600 border-slate-200 hover:border-brand'
          }`}
        >
          {o.label}
          {o.count != null && <span className={`mr-1.5 ${value === o.id ? 'text-white/70' : 'text-slate-400'}`}>{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

// ترويسة مجموعة (فئة): لو مرّرت children تبقى قابلة للطي بسهم
export function GroupHeader({ title, sub, icon = '🗂️', children, forceOpen = false, defaultOpen = false }: any) {
  const [manual, setManual] = React.useState<boolean | null>(null);
  const collapsible = children !== undefined;
  const open = !collapsible || (manual ?? (forceOpen || defaultOpen));
  return (
    <div className="space-y-2">
      <button type="button" onClick={() => collapsible && setManual(!open)}
        className="w-full flex items-center justify-between bg-gradient-to-l from-brand-light to-white border border-brand/20 rounded-2xl px-3 py-2 text-right">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-8 h-8 shrink-0 rounded-xl bg-brand text-white flex items-center justify-center text-sm shadow">{icon}</span>
          <h4 className="font-black text-sm text-slate-800 truncate">{title}</h4>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sub && <span className="text-[11px] font-bold text-brand-dark bg-white border border-brand/20 rounded-full px-2 py-0.5">{sub}</span>}
          {collapsible && <span className={`w-6 h-6 rounded-full bg-white border border-brand/20 text-brand-dark flex items-center justify-center text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>}
        </div>
      </button>
      {collapsible && open && children}
    </div>
  );
}


// ================= مكونات التجميل =================
const ACCENTS: Record<string, string> = {
  brand: 'bg-brand', red: 'bg-rose-500', amber: 'bg-amber-500', blue: 'bg-blue-500', violet: 'bg-violet-500', slate: 'bg-slate-400', emerald: 'bg-emerald-500',
};
// بطاقة سجل/طلب موحّدة: شريط لون جانبي + عنوان + تفاصيل + جهة يسار للحالة أو الأزرار
export function Item({ accent = 'brand', icon, title, sub, meta, right, children, className = '', collapsible = false, preview, defaultOpen = false }: any) {
  const [open, setOpen] = React.useState(!collapsible || defaultOpen);
  const hasMore = !!sub || !!children;
  return (
    <div className={`relative overflow-hidden p-3.5 pr-4 bg-white border border-slate-200/80 rounded-2xl shadow-sm ${className}`}>
      <span className={`absolute right-0 top-0 bottom-0 w-1.5 ${ACCENTS[accent] || ACCENTS.brand}`} />
      <div className="flex items-start justify-between gap-2">
        <div
          className={`min-w-0 flex items-start gap-2.5 flex-1 ${collapsible && hasMore ? 'cursor-pointer' : ''}`}
          onClick={() => collapsible && hasMore && setOpen(!open)}
        >
          {icon && <span className="w-9 h-9 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-lg">{icon}</span>}
          <div className="min-w-0">
            {meta}
            <p className="font-black text-slate-800 leading-snug">{title}</p>
            {preview && <div className="text-xs text-slate-500 mt-0.5">{preview}</div>}
            {open && sub && <div className="text-xs text-slate-500 mt-0.5 space-y-0.5">{sub}</div>}
          </div>
        </div>
        <div className="shrink-0 flex items-center gap-1.5">
          {right}
          {collapsible && hasMore && (
            <button type="button" onClick={() => setOpen(!open)} aria-label="طي/فتح"
              className={`w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▾</button>
          )}
        </div>
      </div>
      {open && children && <div className="mt-2.5">{children}</div>}
    </div>
  );
}

// وسم صغير (قيمة مع عنوان)
export function Tag({ label, value, tone = 'slate' }: any) {
  const t: any = {
    slate: 'bg-slate-100 text-slate-700', brand: 'bg-brand-light text-brand-dark', amber: 'bg-amber-100 text-amber-800',
    red: 'bg-rose-100 text-rose-800', blue: 'bg-blue-100 text-blue-800', violet: 'bg-violet-100 text-violet-800',
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${t[tone] || t.slate}`}>
      {label && <span className="opacity-60">{label}</span>}
      {value}
    </span>
  );
}

// عنوان نموذج داخل بطاقة
export function FormCard({ title, icon = '➕', children, className = '' }: any) {
  return (
    <div className={`p-3.5 rounded-2xl border border-brand/20 bg-gradient-to-br from-white to-brand-light/40 shadow-sm space-y-3 ${className}`}>
      <h4 className="font-black text-slate-800 flex items-center gap-2">
        <span className="w-8 h-8 rounded-xl bg-brand text-white flex items-center justify-center text-sm shadow">{icon}</span>
        {title}
      </h4>
      {children}
    </div>
  );
}

export function Field2({ label, children, className = '' }: any) {
  return (
    <div className={className}>
      {label && <label className="block text-[11px] font-bold text-slate-500 mb-1">{label}</label>}
      {children}
    </div>
  );
}

// تفاصيل المعدة: تتولد تلقائياً من الكود وتظهر في أي قسم مربوط بمعدة
export function EqInfo({ code, equipments = [], eq: eqProp, defaultOpen = false, className = '' }: any) {
  const eq = eqProp || equipments.find((e: any) => e.code === code);
  const [open, setOpen] = React.useState(defaultOpen);
  if (!eq) {
    const w = code ? workshopOf(code) : null;
    if (w) {
      return (
        <div className={`rounded-xl border border-violet-200 bg-violet-50 px-2.5 py-1.5 ${className}`}>
          <p className="text-[11px] font-black text-violet-800">{w.icon || '🏭'} {w.name} <span className="font-bold opacity-70">• قسم ورشة</span></p>
          {w.notes && <p className="text-xs text-slate-700 whitespace-pre-line mt-1">📋 {w.notes}</p>}
        </div>
      );
    }
    return code ? <p className={`text-[11px] text-slate-400 ${className}`}>معدة {code}</p> : null;
  }
  const st = eq.status === 'مؤجر' ? 'amber' : eq.status === 'جاهز للعمل' ? 'brand' : 'red';
  return (
    <div className={`rounded-xl border border-brand/25 bg-brand-light/50 ${className}`}>
      <button type="button" onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-right">
        <span className="text-[11px] font-black text-brand-dark min-w-0 truncate">
          ⚡ {eq.name} <span dir="ltr" className="bg-white rounded px-1 mx-0.5">{eq.code}</span>{eq.location && ` • 📍 ${eq.location}`}
        </span>
        <span className="flex items-center gap-1.5 shrink-0 text-[10px] font-bold text-brand-dark">
          تفاصيل المعدة
          <span className={`inline-block transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
        </span>
      </button>
      {open && (
        <div className="px-2.5 pb-2.5 pt-2 space-y-1.5 border-t border-brand/10">
          <div className="flex flex-wrap gap-1">
            {eq.equip_type && <Tag tone="violet" value={eq.equip_type} />}
            {eq.power && <Tag label="القدرة" value={eq.power} />}
            {eq.location && <Tag label="الموقع" value={eq.location} />}
            <Tag label="العداد" value={`${eq.hours_meter ?? 0} س`} tone="blue" />
            {eq.status && <Tag label="الحالة" value={eq.status} tone={st} />}
            {Number(eq.oil_interval_hours) > 0 && (
              <Tag label="زيت كل" value={`${eq.oil_interval_hours} س${Number(eq.oil_liters) > 0 ? ` • ${eq.oil_liters} لتر` : ''}`} tone="amber" />
            )}
          </div>
          {eq.details
            ? <p className="text-xs text-slate-700 whitespace-pre-line bg-white rounded-lg p-2 border border-slate-100">📋 {eq.details}</p>
            : <p className="text-[11px] text-slate-400">لا توجد تفاصيل إضافية (تُضاف من إدارة المعدات)</p>}
        </div>
      )}
    </div>
  );
}


// ================= مربع ذكر سبب الرفض =================
const QUICK_REASONS = ['الكمية غير متوفرة', 'الصنف غير مطابق للمطلوب', 'الطلب مكرر', 'بيانات الطلب ناقصة', 'لا حاجة له حالياً'];

function ReasonDialog({ title, placeholder, onDone }: any) {
  const [v, setV] = React.useState('');
  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-end sm:items-center justify-center p-3" dir="rtl" onClick={() => onDone(null)}>
      <div className="bg-white w-full max-w-md rounded-2xl p-4 space-y-3 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <h4 className="font-black text-base text-rose-700 flex items-center gap-2"><span>❌</span>{title}</h4>
        <div className="flex flex-wrap gap-1.5">
          {QUICK_REASONS.map((q) => (
            <button key={q} type="button" onClick={() => setV(q)}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200 active:scale-95">{q}</button>
          ))}
        </div>
        <textarea autoFocus className={input} rows={3} placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} />
        <p className="text-[11px] text-slate-500">سيظهر هذا السبب للقسم صاحب الطلب ويصله إشعار.</p>
        <div className="flex gap-2">
          <Btn color="red" disabled={!v.trim()} onClick={() => onDone(v.trim())} className="flex-1">تأكيد الرفض</Btn>
          <Btn color="slate" onClick={() => onDone(null)} className="flex-1">إلغاء</Btn>
        </div>
      </div>
    </div>
  );
}

// يفتح مربع السبب ويرجّع النص (أو null لو ألغى). السبب إجباري.
export function askReason(title = 'سبب الرفض', placeholder = 'اكتب سبب الرفض ليظهر للقسم...'): Promise<string | null> {
  return new Promise((resolve) => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (v: string | null) => {
      root.unmount();
      host.remove();
      resolve(v);
    };
    root.render(<ReasonDialog title={title} placeholder={placeholder} onDone={done} />);
  });
}

// صندوق عرض سبب الرفض للقسم
export function RejectNote({ reason, by }: { reason?: string | null; by?: string }) {
  if (!reason) return null;
  return (
    <div className="mt-1.5 rounded-xl bg-rose-50 border border-rose-200 px-2.5 py-1.5">
      <p className="text-[11px] font-black text-rose-700">❌ {by ? `سبب رفض ${by}` : 'سبب الرفض'}</p>
      <p className="text-xs text-rose-800 whitespace-pre-line">{reason}</p>
    </div>
  );
}