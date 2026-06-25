import { getLocale } from 'next-intl/server';
import EmployeesHub from '@/components/pages/employees-hub';

export default async function EmployeesPageRoute() {
  const locale = await getLocale();
  return <EmployeesHub language={locale as "ar" | "en"} />;
}
