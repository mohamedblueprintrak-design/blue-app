import { getLocale } from 'next-intl/server';
import DesignManagementPage from '@/components/pages/design-management';

export default async function DesignManagementPageRoute() {
  const locale = await getLocale();
  return <DesignManagementPage language={locale as "ar" | "en"} />;
}
