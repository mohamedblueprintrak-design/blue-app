"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const ClientsPage = dynamic(() => import("@/components/pages/clients"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/clients
 */
export default function ClientsPageRoute() {
  return <ClientsPage language={useLang()} />;
}
