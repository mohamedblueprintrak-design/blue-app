import { getLocale } from 'next-intl/server';
import AutomationsPage from '@/components/pages/automations';

export default async function AutomationsPageRoute() {
  const locale = await getLocale();
  return <AutomationsPage language={locale as "ar" | "en"} />;
}
