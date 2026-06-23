import { getLocale } from 'next-intl/server';
import EmployeesPage from '@/components/pages/employees';

export default async function EmployeesPageRoute() {
  const locale = await getLocale();
  return <EmployeesPage language={locale as "ar" | "en"} />;
}
