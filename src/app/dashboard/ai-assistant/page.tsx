import { getLocale } from 'next-intl/server';
import AiAssistantPage from '@/components/pages/ai-assistant';

export default async function AiAssistantPageRoute() {
  const locale = await getLocale();
  return <AiAssistantPage language={locale as "ar" | "en"} />;
}
