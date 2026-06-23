import { getLocale } from 'next-intl/server';
import ProgressClaimsPage from "@/components/pages/progress-claims";

export default async function ProgressClaimsPageRoute() {
  const locale = await getLocale();
  return <ProgressClaimsPage language={locale as "ar" | "en"} />;
}
