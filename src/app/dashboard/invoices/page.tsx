"use client";

import dynamic from "next/dynamic";

const InvoicesPage = dynamic(() => import("@/components/pages/invoices"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/invoices
 */
export default function InvoicesPageRoute() {
  return <InvoicesPage />;
}
