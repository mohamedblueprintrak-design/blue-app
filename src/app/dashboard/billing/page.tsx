import { getLocale } from 'next-intl/server';
import BillingPage from '@/components/pages/billing';

export default async function BillingPageRoute() {
  const locale = await getLocale();
  return <BillingPage language={locale as "ar" | "en"} />;
}
