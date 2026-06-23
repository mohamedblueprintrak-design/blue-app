import { getLocale } from 'next-intl/server';
import TeamMembersPage from '@/components/pages/team-members';

export default async function TeamMembersPageRoute() {
  const locale = await getLocale();
  return <TeamMembersPage language={locale as "ar" | "en"} />;
}
