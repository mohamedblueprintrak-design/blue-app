import { getLocale } from 'next-intl/server';
import GuaranteeLettersPage from "@/components/pages/guarantee-letters";

export default async function GuaranteeLettersPageRoute() {
  const locale = await getLocale();
  return <GuaranteeLettersPage language={locale as "ar" | "en"} />;
}
