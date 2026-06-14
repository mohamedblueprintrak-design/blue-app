"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const SuppliersPage = dynamic(() => import("@/components/pages/suppliers"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/suppliers
 */
export default function SuppliersPageRoute() {
  return <SuppliersPage language={useLang()} />;
}
