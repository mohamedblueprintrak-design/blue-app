import { getLocale } from 'next-intl/server';
import NotificationsPage from '@/components/pages/notifications';

export default async function NotificationsPageRoute() {
  const locale = await getLocale();
  return <NotificationsPage language={locale as "ar" | "en"} />;
}
