import './globals.css';
import { SITE } from '@/content/site';

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
