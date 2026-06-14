"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const BidsPage = dynamic(() => import("@/components/pages/bids"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/bids
 */
export default function BidsPageRoute() {
  return <BidsPage language={useLang()} />;
}
