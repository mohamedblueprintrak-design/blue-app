import { getLocale } from 'next-intl/server';
import Dashboard from '@/components/pages/dashboard';

export default async function DashboardRoute() {
  const locale = await getLocale();
  return <Dashboard language={locale as "ar" | "en"} />;
}
