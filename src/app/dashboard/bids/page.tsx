import { getLocale } from 'next-intl/server';
import BidsPage from '@/components/pages/bids';

export default async function BidsPageRoute() {
  const locale = await getLocale();
  return <BidsPage language={locale as "ar" | "en"} />;
}
