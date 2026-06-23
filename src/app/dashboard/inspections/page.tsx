import { getLocale } from 'next-intl/server';
import InspectionsPage from '@/components/pages/inspections';

export default async function InspectionsPageRoute() {
  const locale = await getLocale();
  return <InspectionsPage language={locale as "ar" | "en"} />;
}
