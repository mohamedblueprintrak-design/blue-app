import { getLocale } from 'next-intl/server';
import MeetingsPage from '@/components/pages/meetings';

export default async function MeetingsPageRoute() {
  const locale = await getLocale();
  return <MeetingsPage language={locale as "ar" | "en"} />;
}
