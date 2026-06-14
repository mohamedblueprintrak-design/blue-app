"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const DashboardPage = dynamic(() => import("@/components/pages/dashboard"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard — Main Dashboard Page
 */
export default function DashboardHomeRoute() {
  return <DashboardPage language={useLang()} />;
}
