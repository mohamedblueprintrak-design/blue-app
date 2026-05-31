"use client";

import { useNavStore } from "@/store/nav-store";
import { useQuery } from "@tanstack/react-query";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbsProps {
  language: "ar" | "en";
}

const pageLabels: Record<string, { ar: string; en: string }> = {
  projects: { ar: "المشاريع", en: "Projects" },
  tasks: { ar: "المهام", en: "Tasks" },
  clients: { ar: "العملاء", en: "Clients" },
  contracts: { ar: "العقود", en: "Contracts" },
  documents: { ar: "المستندات", en: "Documents" },
  site: { ar: "إدارة الموقع", en: "Site Management" },
  FINANCIAL: { ar: "المالية", en: "Financial" },
  procurement: { ar: "المشتريات", en: "Procurement" },
  hr: { ar: "الموارد البشرية", en: "Human Resources" },
  transmittals: { ar: "الإحالات", en: "Transmittals" },
  risks: { ar: "إدارة المخاطر", en: "Risk Management" },
  meetings: { ar: "الاجتماعات", en: "Meetings" },
  calendar: { ar: "التقويم", en: "Calendar" },
  knowledge: { ar: "قاعدة المعرفة", en: "Knowledge Base" },
  reports: { ar: "التقارير", en: "Reports" },
  notifications: { ar: "الإشعارات", en: "Notifications" },
  search: { ar: "البحث", en: "Search" },
  settings: { ar: "الإعدادات", en: "Settings" },
  admin: { ar: "إدارة النظام", en: "System Admin" },
  "ai-assistant": { ar: "المساعد الذكي", en: "AI Assistant" },
  "site-visits": { ar: "زيارات الموقع", en: "Site Visits" },
  "site-diary": { ar: "يومية الموقع", en: "Site Diary" },
  "site-rfi": { ar: "طلبات المعلومات", en: "RFI" },
  "site-defects": { ar: "العيوب", en: "Defects" },
  "site-submittals": { ar: "المستندات المقدمة", en: "Submittals" },
  "site-change-orders": { ar: "أوامر التغيير", en: "Change Orders" },
  "financial-invoices": { ar: "الفواتير", en: "Invoices" },
  "financial-payments": { ar: "المدفوعات", en: "Payments" },
  "financial-proposals": { ar: "العروض المالية", en: "Proposals" },
  "financial-bids": { ar: "العطاءات", en: "Bids" },
  "financial-budgets": { ar: "الميزانيات", en: "Budgets" },
  "hr-employees": { ar: "الموظفون", en: "Employees" },
  "hr-attendance": { ar: "الحضور والانصراف", en: "Attendance" },
  "hr-leave": { ar: "الإجازات", en: "Leave Management" },
  "hr-workload": { ar: "أعباء العمل", en: "Workload" },
  "procurement-suppliers": { ar: "الموردين", en: "Suppliers" },
  "procurement-inventory": { ar: "المخزون", en: "Inventory" },
  "procurement-purchase-orders": { ar: "أوامر الشراء", en: "Purchase Orders" },
  "procurement-equipment": { ar: "المعدات", en: "Equipment" },
};

// Map sub-pages to their parent for breadcrumb hierarchy
function getParentPage(page: string): string | null {
  if (page.startsWith("site-")) return "site";
  if (page.startsWith("financial-")) return "FINANCIAL";
  if (page.startsWith("hr-")) return "hr";
  if (page.startsWith("procurement-")) return "procurement";
  return null;
}

export default function Breadcrumbs({ language }: BreadcrumbsProps) {
  const { currentPage, currentProjectId, setCurrentPage, setCurrentProjectId } = useNavStore();
  const isAr = language === "ar";

  // Fetch project name if a project is selected
  const { data: project } = useQuery({
    queryKey: ["project-breadcrumb", currentProjectId],
    queryFn: async () => {
      if (!currentProjectId) return null;
      const res = await fetch(`/api/projects/${currentProjectId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!currentProjectId && (currentPage === "projects" || currentPage.startsWith("projects")),
  });

  // Don't show breadcrumbs on dashboard
  if (currentPage === "dashboard") return null;

  const t = (ar: string, en: string) => (isAr ? ar : en);
  const label = pageLabels[currentPage];
  const currentPageLabel = label ? t(label.ar, label.en) : currentPage;

  // Build breadcrumb items
  const crumbs: { label: string; isCurrent: boolean; onClick?: () => void }[] = [];

  // Dashboard as root
  crumbs.push({
    label: t("لوحة التحكم", "Dashboard"),
    isCurrent: false,
    onClick: () => {
      setCurrentPage("dashboard");
      setCurrentProjectId(null);
    },
  });

  // Parent page if exists
  const parentPage = getParentPage(currentPage);
  if (parentPage) {
    const parentLabel = pageLabels[parentPage];
    crumbs.push({
      label: parentLabel ? t(parentLabel.ar, parentLabel.en) : parentPage,
      isCurrent: false,
      onClick: () => setCurrentPage(parentPage),
    });
  }

  // Current page
  crumbs.push({
    label: currentPageLabel,
    isCurrent: !currentProjectId,
    onClick: currentProjectId
      ? () => {
          setCurrentPage(currentPage);
          setCurrentProjectId(null);
        }
      : undefined,
  });

  // Project name if selected
  if (currentProjectId && project) {
    const projectName = isAr ? project.name : project.nameEn || project.name;
    crumbs.push({
      label: projectName || t("تفاصيل المشروع", "Project Details"),
      isCurrent: true,
    });
  }

  return (
    <div className="px-4 lg:px-6 py-2 bg-white/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/50">
      <Breadcrumb>
        <BreadcrumbList className="text-xs">
          {crumbs.map((crumb, idx) => {
            const isLast = idx === crumbs.length - 1;
            return (
              <span key={idx} className="contents">
                <BreadcrumbItem>
                  {crumb.isCurrent ? (
                    <BreadcrumbPage className="text-slate-900 dark:text-white font-medium">
                      {crumb.label}
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        crumb.onClick?.();
                      }}
                      className="text-slate-500 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast && (
                  <BreadcrumbSeparator>
                    <ChevronLeft className={cn("h-3 w-3", isAr ? "rotate-0" : "rotate-180")} />
                  </BreadcrumbSeparator>
                )}
              </span>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
