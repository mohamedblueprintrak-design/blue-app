import { getLocale } from 'next-intl/server';
import FinanceBankAccountsPage from '@/components/pages/finance-bank-accounts';

export default async function BankAccountsPageRoute() {
  const locale = await getLocale();
  return <FinanceBankAccountsPage />;
}
