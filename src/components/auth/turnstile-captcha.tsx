"use client";

import { useEffect, useRef, useCallback } from "react";

interface TurnstileCaptchaProps {
  onVerify: (token: string) => void;
  theme?: "light" | "dark";
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileRenderOptions {
  sitekey: string;
  callback: (token: string) => void;
  theme?: "light" | "dark";
  "expired-callback"?: () => void;
  "error-callback"?: (error: unknown) => void;
  dir?: "ltr" | "rtl";
  language?: string;
}

const SCRIPT_ID = "cf-turnstile-script";
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export default function TurnstileCaptcha({ onVerify, theme }: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const scriptLoadedRef = useRef(false);
  const onVerifyRef = useRef(onVerify);

  // Keep callback ref up to date without re-rendering the widget
  useEffect(() => {
    onVerifyRef.current = onVerify;
  }, [onVerify]);

  const handleVerify = useCallback((token: string) => {
    onVerifyRef.current(token);
  }, []);

  const renderWidget = useCallback(() => {
    if (!SITE_KEY || !containerRef.current || !window.turnstile) return;

    // Clean up any existing widget first
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current);
      } catch {
        // Widget may not exist anymore
      }
      widgetIdRef.current = null;
    }

    const isRtl = document.documentElement.dir === "rtl" || document.documentElement.lang === "ar";

    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: SITE_KEY,
      callback: handleVerify,
      theme: theme ?? (document.documentElement.classList.contains("dark") ? "dark" : "light"),
      dir: isRtl ? "rtl" : "ltr",
      language: document.documentElement.lang === "ar" ? "ar" : "en",
      "expired-callback": () => {
        // Token expired — the parent component should clear its stored token
        onVerifyRef.current("");
      },
      "error-callback": () => {
        // On error, clear the token so the form knows captcha is not verified
        onVerifyRef.current("");
      },
    });
  }, [handleVerify, theme]);

  useEffect(() => {
    // If no site key is configured, render nothing (graceful degradation)
    if (!SITE_KEY) return;

    // If the Turnstile script is already loaded, render immediately
    if (window.turnstile) {
      renderWidget();
      return;
    }

    // If a script tag is already in the DOM but hasn't finished loading, wait for it
    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (existingScript) {
      // Script is loading — set callback and wait
      const originalOnLoad = window.onTurnstileLoad;
      window.onTurnstileLoad = () => {
        originalOnLoad?.();
        renderWidget();
      };
      scriptLoadedRef.current = true;
      return;
    }

    // Inject the Turnstile script
    window.onTurnstileLoad = () => {
      renderWidget();
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    scriptLoadedRef.current = true;

    return () => {
      // Clean up the widget
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          // Widget may already be removed
        }
        widgetIdRef.current = null;
      }
      // Remove the script tag only if we were the ones who added it
      if (scriptLoadedRef.current) {
        const s = document.getElementById(SCRIPT_ID);
        if (s) s.remove();
        window.onTurnstileLoad = undefined;
        scriptLoadedRef.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-render widget when theme changes
  useEffect(() => {
    if (!SITE_KEY) return;
    if (widgetIdRef.current && window.turnstile) {
      renderWidget();
    }
  }, [theme, renderWidget]);

  // If no site key, render nothing
  if (!SITE_KEY) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className="flex justify-center"
      aria-label="Captcha verification"
      role="region"
    />
  );
}
