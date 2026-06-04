"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";import { useTranslations } from "next-intl";

interface MicrosoftLoginButtonProps {
  className?: string;
}

/**
 * Microsoft SVG icon component — the official Microsoft logo
 */
function MicrosoftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="10" height="10" fill="#F25022" />
      <rect x="13" y="1" width="10" height="10" fill="#7FBA00" />
      <rect x="1" y="13" width="10" height="10" fill="#00A4EF" />
      <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
    </svg>
  );
}

/**
 * "Sign in with Microsoft" button component
 *
 * - Uses the official Microsoft SVG icon (4-color square logo)
 * - Styled as a navy blue outline button consistent with the app's design
 * - Navigates to /api/auth/microsoft on click
 * - Supports RTL
 * - Shows loading state during redirect
 */
export default function MicrosoftLoginButton({ className }: MicrosoftLoginButtonProps) {
  const t = useTranslations("auth");
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    // Redirect to Microsoft OAuth initiation endpoint
    window.location.href = "/api/auth/microsoft";
  };

  return (
    <Button
      type="button"
      variant="outline"
      className={cn(
        "w-full h-11 border-slate-300 dark:border-slate-600",
        "bg-white dark:bg-slate-800",
        "hover:bg-slate-50 dark:hover:bg-slate-700",
        "text-slate-700 dark:text-slate-200 font-medium",
        "transition-all duration-200",
        "shadow-sm hover:shadow",
        className
      )}
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 me-3 animate-spin text-slate-500" />
      ) : (
        <MicrosoftIcon className="w-5 h-5 me-3" />
      )}
      {isLoading
        ? t("redirectingMicrosoft")
        : t("continueMicrosoft")}
    </Button>
  );
}
