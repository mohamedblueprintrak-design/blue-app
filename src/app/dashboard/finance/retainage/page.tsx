import { getLocale } from 'next-intl/server';
import RetainagePage from "@/components/pages/retainage";

export default async function RetainagePageRoute() {
  const locale = await getLocale();
  return <RetainagePage language={locale as "ar" | "en"} />;
}
