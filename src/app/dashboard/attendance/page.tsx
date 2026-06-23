import { getLocale } from 'next-intl/server';
import AttendancePage from '@/components/pages/attendance';

export default async function AttendancePageRoute() {
  const locale = await getLocale();
  return <AttendancePage language={locale as "ar" | "en"} />;
}
