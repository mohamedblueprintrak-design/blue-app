"use client";

import dynamic from "next/dynamic";

const TransmittalsPage = dynamic(() => import("@/components/pages/transmittals"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/transmittals
 */
export default function TransmittalsPageRoute() {
  return <TransmittalsPage />;
}
