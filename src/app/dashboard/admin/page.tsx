"use client";

import dynamic from "next/dynamic";

const AdminPage = dynamic(() => import("@/components/pages/admin"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/admin
 */
export default function AdminPageRoute() {
  return <AdminPage />;
}
