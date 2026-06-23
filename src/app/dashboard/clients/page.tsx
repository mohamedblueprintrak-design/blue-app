import { getLocale } from 'next-intl/server';
import ClientsPage from '@/components/pages/clients';

export default async function ClientsPageRoute() {
  const locale = await getLocale();
  return <ClientsPage language={locale as "ar" | "en"} />;
}
