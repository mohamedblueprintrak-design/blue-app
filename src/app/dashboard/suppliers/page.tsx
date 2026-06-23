import { getLocale } from 'next-intl/server';
import SuppliersPage from '@/components/pages/suppliers';

export default async function SuppliersPageRoute() {
  const locale = await getLocale();
  return <SuppliersPage language={locale as "ar" | "en"} />;
}
