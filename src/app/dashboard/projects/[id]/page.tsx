"use client";

import dynamic from "next/dynamic";
import { use } from "react";
import { useLang } from "@/hooks/use-lang";

const ProjectDetail = dynamic(() => import("@/components/pages/project-detail"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

export default function ProjectDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ProjectDetail language={useLang()} key={id} />;
}
