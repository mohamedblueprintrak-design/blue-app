"use client";

import dynamic from "next/dynamic";

const ProposalsPage = dynamic(() => import("@/components/pages/proposals"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/proposals
 */
export default function ProposalsPageRoute() {
  return <ProposalsPage />;
}
