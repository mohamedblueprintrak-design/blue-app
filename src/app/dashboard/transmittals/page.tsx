import { getLocale } from 'next-intl/server';
import TransmittalsPage from '@/components/pages/transmittals';

export default async function TransmittalsPageRoute() {
  const locale = await getLocale();
  return <TransmittalsPage language={locale as "ar" | "en"} />;
}
