import { getLocale } from 'next-intl/server';
import PaymentsPage from '@/components/pages/payments';

export default async function PaymentsPageRoute() {
  const locale = await getLocale();
  return <PaymentsPage language={locale as "ar" | "en"} />;
}
