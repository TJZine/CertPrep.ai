import type { Metadata, Viewport } from 'next';
import * as React from 'react';
import { Inter } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui/Toast';
import { GlobalErrorHandler } from '@/components/common/GlobalErrorHandler';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';
import { InstallPrompt } from '@/components/common/InstallPrompt';
import { UpdateBanner } from '@/components/common/UpdateBanner';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { SkipLink } from '@/components/common/SkipLink';
import { APP_NAME } from '@/lib/constants';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description:
    'Professional exam simulator with AI-assisted learning. Study offline, track progress, and ace your certification exams.',
  keywords: ['exam', 'certification', 'study', 'quiz', 'learning', 'offline', 'AI tutor'],
  authors: [{ name: 'CertPrep.ai' }],
  creator: 'CertPrep.ai',
  metadataBase: new URL('https://certprep.ai'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: APP_NAME,
    description: 'Professional exam simulator with AI-assisted learning',
    siteName: APP_NAME,
  },
  twitter: {
    card: 'summary_large_image',
    title: APP_NAME,
    description: 'Professional exam simulator with AI-assisted learning',
  },
  robots: {
    index: true,
    follow: true,
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#2563eb',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{const stored=localStorage.getItem('theme');const prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;const shouldDark=stored==='dark'||(!stored&&prefersDark);const root=document.documentElement;if(shouldDark){root.classList.add('dark');}else{root.classList.remove('dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased dark:bg-slate-950 dark:text-slate-50">
        <SkipLink />
        <ThemeProvider>
          <GlobalErrorHandler>
            <ToastProvider>
              <UpdateBanner />
              <Header />
              <div id="main-content" className="flex-1" tabIndex={-1}>
                {children}
              </div>
              <Footer />
              <OfflineIndicator />
              <InstallPrompt />
            </ToastProvider>
          </GlobalErrorHandler>
        </ThemeProvider>
      </body>
    </html>
  );
}
