import { getLocale } from 'next-intl/server';
import InvoicesPage from '@/components/pages/invoices';

export default async function InvoicesPageRoute() {
  const locale = await getLocale();
  return <InvoicesPage language={locale as "ar" | "en"} />;
}
