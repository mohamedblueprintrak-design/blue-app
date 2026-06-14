"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const SettingsPage = dynamic(() => import("@/components/pages/settings"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/settings
 */
export default function SettingsPageRoute() {
  return <SettingsPage language={useLang()} />;
}
