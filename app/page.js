// ============================================================
// ChaiRaise — Homepage (public marketing site)
// The CRM application lives at /app (behind auth). This is the front door.
// Metadata + JSON-LD are server-rendered here; the interactive page is a
// client component fed by content/site.js.
// ============================================================
import LandingPage from "@/components/LandingPage";
import { SITE, homeJsonLd } from "@/content/site";

const TITLE = "ChaiRaise: AI Donor Letters, Appeals & CRM for Nonprofits";

export const metadata = {
  title: { absolute: TITLE },
  description: SITE.description,
  alternates: { canonical: `${SITE.url}/` },
  keywords: [
    "AI fundraising copilot",
    "donor letter generator",
    "AI donor CRM for nonprofits",
    "synagogue fundraising software",
    "Jewish nonprofit CRM",
    "nonprofit appeal writing AI",
  ],
  openGraph: {
    title: TITLE,
    description: SITE.description,
    url: `${SITE.url}/`,
    siteName: SITE.name,
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: SITE.description,
  },
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(homeJsonLd()) }} />
      <LandingPage />
    </>
  );
}
