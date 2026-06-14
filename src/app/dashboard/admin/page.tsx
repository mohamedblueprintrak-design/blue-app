"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const AdminPage = dynamic(() => import("@/components/pages/admin"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/admin
 */
export default function AdminPageRoute() {
  return <AdminPage language={useLang()} />;
}
