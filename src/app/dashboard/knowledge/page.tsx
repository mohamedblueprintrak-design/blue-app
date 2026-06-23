import { getLocale } from 'next-intl/server';
import KnowledgePage from '@/components/pages/knowledge';

export default async function KnowledgePageRoute() {
  const locale = await getLocale();
  return <KnowledgePage language={locale as "ar" | "en"} />;
}
