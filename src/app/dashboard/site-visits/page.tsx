import { getLocale } from 'next-intl/server';
import SiteVisitsPage from '@/components/pages/site-visits';

export default async function SiteVisitsPageRoute() {
  const locale = await getLocale();
  return <SiteVisitsPage language={locale as "ar" | "en"} />;
}
