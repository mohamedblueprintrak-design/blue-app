import { getLocale } from 'next-intl/server';
import TendersPage from '@/components/pages/tenders';

export default async function TendersPageRoute() {
  const locale = await getLocale();
  return <TendersPage language={locale as "ar" | "en"} />;
}
