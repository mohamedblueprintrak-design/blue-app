import { getLocale } from 'next-intl/server';
import BoqPage from '@/components/pages/boq';

export default async function BoqPageRoute() {
  const locale = await getLocale();
  return <BoqPage language={locale as "ar" | "en"} />;
}
