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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        {/* Security headers are set centrally by src/proxy.ts — no duplicate meta tags needed */}
        {/* SECURITY: This inline script is safe — it contains only static code that reads from
            localStorage and sets document direction. No user input is interpolated.
            This is the standard Next.js pattern for preventing FOUC (flash of unstyled content). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var l=localStorage.getItem("blueprint-lang")||"ar";document.documentElement.lang=l;document.documentElement.dir=l==="ar"?"rtl":"ltr"}catch(e){}})()`,
          }}
        />
      </head>
      <body
        className={`${ibmPlexArabic.variable} ${plusJakarta.variable} antialiased bg-background text-foreground font-[family-name:var(--font-ibm-plex-arabic)]`}
      >
        <SkipNavLink />
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
          <ReactQueryProvider>
            <CsrfProvider>
              <SafeWebSocketProvider>
                <ErrorBoundary locale="ar">
                  {children}
                </ErrorBoundary>
              </SafeWebSocketProvider>
              <Toaster />
              <CookieConsent />
            </CsrfProvider>
          </ReactQueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
