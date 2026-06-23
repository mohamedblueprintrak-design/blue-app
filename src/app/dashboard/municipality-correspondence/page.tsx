import { getLocale } from 'next-intl/server';
import MunicipalityCorrespondencePage from '@/components/pages/municipality-correspondence';

export default async function MunicipalityCorrespondencePageRoute() {
  const locale = await getLocale();
  return <MunicipalityCorrespondencePage language={locale as "ar" | "en"} />;
}
