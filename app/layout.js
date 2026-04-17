import './globals.css';

export const metadata = {
  title: 'ChaiRaise — AI-Native Jewish Fundraising CRM',
  description: 'Multiply your impact by 18. AI-powered donor intelligence, cause matching, and multi-channel outreach for Jewish organizations.',
  icons: { icon: '/favicon.ico' },
  verification: {
    google: 'rH5Omw1oK3ymi5AA90ztc_ZcLdYx2pjqq0LzpYXyjJ8',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {children}
      </body>
    </html>
  );
}
