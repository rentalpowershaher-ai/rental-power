export const DEPARTMENTS = [
  { id: 'general', name: 'المدير العام', icon: '🛡️', color: 'from-amber-500 to-orange-600' },
  { id: 'finance', name: 'الماليات والحسابات', icon: '💰', color: 'from-emerald-500 to-teal-600' },
  { id: 'marketing', name: 'التسويق', icon: '📣', color: 'from-blue-500 to-indigo-600' },
  { id: 'purchasing', name: 'المشتريات', icon: '🛒', color: 'from-violet-500 to-purple-600' },
  { id: 'warehouse', name: 'المخزن', icon: '📦', color: 'from-cyan-500 to-blue-600' },
  { id: 'maintenance', name: 'الصيانة', icon: '🔧', color: 'from-rose-500 to-pink-600' },
  { id: 'equipment', name: 'إدارة المعدات', icon: '⚡', color: 'from-yellow-500 to-amber-600' },
  { id: 'hr', name: 'الموارد البشرية (HR)', icon: '👥', color: 'from-indigo-500 to-purple-600' },
];

export const deptOf = (id: string | null) => DEPARTMENTS.find((d) => d.id === id);