import { formatCurrency } from "./helpers";

// ===== Custom Chart Tooltip =====
export function ChartTooltip({ active, payload, label, isAr }: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
  isAr: boolean;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 shadow-lg">
      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
      <p className="text-sm font-semibold text-slate-900 dark:text-white mt-0.5">
        {formatCurrency(payload[0].value, isAr ? "ar" : "en")} AED
      </p>
    </div>
  );
}
