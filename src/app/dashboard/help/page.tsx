"use client";

import dynamic from "next/dynamic";

const HelpPage = dynamic(() => import("@/components/pages/help"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/help
 */
export default function HelpPageRoute() {
  return <HelpPage />;
}
