"use client";

import dynamic from "next/dynamic";
import { useLang } from "@/hooks/use-lang";

const TeamMembersPage = dynamic(() => import("@/components/pages/team-members"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/team-members
 */
export default function TeamMembersPageRoute() {
  return <TeamMembersPage language={useLang()} />;
}
