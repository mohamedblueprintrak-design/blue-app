"use client";

import dynamic from "next/dynamic";

const BidsPage = dynamic(() => import("@/components/pages/bids"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/bids
 */
export default function BidsPageRoute() {
  return <BidsPage />;
}
