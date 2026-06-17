"use client";

import GuaranteeLettersPage from "@/components/pages/guarantee-letters";
import { useLang } from "@/hooks/use-lang";

export default function GuaranteeLettersPageRoute() {
  return <GuaranteeLettersPage language={useLang()} />;
}
