"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const GuaranteeLettersPage = dynamic(() => import("@/components/pages/guarantee-letters"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/guarantee-letters
 */
export default function GuaranteeLettersPageRoute() {
  return <GuaranteeLettersPage language={useLang()} />;
}
