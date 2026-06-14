"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const SearchPage = dynamic(() => import("@/components/pages/search"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/search
 */
export default function SearchPageRoute() {
  return <SearchPage language={useLang()} />;
}
