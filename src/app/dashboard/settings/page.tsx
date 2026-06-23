import { getLocale } from 'next-intl/server';
import SettingsPage from '@/components/pages/settings';

export default async function SettingsPageRoute() {
  const locale = await getLocale();
  return <SettingsPage language={locale as "ar" | "en"} />;
}
