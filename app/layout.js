import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SITE } from '@/content/site';

// Self-hosted at build time by next/font: no render-blocking stylesheet and no
// third-party request at runtime, which keeps the privacy page's promise honest.
// Both families ship as variable fonts, so one file per family covers the whole
// weight range the site uses (Inter 300-800, JetBrains Mono 400-600).
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  fallback: ['ui-monospace', 'monospace'],
});

const SITE_URL = SITE.url;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ChaiRaise: AI Donor Letters, Appeals & CRM for Nonprofits',
    template: '%s | ChaiRaise',
  },
  description: SITE.description,
  applicationName: 'ChaiRaise',
  authors: [{ name: 'Yuri Kruman', url: 'https://yurikruman.com' }],
  creator: 'Yuri Kruman',
  publisher: 'Portfolio Leverage Company',
  robots: { index: true, follow: true },
  openGraph: { siteName: 'ChaiRaise', type: 'website', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  verification: {
    google: 'rH5Omw1oK3ymi5AA90ztc_ZcLdYx2pjqq0LzpYXyjJ8',
  },
};

export const viewport = {
  themeColor: '#09090b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
