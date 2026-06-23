import { getLocale } from 'next-intl/server';
import SiteDiaryPage from '@/components/pages/site-diary';

export default async function SiteDiaryPageRoute() {
  const locale = await getLocale();
  return <SiteDiaryPage language={locale as "ar" | "en"} />;
}
