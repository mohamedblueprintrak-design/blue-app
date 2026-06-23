import { getLocale } from 'next-intl/server';
import EquipmentPage from '@/components/pages/equipment';

export default async function EquipmentPageRoute() {
  const locale = await getLocale();
  return <EquipmentPage language={locale as "ar" | "en"} />;
}
