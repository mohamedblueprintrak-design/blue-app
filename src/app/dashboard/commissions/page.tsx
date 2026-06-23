import { getLocale } from 'next-intl/server';
import CommissionsPage from '@/components/pages/commissions';

export default async function CommissionsPageRoute() {
  const locale = await getLocale();
  return <CommissionsPage language={locale as "ar" | "en"} />;
}
