import { getLocale } from 'next-intl/server';
import ContractorsPage from '@/components/pages/contractors';

export default async function ContractorsPageRoute() {
  const locale = await getLocale();
  return <ContractorsPage language={locale as "ar" | "en"} />;
}
