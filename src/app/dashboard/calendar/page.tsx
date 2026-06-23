import { getLocale } from 'next-intl/server';
import CalendarPage from '@/components/pages/calendar';

export default async function CalendarPageRoute() {
  const locale = await getLocale();
  return <CalendarPage language={locale as "ar" | "en"} />;
}
