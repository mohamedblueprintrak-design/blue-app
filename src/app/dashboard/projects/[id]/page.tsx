import { getLocale } from 'next-intl/server';
import ProjectDetail from '@/components/pages/project-detail';

export default async function ProjectDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  return <ProjectDetail language={locale as "ar" | "en"} key={id} />;
}
