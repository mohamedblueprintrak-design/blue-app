"use client";

import dynamic from "next/dynamic";

const ProjectsList = dynamic(() => import("@/components/pages/projects"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

export default function ProjectsRoute() {
  return <ProjectsList />;
}
