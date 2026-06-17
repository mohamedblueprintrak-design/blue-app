"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const AutomationsPage = dynamic(() => import("@/components/pages/automations"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/automations
 */
export default function AutomationsPageRoute() {
  return <AutomationsPage language={useLang()} />;
}
