"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const Dashboard = dynamic(() => import("@/components/pages/dashboard"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard — root dashboard route.
 *
 * This file is required because the previous implementation used a catch-all
 * route (`[[...slug]]/page.tsx`) to handle the dashboard root. Now that
 * file-based routing is the default, each route must have its own page.tsx.
 *
 * The Dashboard component renders the main KPI/overview widgets, recent
 * activity, and quick actions. It is the default landing page after login.
 */
export default function DashboardRoute() {
  return <Dashboard language={useLang()} />;
}
