import { getLocale } from 'next-intl/server';
import PurchaseOrdersPage from '@/components/pages/purchase-orders';

export default async function PurchaseOrdersPageRoute() {
  const locale = await getLocale();
  return <PurchaseOrdersPage language={locale as "ar" | "en"} />;
}
