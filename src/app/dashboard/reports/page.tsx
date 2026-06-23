import { getLocale } from 'next-intl/server';
import ReportsPage from '@/components/pages/reports';

export default async function ReportsPageRoute() {
  const locale = await getLocale();
  return <ReportsPage language={locale as "ar" | "en"} />;
}
