import { getLocale } from 'next-intl/server';
import ContractsPage from '@/components/pages/contracts';

export default async function ContractsPageRoute() {
  const locale = await getLocale();
  return <ContractsPage language={locale as "ar" | "en"} />;
}
