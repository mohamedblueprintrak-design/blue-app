"use client";

import { useLang } from "@/hooks/use-lang";
import { ProjectTemplatesPage } from "@/components/pages/project-templates";

/**
 * /dashboard/project-templates
 */
export default function ProjectTemplatesPageRoute() {
  const lang = useLang();
  return <ProjectTemplatesPage isAr={lang === "ar"} />;
}
