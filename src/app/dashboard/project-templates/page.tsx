"use client";

import dynamic from "next/dynamic";

const ProjectTemplatesPage = dynamic(() => import("@/components/pages/project-templates"), {
  loading: () => <div className="p-6 animate-pulse">Loading...</div>,
  ssr: false,
});

/**
 * /dashboard/project-templates
 */
export default function ProjectTemplatesPageRoute() {
  return <ProjectTemplatesPage />;
}
