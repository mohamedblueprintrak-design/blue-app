"use client";

import RetainagePage from "@/components/pages/retainage";
import { useLang } from "@/hooks/use-lang";

export default function RetainagePageRoute() {
  return <RetainagePage language={useLang()} />;
}
