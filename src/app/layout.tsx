import type { Metadata, Viewport } from "next";
import * as React from "react";
import { headers } from "next/headers";
import { Inter, Press_Start_2P, Nunito, Roboto_Slab, Space_Grotesk, Playfair_Display } from "next/font/google";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SkipLink } from "@/components/common/SkipLink";
import { AppProviders } from "@/components/providers/AppProviders";
import { PageTransition } from "@/components/layout/PageTransition";
import { APP_NAME } from "@/lib/constants";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  fallback: ["system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
});

const pressStart2P = Press_Start_2P({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-press-start",
  fallback: ["monospace"],
});

const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
  fallback: ["system-ui", "sans-serif"],
});

const robotoSlab = Roboto_Slab({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-roboto-slab",
  fallback: ["serif"],
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-space",
  fallback: ["sans-serif"],
});

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-playfair",
  fallback: ["serif"],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description:
    "Professional exam simulator with AI-assisted learning. Study offline, track progress, and ace your certification exams.",
  keywords: [
    "exam",
    "certification",
    "study",
    "quiz",
    "learning",
    "offline",
    "AI tutor",
  ],
  authors: [{ name: "CertPrep.ai" }],
  creator: "CertPrep.ai",
  metadataBase: new URL("https://cert-prep-ai.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    title: APP_NAME,
    description: "Professional exam simulator with AI-assisted learning",
    siteName: APP_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: APP_NAME,
    description: "Professional exam simulator with AI-assisted learning",
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): Promise<React.ReactElement> {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;

  return (
    <html
      lang="en"
      className={`${inter.variable} ${pressStart2P.variable} ${nunito.variable} ${robotoSlab.variable} ${spaceGrotesk.variable} ${playfairDisplay.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{const stored=localStorage.getItem('theme');const prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;const shouldDark=stored==='dark'||(!stored&&prefersDark);const root=document.documentElement;if(shouldDark){root.classList.add('dark');}else{root.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
        <SkipLink />
        <AppProviders>
          <Header />
          <div id="main-content" className="flex-1 flex flex-col" tabIndex={-1}>
            <PageTransition>{children}</PageTransition>
          </div>
          <Footer />
        </AppProviders>
      </body>
    </html>
  );
}
