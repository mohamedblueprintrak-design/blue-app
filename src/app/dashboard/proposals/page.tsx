import { getLocale } from 'next-intl/server';
import ProposalsPage from '@/components/pages/proposals';

export default async function ProposalsPageRoute() {
  const locale = await getLocale();
  return <ProposalsPage language={locale as "ar" | "en"} />;
}
