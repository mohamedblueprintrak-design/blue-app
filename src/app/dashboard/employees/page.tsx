"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const EmployeesPage = dynamic(() => import("@/components/pages/employees"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/employees
 */
export default function EmployeesPageRoute() {
  return <EmployeesPage language={useLang()} />;
}
