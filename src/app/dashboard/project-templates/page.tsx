import { getLocale } from 'next-intl/server';
import { ProjectTemplatesPage } from "@/components/pages/project-templates";

export default async function ProjectTemplatesPageRoute() {
  const locale = await getLocale();
  return <ProjectTemplatesPage isAr={locale === "ar"} />;
}
