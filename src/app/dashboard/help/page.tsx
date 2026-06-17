"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const HelpPage = dynamic(() => import("@/components/pages/help"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/help
 */
export default function HelpPageRoute() {
  return <HelpPage language={useLang()} />;
}
