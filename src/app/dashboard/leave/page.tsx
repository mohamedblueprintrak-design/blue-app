import { getLocale } from 'next-intl/server';
import LeavePage from '@/components/pages/leave';

export default async function LeavePageRoute() {
  const locale = await getLocale();
  return <LeavePage language={locale as "ar" | "en"} />;
}
