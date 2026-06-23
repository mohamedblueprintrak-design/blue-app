import { getLocale } from 'next-intl/server';
import RfiPage from '@/components/pages/rfi';

export default async function RfiPageRoute() {
  const locale = await getLocale();
  return <RfiPage language={locale as "ar" | "en"} />;
}
