import { getLocale } from 'next-intl/server';
import ActivityLogPage from '@/components/pages/activity-log';

export default async function ActivityLogPageRoute() {
  const locale = await getLocale();
  return <ActivityLogPage language={locale as "ar" | "en"} />;
}
