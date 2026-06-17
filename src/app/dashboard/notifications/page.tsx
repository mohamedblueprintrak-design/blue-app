"use client";

import dynamic from "next/dynamic";

const NotificationsPage = dynamic(() => import("@/components/pages/notifications"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/notifications
 */
export default function NotificationsPageRoute() {
  return <NotificationsPage />;
}
