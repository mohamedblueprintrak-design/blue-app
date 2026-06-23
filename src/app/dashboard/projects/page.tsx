import { getLocale } from 'next-intl/server';
import ProjectsList from '@/components/pages/projects';

export default async function ProjectsListRoute() {
  const locale = await getLocale();
  return <ProjectsList language={locale as "ar" | "en"} />;
}
