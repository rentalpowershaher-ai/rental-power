'use client';
import React, { useState } from 'react';

export default function NotificationBell({ items, unread, markSeen }: any) {
  const [open, setOpen] = useState(false);
  const toggle = () => {
    setOpen(!open);
    if (!open) markSeen();
  };
  return (
    <div className="relative">
      <button onClick={toggle} className="relative w-10 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xl flex items-center justify-center">
        🔔
        {unread > 0 && (
          <span className="absolute -top-1 -left-1 min-w-[18px] h-[18px] px-1 rounded-full bg-bolt text-white text-[10px] font-black flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute left-0 mt-2 w-80 max-w-[90vw] max-h-96 overflow-y-auto bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 z-50">
          <div className="p-3 border-b font-bold text-sm">الإشعارات</div>
          {items.length === 0 && <p className="p-6 text-center text-sm text-slate-400">لا توجد إشعارات</p>}
          {items.map((n: any) => (
            <div key={n.id} className="p-3 border-b last:border-0">
              <p className="font-bold text-sm">{n.title}</p>
              <p className="text-xs text-slate-600 mt-0.5">{n.body}</p>
              <p className="text-[10px] text-slate-400 mt-1">{new Date(n.created_at).toLocaleString('ar-EG')}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
