"use client";


import { useTranslations } from 'next-intl';
interface ProjectCountBarProps {
  isAr: boolean;
  t: (ar: string, en: string) => string;
  allProjectsCount: number;
  selectedIdsSize: number;
  onClearSelection: () => void;
}

export function ProjectCountBar({
  isAr: _isAr,
  t,
  allProjectsCount,
  selectedIdsSize,
  onClearSelection,
}: ProjectCountBarProps) {
  const tAuto = useTranslations();
  return (
    <div className="flex items-center justify-between">
      <div className="text-sm text-slate-500 dark:text-slate-400">
        {t(
          `إجمالي ${allProjectsCount} مشروع`,
          `${allProjectsCount} projects total`
        )}
      </div>
      {selectedIdsSize > 0 && (
        <button
          onClick={onClearSelection}
          className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {tAuto('auto.clearSelection')} ({selectedIdsSize})
        </button>
      )}
    </div>
  );
}
