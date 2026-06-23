import { getLocale } from 'next-intl/server';
import GanttPage from '@/components/pages/gantt';

export default async function GanttPageRoute() {
  const locale = await getLocale();
  return <GanttPage language={locale as "ar" | "en"} />;
}
