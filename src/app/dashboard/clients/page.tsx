"use client";

import dynamic from "next/dynamic";

const ClientsPage = dynamic(() => import("@/components/pages/clients"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/clients
 */
export default function ClientsPageRoute() {
  return <ClientsPage />;
}
