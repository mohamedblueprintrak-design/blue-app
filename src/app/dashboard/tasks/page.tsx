import { getLocale } from 'next-intl/server';
import TasksPage from '@/components/pages/tasks';

export default async function TasksPageRoute() {
  const locale = await getLocale();
  return <TasksPage language={locale as "ar" | "en"} />;
}
