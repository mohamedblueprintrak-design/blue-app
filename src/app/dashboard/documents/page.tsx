"use client";

import dynamic from "next/dynamic";

const DocumentsPage = dynamic(() => import("@/components/pages/documents"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/documents
 */
export default function DocumentsPageRoute() {
  return <DocumentsPage />;
}
