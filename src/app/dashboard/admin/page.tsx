import { getLocale } from 'next-intl/server';
import AdminPage from '@/components/pages/admin';

export default async function AdminPageRoute() {
  const locale = await getLocale();
  return <AdminPage language={locale as "ar" | "en"} />;
}
