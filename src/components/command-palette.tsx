'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { LayoutDashboard, UserPlus, FolderKanban, HardHat, TrendingUp, TrendingDown, BarChart3, UsersRound, Sparkles, BookMarked, Calendar, Search, Shield, ChevronLeft, ChevronRight, Zap, FileText, Receipt, CreditCard, FileSignature, Gavel, Wallet, FileCheck, MapPin, BookOpen, HelpCircle, AlertTriangle, Send, Repeat, FileBarChart, Building2, ClipboardList, Package, ShoppingCart, Wrench, Table, Eye, GitBranch, Bell, Settings as SettingsIcon, User, Clock, CalendarOff, Timer, Scale, Cog, ShieldCheck, Users, Layers } from 'lucide-react'

import { useNavStore } from '@/store/nav-store';
import { useLanguage } from '@/hooks/use-lang';
import { cn } from '@/lib/utils';

interface CommandItem {
  id: string;
  label: string;
  labelEn: string;
  icon: React.ElementType;
  category: string;
  categoryEn: string;
  action?: () => void;
}

// Navigation commands built from Blue's actual pages (permissions.ts + nav-store PAGE_ROUTE_MAP).
// P0-10 FIX: Expanded from 14 to 60+ commands so users can reach any page via Ctrl+K.
// Previously only 13% of pages were reachable via the command palette.
const navCommands: CommandItem[] = [
  // ───── Main ─────
  { id: 'dashboard', label: 'لوحة التحكم', labelEn: 'Dashboard', icon: LayoutDashboard, category: 'الرئيسية', categoryEn: 'Main' },
  { id: 'notifications', label: 'الإشعارات', labelEn: 'Notifications', icon: Bell, category: 'الرئيسية', categoryEn: 'Main' },
  { id: 'search', label: 'البحث', labelEn: 'Search', icon: Search, category: 'الرئيسية', categoryEn: 'Main' },
  { id: 'calendar', label: 'التقويم', labelEn: 'Calendar', icon: Calendar, category: 'الرئيسية', categoryEn: 'Main' },
  { id: 'activity-log', label: 'سجل النشاط', labelEn: 'Activity Log', icon: ClipboardList, category: 'الرئيسية', categoryEn: 'Main' },

  // ───── Clients & Projects ─────
  { id: 'clients', label: 'العملاء', labelEn: 'Clients', icon: UserPlus, category: 'العملاء والمشاريع', categoryEn: 'Clients & Projects' },
  { id: 'projects', label: 'المشاريع', labelEn: 'Projects', icon: FolderKanban, category: 'العملاء والمشاريع', categoryEn: 'Clients & Projects' },
  { id: 'contractors', label: 'المقاولون', labelEn: 'Contractors', icon: HardHat, category: 'العملاء والمشاريع', categoryEn: 'Clients & Projects' },
  { id: 'project-templates', label: 'قوالب المشاريع', labelEn: 'Project Templates', icon: Layers, category: 'العملاء والمشاريع', categoryEn: 'Clients & Projects' },
  { id: 'gantt', label: 'مخطط جانت', labelEn: 'Gantt Chart', icon: BarChart3, category: 'العملاء والمشاريع', categoryEn: 'Clients & Projects' },
  { id: 'proposals', label: 'العروض', labelEn: 'Proposals', icon: FileText, category: 'العملاء والمشاريع', categoryEn: 'Clients & Projects' },
  { id: 'bids', label: 'العطاءات', labelEn: 'Bids', icon: Gavel, category: 'العملاء والمشاريع', categoryEn: 'Clients & Projects' },
  { id: 'tenders', label: 'المناقصات', labelEn: 'Tenders', icon: FileSignature, category: 'العملاء والمشاريع', categoryEn: 'Clients & Projects' },

  // ───── Finance ─────
  { id: 'invoices', label: 'الفواتير', labelEn: 'Invoices', icon: Receipt, category: 'المالية', categoryEn: 'Finance' },
  { id: 'recurring-invoices', label: 'الفواتير المتكررة', labelEn: 'Recurring Invoices', icon: Repeat, category: 'المالية', categoryEn: 'Finance' },
  { id: 'payments', label: 'المدفوعات', labelEn: 'Payments', icon: CreditCard, category: 'المالية', categoryEn: 'Finance' },
  { id: 'billing', label: 'الفوترة', labelEn: 'Billing', icon: Wallet, category: 'المالية', categoryEn: 'Finance' },
  { id: 'budgets', label: 'الميزانيات', labelEn: 'Budgets', icon: Wallet, category: 'المالية', categoryEn: 'Finance' },
  { id: 'contracts', label: 'العقود', labelEn: 'Contracts', icon: FileSignature, category: 'المالية', categoryEn: 'Finance' },
  { id: 'commissions', label: 'العمولات', labelEn: 'Commissions', icon: Scale, category: 'المالية', categoryEn: 'Finance' },
  { id: 'finance-revenue', label: 'الإيرادات', labelEn: 'Revenue', icon: TrendingUp, category: 'المالية', categoryEn: 'Finance' },
  { id: 'finance-expenses', label: 'المصروفات', labelEn: 'Expenses', icon: TrendingDown, category: 'المالية', categoryEn: 'Finance' },
  { id: 'finance-reports', label: 'التقارير المالية', labelEn: 'Financial Reports', icon: BarChart3, category: 'المالية', categoryEn: 'Finance' },
  { id: 'finance-retainage', label: 'الاحتجاز', labelEn: 'Retainage', icon: ShieldCheck, category: 'المالية', categoryEn: 'Finance' },
  { id: 'finance-guarantees', label: 'خطابات الضمان', labelEn: 'Guarantees', icon: FileCheck, category: 'المالية', categoryEn: 'Finance' },
  { id: 'finance-progress-claims', label: 'مطالبات التقدم', labelEn: 'Progress Claims', icon: TrendingUp, category: 'المالية', categoryEn: 'Finance' },
  { id: 'progress-claims', label: 'المطالبات', labelEn: 'Progress Claims', icon: TrendingUp, category: 'المالية', categoryEn: 'Finance' },
  { id: 'guarantee-letters', label: 'خطابات الضمان', labelEn: 'Guarantee Letters', icon: FileCheck, category: 'المالية', categoryEn: 'Finance' },

  // ───── HR ─────
  { id: 'employees', label: 'الموظفين', labelEn: 'Employees', icon: UsersRound, category: 'الموارد البشرية', categoryEn: 'Human Resources' },
  { id: 'attendance', label: 'الحضور والانصراف', labelEn: 'Attendance', icon: Clock, category: 'الموارد البشرية', categoryEn: 'Human Resources' },
  { id: 'leave', label: 'الإجازات', labelEn: 'Leave', icon: CalendarOff, category: 'الموارد البشرية', categoryEn: 'Human Resources' },
  { id: 'timesheets', label: 'ساعات العمل', labelEn: 'Timesheets', icon: Timer, category: 'الموارد البشرية', categoryEn: 'Human Resources' },
  { id: 'workload', label: 'حجم العمل', labelEn: 'Workload', icon: Scale, category: 'الموارد البشرية', categoryEn: 'Human Resources' },
  { id: 'team-members', label: 'أعضاء الفريق', labelEn: 'Team Members', icon: Users, category: 'الموارد البشرية', categoryEn: 'Human Resources' },
  { id: 'approvals', label: 'الاعتمادات', labelEn: 'Approvals', icon: FileCheck, category: 'الموارد البشرية', categoryEn: 'Human Resources' },

  // ───── Procurement ─────
  { id: 'suppliers', label: 'الموردون', labelEn: 'Suppliers', icon: Building2, category: 'المشتريات', categoryEn: 'Procurement' },
  { id: 'inventory', label: 'المخزون', labelEn: 'Inventory', icon: Package, category: 'المشتريات', categoryEn: 'Procurement' },
  { id: 'purchase-orders', label: 'أوامر الشراء', labelEn: 'Purchase Orders', icon: ShoppingCart, category: 'المشتريات', categoryEn: 'Procurement' },
  { id: 'equipment', label: 'المعدات', labelEn: 'Equipment', icon: Wrench, category: 'المشتريات', categoryEn: 'Procurement' },

  // ───── Site & Construction ─────
  { id: 'tasks', label: 'المهام', labelEn: 'Tasks', icon: ClipboardList, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'site-visits', label: 'زيارات الموقع', labelEn: 'Site Visits', icon: MapPin, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'site-diary', label: 'يوميات الموقع', labelEn: 'Site Diary', icon: BookOpen, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'inspections', label: 'التفتيش', labelEn: 'Inspections', icon: Eye, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'defects', label: 'العيوب', labelEn: 'Defects', icon: AlertTriangle, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'rfi', label: 'طلبات المعلومات', labelEn: 'RFI', icon: HelpCircle, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'submittals', label: 'المُرتجعات', labelEn: 'Submittals', icon: Send, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'transmittals', label: 'كشوف الإرسال', labelEn: 'Transmittals', icon: FileText, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'change-orders', label: 'أوامر التغيير', labelEn: 'Change Orders', icon: GitBranch, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'meetings', label: 'الاجتماعات', labelEn: 'Meetings', icon: Users, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'risks', label: 'المخاطر', labelEn: 'Risks', icon: AlertTriangle, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'supervision', label: 'الإشراف', labelEn: 'Supervision', icon: Eye, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'municipality-correspondence', label: 'المراسلات البلدية', labelEn: 'Municipality', icon: Building2, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },
  { id: 'design-management', label: 'إدارة التصميم', labelEn: 'Design Management', icon: Layers, category: 'الموقع والإنشاء', categoryEn: 'Site & Construction' },

  // ───── Reports ─────
  { id: 'reports', label: 'التقارير', labelEn: 'Reports', icon: BarChart3, category: 'التقارير', categoryEn: 'Reports' },
  { id: 'report-builder', label: 'منشئ التقارير', labelEn: 'Report Builder', icon: FileBarChart, category: 'التقارير', categoryEn: 'Reports' },
  { id: 'boq', label: 'جدول الكميات', labelEn: 'BOQ', icon: Table, category: 'التقارير', categoryEn: 'Reports' },

  // ───── Help & AI ─────
  { id: 'ai-assistant', label: 'المساعد الذكي', labelEn: 'AI Assistant', icon: Sparkles, category: 'المساعدة', categoryEn: 'Help & AI' },
  { id: 'knowledge', label: 'قاعدة المعرفة', labelEn: 'Knowledge Base', icon: BookMarked, category: 'المساعدة', categoryEn: 'Help & AI' },
  { id: 'help', label: 'المساعدة', labelEn: 'Help', icon: HelpCircle, category: 'المساعدة', categoryEn: 'Help & AI' },

  // ───── System ─────
  { id: 'features-hub', label: 'المميزات المتقدمة', labelEn: 'Advanced Features', icon: Zap, category: 'النظام', categoryEn: 'System' },
  { id: 'admin', label: 'إدارة النظام', labelEn: 'System Admin', icon: Shield, category: 'النظام', categoryEn: 'System' },
  { id: 'settings', label: 'الإعدادات', labelEn: 'Settings', icon: SettingsIcon, category: 'النظام', categoryEn: 'System' },
  { id: 'profile', label: 'الملف الشخصي', labelEn: 'Profile', icon: User, category: 'النظام', categoryEn: 'System' },
  { id: 'automations', label: 'الأتمتة', labelEn: 'Automations', icon: Cog, category: 'النظام', categoryEn: 'System' },
];

interface CommandPaletteProps {
  /** Controlled open state */
  open: boolean;
  /** Callback to toggle open state */
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevSearchRef = useRef(search);
  const { ar, t } = useLanguage();
  const setCurrentPage = useNavStore((s) => s.setCurrentPage);

  // All commands (navigation + quick actions)
  const allCommands = useMemo((): CommandItem[] => {
    const actionCommands: CommandItem[] = [
      {
        id: 'action-ask-ai',
        label: 'اسأل المساعد الذكي',
        labelEn: 'Ask AI Assistant',
        icon: Sparkles,
        category: 'إجراءات سريعة',
        categoryEn: 'Quick Actions',
        action: () => setCurrentPage('ai-assistant'),
      },
    ];
    return [...actionCommands, ...navCommands];
  }, [setCurrentPage]);

  // Filter commands based on bilingual search
  const filteredCommands = allCommands.filter(
    (cmd) =>
      cmd.label.includes(search) ||
      cmd.labelEn.toLowerCase().includes(search.toLowerCase()) ||
      cmd.category.includes(search) ||
      cmd.categoryEn.toLowerCase().includes(search.toLowerCase())
  );

  // Group commands by category
  const groupedCommands = filteredCommands.reduce<Record<string, CommandItem[]>>(
    (acc, cmd) => {
      if (!acc[cmd.category]) acc[cmd.category] = [];
      acc[cmd.category].push(cmd);
      return acc;
    },
    {}
  );

  // Focus input and reset state when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      // Small delay to ensure Dialog has mounted
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
      // Defer setState to avoid synchronous setState in effect
      const id = requestAnimationFrame(() => {
        setSearch('');
        setSelectedIndex(0);
      });
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Reset selected index when search changes
  useEffect(() => {
    if (prevSearchRef.current !== search) {
      // Defer to avoid synchronous setState in effect
      const id = requestAnimationFrame(() => setSelectedIndex(0));
      prevSearchRef.current = search;
      return () => cancelAnimationFrame(id);
    }
  }, [search]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        handleCommandSelect(filteredCommands[selectedIndex]);
      }
    }
  };

  // Handle command selection
  const handleCommandSelect = (cmd: CommandItem) => {
    if (cmd.action) {
      cmd.action();
    } else {
      setCurrentPage(cmd.id);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-xl p-0 gap-0 overflow-hidden"
        dir={ar ? 'rtl' : 'ltr'}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/40">
          <Search className="w-5 h-5 text-slate-400 dark:text-slate-500 shrink-0" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('ابحث عن صفحة أو إجراء...', 'Search for a page or action...')}
            className="border-0 shadow-none focus-visible:ring-0 px-0 bg-transparent text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs rounded border border-slate-200 dark:border-slate-700 hidden sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-y-auto p-2">
          {Object.entries(groupedCommands).map(([category, cmds]) => (
            <div key={category}>
              <p className="px-3 py-2 text-xs text-slate-400 dark:text-slate-500 font-medium">
                {t(category, cmds[0]?.categoryEn || category)}
              </p>
              {cmds.map((cmd) => {
                const Icon = cmd.icon;
                const globalIndex = filteredCommands.indexOf(cmd);
                const isAction = cmd.id.startsWith('action-');
                const isSelected = selectedIndex === globalIndex;

                return (
                  <button
                    key={cmd.id}
                    onClick={() => handleCommandSelect(cmd)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors cursor-pointer',
                      isSelected
                        ? 'bg-teal-500/10 text-teal-600 dark:text-teal-400'
                        : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100/80 dark:hover:bg-slate-800/60'
                    )}
                  >
                    <div
                      className={cn(
                        'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
                        isSelected
                          ? 'bg-teal-100 dark:bg-teal-900/40'
                          : 'bg-slate-100 dark:bg-slate-800'
                      )}
                    >
                      <Icon
                        className={cn(
                          'w-4 h-4',
                          isSelected
                            ? 'text-teal-600 dark:text-teal-400'
                            : 'text-slate-500 dark:text-slate-400'
                        )}
                      />
                    </div>
                    <span className={cn('flex-1 text-sm font-medium', ar ? 'text-right' : 'text-left')}>
                      {t(cmd.label, cmd.labelEn)}
                    </span>
                    {isAction && (
                      <Badge
                        variant="outline"
                        className="text-[10px] border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500"
                      >
                        {t('إجراء', 'Action')}
                      </Badge>
                    )}
                    {isSelected &&
                      (ar ? (
                        <ChevronLeft className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-teal-500 dark:text-teal-400" />
                      ))}
                  </button>
                );
              })}
            </div>
          ))}

          {filteredCommands.length === 0 && (
            <div className="py-8 text-center text-slate-400 dark:text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">
                {t(`لا توجد نتائج لـ "${search}"`, `No results for "${search}"`)}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-200/60 dark:border-slate-700/40 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">↑↓</kbd>
              {t('للتنقل', 'Navigate')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700">↵</kbd>
              {t('للاختيار', 'Select')}
            </span>
          </div>
          <span className="font-medium">Blue</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ───── Hook: useCommandPalette ─────
// Convenience hook to manage the command palette open state.
// Drop this into any parent component (e.g. app-layout) to enable Ctrl+K.

export function useCommandPalette() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return { open, onOpenChange: setOpen };
}
