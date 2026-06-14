"use client";

import dynamic from "next/dynamic";

const MeetingsPage = dynamic(() => import("@/components/pages/meetings"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/meetings
 */
export default function MeetingsPageRoute() {
  return <MeetingsPage />;
}
