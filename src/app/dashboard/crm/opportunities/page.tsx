import { getLocale } from 'next-intl/server';
import CrmOpportunitiesPage from '@/components/pages/crm-opportunities';

export default async function CrmOpportunitiesPageRoute() {
  const locale = await getLocale();
  return <CrmOpportunitiesPage language={locale as "ar" | "en"} />;
}
