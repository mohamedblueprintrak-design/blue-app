"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const SupervisionPage = dynamic(() => import("@/components/pages/supervision"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/supervision
 */
export default function SupervisionPageRoute() {
  return <SupervisionPage language={useLang()} />;
}
