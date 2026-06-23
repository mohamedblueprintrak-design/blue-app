import { getLocale } from 'next-intl/server';
import ReportBuilderPage from '@/components/pages/report-builder';

export default async function ReportBuilderPageRoute() {
  const locale = await getLocale();
  return <ReportBuilderPage language={locale as "ar" | "en"} />;
}
