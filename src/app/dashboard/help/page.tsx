import { getLocale } from 'next-intl/server';
import HelpPage from '@/components/pages/help';

export default async function HelpPageRoute() {
  const locale = await getLocale();
  return <HelpPage language={locale as "ar" | "en"} />;
}
