import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_Arabic, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { CsrfProvider } from "@/components/providers/csrf-provider";
import { ReactQueryProvider } from "@/components/providers/react-query-provider";
import { ErrorBoundary } from "@/components/common/error-boundary";
import { SafeWebSocketProvider } from "@/lib/websocket/safe-websocket-provider";
import { SkipNavLink } from "@/components/common/accessible-components";
import CookieConsent from "@/components/common/cookie-consent";
import {NextIntlClientProvider} from 'next-intl';
import {getMessages} from 'next-intl/server';
import { DemoBanner } from "@/components/demo-banner";
const ibmPlexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-ibm-plex-arabic",
  subsets: ["arabic", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "BluePrint - نظام إدارة مكاتب الاستشارات الهندسية",
  description: "نظام متكامل لإدارة مكاتب الاستشارات الهندسية في الإمارات | Integrated Engineering Consultancy Management System for UAE",
  keywords: ["BluePrint", "engineering", "consultancy", "UAE", "management", "إدارة", "هندسة", "استشارات", "الإمارات"],
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BluePrint",
  },
};

export const viewport: Viewport = {
  themeColor: "#0F2557",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const messages = await getMessages();
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        {/* Leaflet CSS imported locally via 'leaflet/dist/leaflet.css' in globals.css or component */}
        {/* Security headers are set centrally by src/proxy.ts — no duplicate meta tags needed */}
        {/* SECURITY CONCERN: This inline script uses dangerouslySetInnerHTML without a nonce.
            In production, this should use a CSP nonce for compliance.
            This inline script is safe — it contains only static code that reads from
            localStorage and sets document direction. No user input is interpolated.
            This is the standard Next.js pattern for preventing FOUC (flash of unstyled content). */}
        <script
          id="lang-script"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=document.cookie.match(/(^| )blueprint-lang=([^;]+)/);var l=m?m[2]:(localStorage.getItem("blueprint-lang")||"ar");document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${ibmPlexArabic.variable} ${plusJakarta.variable} antialiased bg-background text-foreground font-[family-name:var(--font-ibm-plex-arabic)]`}
      >
        <SkipNavLink />
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true} disableTransitionOnChange>
          <ReactQueryProvider>
            <CsrfProvider>
              <SafeWebSocketProvider>
                <ErrorBoundary>
                  <NextIntlClientProvider messages={messages}>
                    {process.env.DEMO_MODE === "true" && <DemoBanner />}
                    {children}
                    <CookieConsent />
                    <Toaster />
                  </NextIntlClientProvider>
                </ErrorBoundary>
              </SafeWebSocketProvider>
            </CsrfProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
