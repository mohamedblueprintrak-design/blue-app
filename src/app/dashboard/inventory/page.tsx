import { getLocale } from 'next-intl/server';
import InventoryPage from '@/components/pages/inventory';

export default async function InventoryPageRoute() {
  const locale = await getLocale();
  return <InventoryPage language={locale as "ar" | "en"} />;
}
