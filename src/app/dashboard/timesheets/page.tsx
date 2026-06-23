import { getLocale } from 'next-intl/server';
import TimesheetsPage from '@/components/pages/timesheets';

export default async function TimesheetsPageRoute() {
  const locale = await getLocale();
  return <TimesheetsPage language={locale as "ar" | "en"} />;
}
