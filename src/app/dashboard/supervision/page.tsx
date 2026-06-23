import { getLocale } from 'next-intl/server';
import SupervisionPage from '@/components/pages/supervision';

export default async function SupervisionPageRoute() {
  const locale = await getLocale();
  return <SupervisionPage language={locale as "ar" | "en"} />;
}
