import { getLocale } from 'next-intl/server';
import WorkloadPage from '@/components/pages/workload';

export default async function WorkloadPageRoute() {
  const locale = await getLocale();
  return <WorkloadPage language={locale as "ar" | "en"} />;
}
