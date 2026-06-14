"use client";

import dynamic from "next/dynamic";

const AiAssistantPage = dynamic(() => import("@/components/pages/ai-assistant"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/ai-assistant
 */
export default function AiAssistantPageRoute() {
  return <AiAssistantPage />;
}
