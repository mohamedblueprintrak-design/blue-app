"use client";

import { useState, useEffect, useCallback, Fragment, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import { useNavStore } from "@/store/nav-store";
import { getNavItems, normalizeRole, roleLabelsAr, type NavItem, type Role } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Search,
  Bell,
  Globe,
  LogOut,
  User,
  Settings,
  LayoutDashboard,
  FolderKanban,
  HardHat,
  Truck,
  Package,
  Warehouse,
  UsersRound,
  Clock,
  CalendarOff,
  BarChart3,
  ChevronDown,
  Activity,
  Sparkles,
  AlertTriangle,
  Shield,
  // ShieldCheck,
  PenTool,
  Gavel,
  SearchCheck,
  ClipboardCheck,
  Gift,
  UserPlus,
  BookOpen,
  Plus,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Wind,
  Headphones,
  Calendar,
  BookMarked,
  type LucideIcon,
} from "lucide-react";
import dynamic from 'next/dynamic';

// Loading fallback for dynamic imports
const PageLoading = () => (
  <PageLoadingSkeleton statCards={3} showChart={false} />
);

// Heavy components loaded dynamically for better initial load time
const Dashboard = dynamic(() => import("@/components/pages/dashboard"), { loading: PageLoading });
const ProjectDetail = dynamic(() => import("@/components/pages/project-detail"), { loading: PageLoading });
const FeaturesHub = dynamic(() => import("@/components/pages/features-hub"), { loading: PageLoading });
const AIAssistant = dynamic(() => import("@/components/pages/ai-assistant"), { loading: PageLoading });
const ContractorsPage = dynamic(() => import("@/components/pages/contractors"), { loading: PageLoading });
const ClientsPage = dynamic(() => import("@/components/pages/clients"), { loading: PageLoading });
const RetainagePage = dynamic(() => import("@/components/pages/retainage"), { loading: PageLoading });
const GuaranteeLettersPage = dynamic(() => import("@/components/pages/guarantee-letters"), { loading: PageLoading });
const ProgressClaimsPage = dynamic(() => import("@/components/pages/progress-claims"), { loading: PageLoading });
const TasksPage = dynamic(() => import("@/components/pages/tasks"), { loading: PageLoading });
const InvoicesPage = dynamic(() => import("@/components/pages/invoices"), { loading: PageLoading });
const ContractsPage = dynamic(() => import("@/components/pages/contracts"), { loading: PageLoading });
const DocumentsPage = dynamic(() => import("@/components/pages/documents"), { loading: PageLoading });
const SiteVisitsPage = dynamic(() => import("@/components/pages/site-visits"), { loading: PageLoading });
const MeetingsPage = dynamic(() => import("@/components/pages/meetings"), { loading: PageLoading });
const TransmittalsPage = dynamic(() => import("@/components/pages/transmittals"), { loading: PageLoading });
const RisksPage = dynamic(() => import("@/components/pages/risks"), { loading: PageLoading });
const ActivityLogPage = dynamic(() => import("@/components/pages/activity-log"), { loading: PageLoading });
const ProposalsPage = dynamic(() => import("@/components/pages/proposals"), { loading: PageLoading });
const BidsPage = dynamic(() => import("@/components/pages/bids"), { loading: PageLoading });
const SuppliersPage = dynamic(() => import("@/components/pages/suppliers"), { loading: PageLoading });
const InventoryPage = dynamic(() => import("@/components/pages/inventory"), { loading: PageLoading });
const PurchaseOrdersPage = dynamic(() => import("@/components/pages/purchase-orders"), { loading: PageLoading });
const EquipmentPage = dynamic(() => import("@/components/pages/equipment"), { loading: PageLoading });
const TendersPage = dynamic(() => import("@/components/pages/tenders"), { loading: PageLoading });
const PaymentsPage = dynamic(() => import("@/components/pages/payments"), { loading: PageLoading });
const BudgetsPage = dynamic(() => import("@/components/pages/budgets"), { loading: PageLoading });
const SiteDiaryPage = dynamic(() => import("@/components/pages/site-diary"), { loading: PageLoading });
const RFIPage = dynamic(() => import("@/components/pages/rfi"), { loading: PageLoading });
const DefectsPage = dynamic(() => import("@/components/pages/defects"), { loading: PageLoading });
const SubmittalsPage = dynamic(() => import("@/components/pages/submittals"), { loading: PageLoading });
const ChangeOrdersPage = dynamic(() => import("@/components/pages/change-orders"), { loading: PageLoading });
const AttendancePage = dynamic(() => import("@/components/pages/attendance"), { loading: PageLoading });
const LeavePage = dynamic(() => import("@/components/pages/leave"), { loading: PageLoading });
const WorkloadPage = dynamic(() => import("@/components/pages/workload"), { loading: PageLoading });

// Lighter components imported statically (loaded quickly)
import ProjectsList from "@/components/pages/projects";
import ReportsPage from "@/components/pages/reports";
import FinanceRevenuePage from "@/components/pages/finance-revenue";
import FinanceExpensesPage from "@/components/pages/finance-expenses";
import EmployeesHub from "@/components/pages/employees-hub";
import NotificationsPage from "@/components/pages/notifications";
import SettingsPage from "@/components/pages/settings";
import AdminPanel from "@/components/pages/admin";
import KnowledgePage from "@/components/pages/knowledge";
import CalendarPage from "@/components/pages/calendar";
import SearchPage from "@/components/pages/search";

import { useLanguage } from "@/hooks/use-lang";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import Breadcrumbs from "@/components/layout/breadcrumbs";
import QuickActions from "@/components/layout/quick-actions";
import WelcomeModal from "@/components/layout/welcome-modal";
import OnboardingWizard from "@/components/onboarding/onboarding-wizard";
import ShortcutsOverlay from "@/components/layout/shortcuts-overlay";
import SidebarStats from "@/components/layout/sidebar-stats";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import NotificationDropdown from "@/components/notification-dropdown";
import WelcomeNotification from "@/components/welcome-notification";
import { ThemeToggle } from "@/components/theme-toggle";
import ErrorBoundary from '@/components/common/error-boundary';
import { SkipNavContent } from '@/components/common/accessible-components';
import { PageLoadingSkeleton } from '@/components/common/page-loading-skeleton';
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import LogoImage from "@/components/ui/logo-image";

// ===== ICON MAP =====
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  FolderKanban,
  HardHat,
  Truck,
  Package,
  Warehouse,
  Settings,
  UsersRound,
  Clock,
  CalendarOff,
  BarChart3,
  Shield,
  Activity,
  Sparkles,
  AlertTriangle,
  Gavel,
  PenTool,
  Search,
  SearchCheck,
  ClipboardCheck,
  Gift,
  Bell,
  User,
  UserPlus,
  BookOpen,
  Plus,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Wind,
  Headphones,
  Calendar,
  BookMarked,
};

function getIcon(iconName: string): LucideIcon {
  return iconMap[iconName] || LayoutDashboard;
}

// ===== SIDEBAR QUICK STATS =====
function SidebarQuickStats() {
  const { language } = useLanguage();

  const { data } = useQuery({
    queryKey: ["sidebar-stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard?statsOnly=true");
      if (!res.ok) return null;
      return res.json() as Promise<{ stats?: { activeProjects: number }; overdueTasksCount?: number } | null>;
    },
    refetchInterval: 60000,
  });

  const activeProjects = data?.stats?.activeProjects ?? 0;
  const overdueTasks = data?.overdueTasksCount ?? 0;

  return (
    <div className="px-2 py-2 space-y-2">
      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-md bg-slate-50/60 dark:bg-slate-800/30">
        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <Activity className="h-3 w-3 text-teal-500" />
          {language === "ar" ? "المشاريع النشطة" : "Active Projects"}
        </span>
        <span className="font-bold text-teal-600 dark:text-teal-400 tabular-nums">{activeProjects}</span>
      </div>
      <div className="flex items-center justify-between text-[11px] px-2 py-1 rounded-md bg-slate-50/60 dark:bg-slate-800/30">
        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          <AlertTriangle className="h-3 w-3 text-amber-500" />
          {language === "ar" ? "المهام المستحقة" : "Overdue Tasks"}
        </span>
        <span className={`font-bold tabular-nums ${overdueTasks > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`}>
          {overdueTasks}
        </span>
      </div>
    </div>
  );
}



// ===== NAV SECTION HELPERS =====
const MAIN_NAV_IDS = ["dashboard", "clients", "projects", "contractors"];
const BUSINESS_NAV_IDS = ["finance", "employees"];
const TOOLS_NAV_IDS = ["help", "features-hub"];
const SYSTEM_NAV_IDS = ["admin"];

function groupNavItems(items: NavItem[]) {
  return {
    main: items.filter((i) => MAIN_NAV_IDS.includes(i.id)),
    business: items.filter((i) => BUSINESS_NAV_IDS.includes(i.id)),
    tools: items.filter((i) => TOOLS_NAV_IDS.includes(i.id)),
    system: items.filter((i) => SYSTEM_NAV_IDS.includes(i.id)),
  };
}

// ===== SIDEBAR NAV COMPONENT =====
function AppSidebar() {
  const { user } = useAuthStore();
  const { currentPage, setCurrentPage } = useNavStore();
  const { t, isAr } = useLanguage();
  const [expandedItems, setExpandedItems] = useState<string[]>(["projects"]);
  const { state } = useSidebar();

  if (!user) return null;

  const navItems = getNavItems(user.role);
  const sidebarSide = isAr ? "right" : "left";
  const groups = groupNavItems(navItems);

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleNavClick = (item: NavItem) => {
    if (item.href) {
      // External navigation — open href in same tab
      window.location.href = item.href;
    } else if (item.children && item.children.length > 0) {
      toggleExpanded(item.id);
    } else {
      setCurrentPage(item.id);
    }
  };

  // Reusable nav item renderer
  const renderNavItem = (item: NavItem) => {
    const Icon = getIcon(item.icon);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.id);
    const isActive = currentPage === item.id || item.children?.some((c) => currentPage === c.id);

    return (
      <SidebarMenuItem key={item.id}>
        {hasChildren ? (
          <>
            <SidebarMenuButton
              isActive={isActive}
              onClick={() => handleNavClick(item)}
              tooltip={t(item.labelAr, item.labelEn)}
            >
              <Icon className="h-[18px] w-[18px]" />
              <span>{t(item.labelAr, item.labelEn)}</span>
              <ChevronDown
                className={cn(
                  "ms-auto h-4 w-4 shrink-0 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </SidebarMenuButton>
            {isExpanded && (
              <SidebarMenuSub>
                {item.children!.map((child) => {
                  const ChildIcon = getIcon(child.icon);
                  return (
                    <SidebarMenuSubItem key={child.id}>
                      <SidebarMenuSubButton
                        isActive={currentPage === child.id}
                        onClick={() => handleNavClick(child)}
                      >
                        <ChildIcon className="h-3.5 w-3.5" />
                        <span>{t(child.labelAr, child.labelEn)}</span>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  );
                })}
              </SidebarMenuSub>
            )}
          </>
        ) : (
          <SidebarMenuButton
            isActive={currentPage === item.id}
            onClick={() => setCurrentPage(item.id)}
            tooltip={t(item.labelAr, item.labelEn)}
          >
            <Icon className="h-[18px] w-[18px]" />
            <span>{t(item.labelAr, item.labelEn)}</span>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    );
  };

  return (
    <Sidebar side={sidebarSide} collapsible="icon" className="border-slate-200/60 dark:border-slate-700/40 sidebar-enhanced">
      <SidebarHeader className="p-3 pb-2">
        <div className={cn(
          "flex items-center gap-3 px-2 py-1.5",
          state === "collapsed" && "justify-center px-0"
        )}>
          <LogoImage size={38} className="shrink-0 shadow-md shadow-teal-500/20 rounded-lg" />
          {state !== "collapsed" && (
            <div className="flex flex-col">
              <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight leading-none">
                BluePrint
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 leading-none mt-1">
                {t("نظام إدارة الاستشارات", "Consultancy Management")}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <Separator className="mx-3 w-auto opacity-60" />

      <SidebarContent className="px-2 py-1.5">
        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel>
            {t("الرئيسية", "Main")}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {groups.main.map(renderNavItem)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Business Management */}
        {groups.business.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {t("الإدارة", "Management")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {groups.business.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Tools & Help */}
        {groups.tools.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {t("الأدوات", "Tools")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {groups.tools.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* System Admin */}
        {groups.system.length > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>
              {t("النظام", "System")}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0.5">
                {groups.system.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-3 pt-1">
        {state !== "collapsed" && <SidebarQuickStats />}
        {state !== "collapsed" && <SidebarStats />}
        <Separator className="my-2 opacity-60" />
        <div className={cn(
          "sidebar-user-card flex items-center gap-3 rounded-lg px-2.5 py-2 transition-all duration-200",
          state === "collapsed" && "justify-center px-0 rounded-none"
        )}>
          <Avatar className="h-8 w-8 shrink-0 ring-2 ring-teal-200/60 dark:ring-teal-800/60">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs font-semibold">
              {user.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {state !== "collapsed" && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold text-slate-900 dark:text-white truncate leading-none">
                {user.name}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate leading-none mt-0.5">
                {roleLabelsAr[normalizeRole(user.role) as Role] || user.role}
              </span>
            </div>
          )}
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

// ===== PAGE TITLE MAPPING =====
const pageTitleMap: Record<string, { ar: string; en: string }> = {
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  projects: { ar: "المشاريع", en: "Projects" },
  clients: { ar: "العملاء", en: "Clients" },
  contractors: { ar: "المقاولون", en: "Contractors" },
  "finance-revenue": { ar: "الإيرادات", en: "Revenue" },
  "finance-expenses": { ar: "المصروفات", en: "Expenses" },
  "finance-reports": { ar: "التقارير المالية", en: "Financial Reports" },
  employees: { ar: "الموظفين", en: "Employees" },
  "features-hub": { ar: "المميزات المتقدمة", en: "Advanced Features" },
  "ai-assistant": { ar: "المساعد الذكي", en: "AI Assistant" },
  knowledge: { ar: "قاعدة المعرفة", en: "Knowledge Base" },
  calendar: { ar: "التقويم", en: "Calendar" },
  search: { ar: "البحث", en: "Search" },
  admin: { ar: "إدارة النظام", en: "System Admin" },
  settings: { ar: "الإعدادات", en: "Settings" },
  notifications: { ar: "الإشعارات", en: "Notifications" },
  "finance-retainage": { ar: "إدارة الاحتجاز", en: "Retainage Management" },
  "finance-guarantees": { ar: "خطابات الضمان", en: "Guarantee Letters" },
  "finance-progress-claims": { ar: "مطالبات التقدم", en: "Progress Claims" },
};

// ===== HEADER COMPONENT =====
function AppHeader() {
  const { user, logout } = useAuthStore();
  const { currentPage, setCurrentPage } = useNavStore();
  const { language, toggleLanguage, t, isAr } = useLanguage();
  const [searchFocused, setSearchFocused] = useState(false);

  const pageTitle = pageTitleMap[currentPage] || { ar: "لوحة التحكم", en: "Dashboard" };

  const handleLogout = () => {
    logout();
  };

  // Keyboard shortcut for search (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCurrentPage("search");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setCurrentPage]);

  return (
    <header className="relative sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/60 dark:border-slate-700/40 bg-gradient-to-r from-white/90 via-white/85 to-teal-50/80 dark:from-slate-900/90 dark:via-slate-900/85 dark:to-teal-950/80 backdrop-blur-xl shadow-sm shadow-slate-200/30 dark:shadow-slate-900/30 px-4 lg:px-6">
      {/* Teal gradient accent line at top */}
      <div className="absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-teal-500 via-cyan-400 to-teal-500 dark:from-teal-400 dark:via-cyan-300 dark:to-teal-400" />

      <SidebarTrigger className="-ms-1" />
      <Separator orientation="vertical" className="h-6" />

      {/* Page Title */}
      <h1 className="text-base font-semibold text-slate-900 dark:text-white flex-1 truncate">
        {t(pageTitle.ar, pageTitle.en)}
      </h1>

      {/* Action Buttons */}
      <div className="flex items-center gap-1">
        {/* Search Bar - Desktop */}
        <div className={cn(
          "hidden md:flex items-center relative rounded-lg border overflow-hidden transition-all duration-300 ease-out",
          searchFocused
            ? "w-72 border-teal-400/50 bg-white dark:bg-slate-800 search-bar-glow"
            : "w-48 border-slate-200/80 dark:border-slate-700/50 bg-slate-50/80 dark:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-600"
        )}>
          <Search className={cn(
            "absolute start-3 h-3.5 w-3.5 pointer-events-none transition-colors duration-200",
            searchFocused ? "text-teal-500" : "text-slate-400"
          )} />
          <input
            type="text"
            placeholder={t("بحث...", "Search...")}
            className={cn(
              "h-9 w-full bg-transparent ps-9 pe-16 text-xs text-slate-900 dark:text-white",
              "placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none",
              "transition-all duration-200"
            )}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setCurrentPage("search");
                (e.target as HTMLInputElement).blur();
                setSearchFocused(false);
              }
            }}
          />
          <kbd className={cn(
            "absolute end-2 pointer-events-none inline-flex h-5 items-center rounded border px-1.5 font-mono text-[10px] font-medium transition-all duration-200",
            searchFocused
              ? "border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-900/30 text-teal-600 dark:text-teal-400 opacity-0"
              : "border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500"
          )}>
            ⌘K
          </kbd>
        </div>

        {/* Search Button - Mobile */}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 transition-all duration-200"
                onClick={() => setCurrentPage("search")}
                aria-label="Search"
              >
                <Search className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{t("البحث", "Search")}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Language Toggle */}
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/60 transition-all duration-200"
                onClick={toggleLanguage}
                aria-label="Toggle language"
              >
                <Globe className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{language === "ar" ? "English" : "عربي"}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Theme Toggle */}
        <ThemeToggle label={t("الوضع الليلي", "Dark Mode")} />

        {/* Notifications Dropdown Bell */}
        <NotificationDropdown />

        <Separator orientation="vertical" className="h-6 mx-1" />

        {/* User Dropdown with Online Indicator */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 gap-2 px-2 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-200">
              <div className="relative">
                <Avatar className="h-7 w-7 ring-1 ring-slate-200/80 dark:ring-slate-700/60">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-xs font-semibold">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                {/* Online status green dot */}
                <span className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
              </div>
              <span className="hidden md:block text-sm font-medium text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                {user?.name}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isAr ? "start" : "end"} className="w-56 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700">
            <div className="px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <Avatar className="h-10 w-10 ring-2 ring-teal-200/40 dark:ring-teal-800/40">
                    <AvatarImage src={user?.avatar} alt={user?.name} />
                    <AvatarFallback className="bg-teal-100 dark:bg-teal-900 text-teal-700 dark:text-teal-300 text-sm font-semibold">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -end-0.5 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {t("متصل", "Online")}
                    </span>
                  </div>
                </div>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-2">{user?.email}</p>
              <Badge variant="secondary" className="mt-1 text-[10px] font-medium bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 hover:bg-teal-100 dark:hover:bg-teal-950/60 border-teal-200/60 dark:border-teal-800/40">
                {roleLabelsAr[normalizeRole(user?.role || '') as Role] || user?.role}
              </Badge>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer" onClick={() => useNavStore.getState().setCurrentPage("settings")}>
              <Settings className="me-2 h-4 w-4" />
              {t("الإعدادات", "Settings")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600" onClick={handleLogout}>
              <LogOut className="me-2 h-4 w-4" />
              {t("تسجيل الخروج", "Sign Out")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

// ===== MAIN APP LAYOUT =====
interface AppLayoutProps {
  language: "ar" | "en";
}

export default function AppLayout({ language }: AppLayoutProps) {
  const { currentPage, currentProjectId } = useNavStore();
  const isAr = language === "ar";

  useKeyboardShortcuts();

  const [showShortcuts, setShowShortcuts] = useState(false);

  // ===== Onboarding check =====
  // Check if the user has completed onboarding. We use a combination of:
  // 1. localStorage flag (fast, avoids flash of content on refresh)
  // 2. API check (authoritative, synced across devices)
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingChecked, setOnboardingChecked] = useState(false);

  useEffect(() => {
    // Fast path: if localStorage says completed, skip the API check
    const localFlag = localStorage.getItem("blueprint-onboarding-completed");
    if (localFlag === "true") {
      // Use requestAnimationFrame to avoid the cascading-render lint warning
      requestAnimationFrame(() => setOnboardingChecked(true));
      return;
    }

    // Otherwise, check the API
    fetch("/api/user/onboarding", { credentials: "include" })
      .then((res) => res.json())
      .then((data) => {
        if (data.onboardingCompleted) {
          localStorage.setItem("blueprint-onboarding-completed", "true");
        } else {
          setShowOnboarding(true);
        }
      })
      .catch(() => {
        // On error, don't show onboarding — graceful degradation
      })
      .finally(() => {
        setOnboardingChecked(true);
      });
  }, []);

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
  }, []);

  // Initialize navigation from URL hash on mount and listen for hash changes (browser back/forward)
  useEffect(() => {
    useNavStore.getState().initFromUrl();

    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "");
      const parts = hash.split("/");
      const page = parts[0] || "dashboard";
      const projectId = parts[1] || null;

      // Use getState() to read current store values and avoid stale closures
      const state = useNavStore.getState();

      // Only update if different to avoid loops
      if (page !== state.currentPage) {
        useNavStore.setState({ currentPage: page });
      }
      if (projectId !== state.currentProjectId) {
        useNavStore.setState({ currentProjectId: projectId });
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInputFocused = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (e.key === "?" && !isInputFocused) {
        e.preventDefault();
        setShowShortcuts((prev) => !prev);
        return;
      }

      if (e.key === "Escape" && showShortcuts) {
        setShowShortcuts(false);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showShortcuts]);

  useEffect(() => {
    document.documentElement.dir = isAr ? "rtl" : "ltr";
    document.documentElement.lang = isAr ? "ar" : "en";
  }, [isAr]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader />
        <Breadcrumbs language={language} />

        <main className="flex-1 p-4 lg:p-6 bg-slate-50 dark:bg-slate-950 dot-pattern-content custom-scrollbar overflow-y-auto" role="main" aria-label={language === "ar" ? "المحتوى الرئيسي" : "Main content"}>
          <SkipNavContent />
          <ErrorBoundary locale={language}>
          <Suspense fallback={<PageLoadingSkeleton />}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              {/* Dashboard */}
              {currentPage === "dashboard" && <Dashboard language={language} />}

              {/* Projects - List or Detail */}
              {currentPage === "projects" && (
                currentProjectId ? (
                  <ProjectDetail language={language} />
                ) : (
                  <ProjectsList language={language} />
                )
              )}

              {/* Clients (single page with internal tabs) */}
              {currentPage === "clients" && <ClientsPage language={language} />}

              {/* Contractors (single page with internal tabs) */}
              {currentPage === "contractors" && <ContractorsPage language={language} />}

              {/* Finance sub-menu */}
              {currentPage === "finance-revenue" && <FinanceRevenuePage language={language} />}
              {currentPage === "finance-expenses" && <FinanceExpensesPage language={language} />}
              {currentPage === "finance-reports" && <ReportsPage language={language} />}
              {currentPage === "finance-retainage" && <RetainagePage language={language} />}
              {currentPage === "finance-guarantees" && <GuaranteeLettersPage language={language} />}
              {currentPage === "finance-progress-claims" && <ProgressClaimsPage language={language} />}

              {/* Employees Hub (tabs: list, attendance, leave, workload) */}
              {currentPage === "employees" && <EmployeesHub language={language} />}

              {/* Advanced Features Hub */}
              {currentPage === "features-hub" && <FeaturesHub language={language} />}

              {/* Help & AI sub-pages */}
              {currentPage === "ai-assistant" && <AIAssistant language={language} />}
              {currentPage === "knowledge" && <KnowledgePage language={language} />}
              {currentPage === "calendar" && <CalendarPage language={language} />}
              {currentPage === "search" && <SearchPage language={language} />}

              {/* Admin */}
              {currentPage === "admin" && <AdminPanel language={language} />}

              {/* Settings — accessible from user dropdown */}
              {currentPage === "settings" && <SettingsPage language={language} />}

              {/* Notifications — accessible from header bell */}
              {currentPage === "notifications" && <NotificationsPage language={language} />}

              {/* Tasks — full kanban/list view */}
              {currentPage === "tasks" && <TasksPage language={language} />}

              {/* Finance sub-pages — invoices, payments, proposals, bids, budgets */}
              {currentPage === "financial-invoices" && <InvoicesPage language={language} />}
              {currentPage === "financial-payments" && <PaymentsPage language={language} />}
              {currentPage === "financial-proposals" && <ProposalsPage language={language} />}
              {currentPage === "financial-bids" && <BidsPage language={language} />}
              {currentPage === "financial-budgets" && <BudgetsPage language={language} />}

              {/* Contracts & Documents */}
              {currentPage === "contracts" && <ContractsPage language={language} />}
              {currentPage === "documents" && <DocumentsPage language={language} />}

              {/* Site & Field */}
              {currentPage === "site-visits" && <SiteVisitsPage language={language} />}
              {currentPage === "site" && <SiteVisitsPage language={language} />}
              {currentPage === "site-diary" && <SiteDiaryPage language={language} />}
              {currentPage === "site-rfi" && <RFIPage language={language} />}
              {currentPage === "site-defects" && <DefectsPage language={language} />}
              {currentPage === "site-submittals" && <SubmittalsPage language={language} />}
              {currentPage === "site-change-orders" && <ChangeOrdersPage language={language} />}

              {/* Meetings & Communication */}
              {currentPage === "meetings" && <MeetingsPage language={language} />}
              {currentPage === "transmittals" && <TransmittalsPage language={language} />}

              {/* Risk Management */}
              {currentPage === "risks" && <RisksPage language={language} />}

              {/* Activity & Audit */}
              {currentPage === "activity-log" && <ActivityLogPage language={language} />}

              {/* Procurement */}
              {currentPage === "procurement-suppliers" && <SuppliersPage language={language} />}
              {currentPage === "procurement-inventory" && <InventoryPage language={language} />}
              {currentPage === "procurement-purchase-orders" && <PurchaseOrdersPage language={language} />}
              {currentPage === "procurement-equipment" && <EquipmentPage language={language} />}
              {currentPage === "tenders" && <TendersPage language={language} />}

              {/* HR sub-pages */}
              {currentPage === "hr-employees" && <EmployeesHub language={language} />}
              {currentPage === "hr-attendance" && <AttendancePage language={language} />}
              {currentPage === "hr-leave" && <LeavePage language={language} />}
              {currentPage === "hr-workload" && <WorkloadPage language={language} />}

              {/* Placeholder for undefined pages */}
              {!["dashboard", "projects",
   "clients",
   "contractors",
   "finance-revenue", "finance-expenses", "finance-reports",
   "employees",
   "features-hub",
   "ai-assistant", "knowledge", "calendar", "search",
   "admin", "settings", "notifications",
   "finance-retainage", "finance-guarantees", "finance-progress-claims",
   "tasks", "financial-invoices", "financial-payments", "financial-proposals", "financial-bids", "financial-budgets",
   "contracts", "documents",
   "site-visits", "site", "site-diary", "site-rfi", "site-defects", "site-submittals", "site-change-orders",
   "meetings", "transmittals",
   "risks",
   "activity-log",
   "procurement-suppliers", "procurement-inventory", "procurement-purchase-orders", "procurement-equipment",
   "tenders",
   "hr-employees", "hr-attendance", "hr-leave", "hr-workload",
   ].includes(currentPage) && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                  <LogoImage size={64} className="mb-4 bg-slate-100 dark:bg-slate-800 [&>div]:opacity-40" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    {isAr ? "قيد التطوير" : "Under Development"}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                    {isAr ? "هذه الصفحة قيد التطوير" : "This page is under development"}
                  </p>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          </Suspense>
          </ErrorBoundary>
        </main>
      </SidebarInset>

      <QuickActions language={language} />
      {currentPage === "dashboard" && <WelcomeModal language={language} />}
      <WelcomeNotification />
      <ShortcutsOverlay language={language} open={showShortcuts} onOpenChange={setShowShortcuts} />
      <MobileBottomNav language={language} />

      {/* Onboarding wizard — shown as overlay for new users */}
      {showOnboarding && onboardingChecked && (
        <OnboardingWizard language={language} onComplete={handleOnboardingComplete} />
      )}
    </SidebarProvider>
  );
}
