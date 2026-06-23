import { getLocale } from 'next-intl/server';
import ProfilePage from '@/components/pages/profile';

export default async function ProfilePageRoute() {
  const locale = await getLocale();
  return <ProfilePage language={locale as "ar" | "en"} />;
}
