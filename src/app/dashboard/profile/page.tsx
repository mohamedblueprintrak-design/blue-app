"use client";

import dynamic from "next/dynamic";

const ProfilePage = dynamic(() => import("@/components/pages/profile"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/profile
 */
export default function ProfilePageRoute() {
  return <ProfilePage />;
}
