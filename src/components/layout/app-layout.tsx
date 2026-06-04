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
import { usePushNotifications } from "@/hooks/use-push-notifications";
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

import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { GuidedTour } from "@/components/guided-tour";
import { useTranslations, useLocale } from "next-intl";

// ===== MAIN APP LAYOUT =====

// ===== MAIN APP LAYOUT =====
interface AppLayoutProps {
  language: "ar" | "en";
}

export default function AppLayout({ language }: AppLayoutProps) {
  const { currentPage, currentProjectId } = useNavStore();
  const locale = useLocale();
  const t = useTranslations("layout");
  const isAr = locale === "ar";

  useKeyboardShortcuts();
  usePushNotifications();

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

        <main className="flex-1 p-4 lg:p-6 bg-slate-50 dark:bg-slate-950 dot-pattern-content custom-scrollbar overflow-y-auto" role="main" aria-label={t("mainContent")}>
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
                    {t("underDevelopment")}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md">
                    {t("underDevelopmentDesc")}
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
      
      {/* Guided Tour for Demo Mode */}
      <GuidedTour language={language} />

      {/* Onboarding wizard — shown as overlay for new users */}
      {showOnboarding && onboardingChecked && (
        <OnboardingWizard language={language} onComplete={handleOnboardingComplete} />
      )}
    </SidebarProvider>
  );
}
