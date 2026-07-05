import { getLocale } from 'next-intl/server';
import CADViewer from '@/components/pages/cad-viewer';

export const metadata = {
  title: "مستعرض المخططات الهندسية | BluePrint ERP",
  description: "عرض وقياس المخططات والرسومات الهندسية مباشرة في المتصفح",
};

export default async function CADViewerRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const locale = await getLocale();
  return <CADViewer projectId={id} language={locale as "ar" | "en"} />;
}
