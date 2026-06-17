"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const FeaturesHubPage = dynamic(() => import("@/components/pages/features-hub"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/features-hub
 */
export default function FeaturesHubPageRoute() {
  return <FeaturesHubPage language={useLang()} />;
}
