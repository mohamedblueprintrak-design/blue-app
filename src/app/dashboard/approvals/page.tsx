import { getLocale } from 'next-intl/server';
import ApprovalsPage from '@/components/pages/approvals';

export default async function ApprovalsPageRoute() {
  const locale = await getLocale();
  return <ApprovalsPage language={locale as "ar" | "en"} />;
}
