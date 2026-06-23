import { getLocale } from 'next-intl/server';
import BudgetsPage from '@/components/pages/budgets';

export default async function BudgetsPageRoute() {
  const locale = await getLocale();
  return <BudgetsPage language={locale as "ar" | "en"} />;
}
