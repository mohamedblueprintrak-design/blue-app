import { getLocale } from 'next-intl/server';
import DocumentsPage from '@/components/pages/documents';

export default async function DocumentsPageRoute() {
  const locale = await getLocale();
  return <DocumentsPage language={locale as "ar" | "en"} />;
}
