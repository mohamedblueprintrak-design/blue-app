import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useNavStore } from "@/store/nav-store";
import { useLanguage } from "@/hooks/use-lang";
import { normalizeRole, roleLabelsAr, type Role } from "@/lib/permissions";
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
import { Search, Globe, Settings, LogOut } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import NotificationDropdown from "@/components/notification-dropdown";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

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


export { AppHeader };