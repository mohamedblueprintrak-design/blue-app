import { getLocale } from 'next-intl/server';
import RisksPage from '@/components/pages/risks';

export default async function RisksPageRoute() {
  const locale = await getLocale();
  return <RisksPage language={locale as "ar" | "en"} />;
}
