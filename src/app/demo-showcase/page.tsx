import { getLocale } from 'next-intl/server';
import DemoShowcase from '@/components/pages/demo-showcase';

export default async function DemoShowcasePage() {
  const locale = await getLocale();
  return <DemoShowcase language={locale as 'ar' | 'en'} />;
}
