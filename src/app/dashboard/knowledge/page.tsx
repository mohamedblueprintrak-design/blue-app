"use client";

import dynamic from "next/dynamic";

const KnowledgePage = dynamic(() => import("@/components/pages/knowledge"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/knowledge
 */
export default function KnowledgePageRoute() {
  return <KnowledgePage />;
}
