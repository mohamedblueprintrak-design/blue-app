import { getLocale } from 'next-intl/server';
import ChangeOrdersPage from '@/components/pages/change-orders';

export default async function ChangeOrdersPageRoute() {
  const locale = await getLocale();
  return <ChangeOrdersPage language={locale as "ar" | "en"} />;
}
