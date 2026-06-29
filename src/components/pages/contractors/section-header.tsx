"use client";

// ===== Section Header (shared across form sections) =====
function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-700">
      <Icon className="h-4 w-4 text-brand-navy-600 dark:text-brand-navy-400" />
      <h3 className="text-sm font-semibold text-slate-800 dark:text-white">{title}</h3>
    </div>
  );
}

export { SectionHeader };
