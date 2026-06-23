import { getLocale } from 'next-intl/server';
import RecurringInvoicesPage from '@/components/pages/recurring-invoices';

export default async function RecurringInvoicesPageRoute() {
  const locale = await getLocale();
  return <RecurringInvoicesPage language={locale as "ar" | "en"} />;
}
