"use client";

import ProgressClaimsPage from "@/components/pages/progress-claims";
import { useLang } from "@/hooks/use-lang";

export default function ProgressClaimsPageRoute() {
  return <ProgressClaimsPage language={useLang()} />;
}
