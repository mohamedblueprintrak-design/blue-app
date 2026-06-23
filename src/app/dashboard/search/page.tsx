import { getLocale } from 'next-intl/server';
import SearchPage from '@/components/pages/search';

export default async function SearchPageRoute() {
  const locale = await getLocale();
  return <SearchPage language={locale as "ar" | "en"} />;
}
