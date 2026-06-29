import { getLocale } from 'next-intl/server';
import CrmLeadsPage from '@/components/pages/crm-leads';

export default async function CrmLeadsPageRoute() {
  const locale = await getLocale();
  return <CrmLeadsPage language={locale as "ar" | "en"} />;
}
