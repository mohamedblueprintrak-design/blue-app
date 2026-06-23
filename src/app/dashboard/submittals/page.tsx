import { getLocale } from 'next-intl/server';
import SubmittalsPage from '@/components/pages/submittals';

export default async function SubmittalsPageRoute() {
  const locale = await getLocale();
  return <SubmittalsPage language={locale as "ar" | "en"} />;
}
