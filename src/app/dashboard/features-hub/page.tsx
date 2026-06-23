import { getLocale } from 'next-intl/server';
import FeaturesHubPage from '@/components/pages/features-hub';

export default async function FeaturesHubPageRoute() {
  const locale = await getLocale();
  return <FeaturesHubPage language={locale as "ar" | "en"} />;
}
