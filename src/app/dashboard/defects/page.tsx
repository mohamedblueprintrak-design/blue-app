import { getLocale } from 'next-intl/server';
import DefectsPage from '@/components/pages/defects';

export default async function DefectsPageRoute() {
  const locale = await getLocale();
  return <DefectsPage language={locale as "ar" | "en"} />;
}
