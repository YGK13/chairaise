// ============================================================
// ChaiRaise — Privacy Policy
// Required for handling donor PII, GDPR, and org trust
// ============================================================
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — ChaiRaise",
  description: "How ChaiRaise handles your data",
};

export default function PrivacyPage() {
  return (
    <div style={{
      background: "#09090b", color: "#fafafa", minHeight: "100vh",
      fontFamily: "'Inter', system-ui, sans-serif", padding: "80px 24px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#f59e0b", fontSize: 12, textDecoration: "none" }}>← Back to ChaiRaise</Link>

        <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ fontSize: 12, color: "#71717a", marginBottom: 32 }}>Last updated: March 24, 2026</p>

        <div style={{ fontSize: 14, lineHeight: 1.8, color: "#a1a1aa" }}>
          <Section title="1. What We Collect">
            <p>ChaiRaise collects only the data necessary to power your fundraising CRM:</p>
            <ul>
              <li><strong>Account data:</strong> Email address, name, and organization affiliation when you sign up.</li>
              <li><strong>Donor data:</strong> Names, contact information, giving history, and engagement data that YOU enter or import into the CRM. We never independently collect donor data.</li>
              <li><strong>Usage data:</strong> Page views, feature usage, and error logs to improve the product. No tracking pixels or third-party analytics.</li>
            </ul>
          </Section>

          <Section title="2. How We Use Your Data">
            <ul>
              <li>To provide CRM functionality — storing, organizing, and analyzing your donor data.</li>
              <li>To power AI features — donor briefs, email generation, and cause matching. AI prompts include donor context but never raw PII beyond what is necessary.</li>
              <li>To send emails on your behalf via our email service (Resend) when you use the email feature.</li>
              <li>To improve ChaiRaise — aggregated, anonymized usage patterns only.</li>
            </ul>
          </Section>

          <Section title="3. AI and Your Data">
            <p>When you use AI features (email generation, donor briefs, org research), donor context is sent to our AI provider (Anthropic) via server-side API calls. Specifically:</p>
            <ul>
              <li>AI requests are processed through our secure server — your API keys and donor data never leave the server.</li>
              <li>We send only the minimum context needed (donor name, community, giving history, org mission) — never full database exports.</li>
              <li>Anthropic does not train on API inputs per their commercial terms.</li>
              <li>You can disable AI features entirely in Settings.</li>
            </ul>
          </Section>

          <Section title="4. Data Storage and Security">
            <ul>
              <li><strong>Database:</strong> Donor data is stored in Neon Postgres, hosted on AWS infrastructure with encryption at rest (AES-256) and in transit (TLS 1.3).</li>
              <li><strong>Authentication:</strong> Managed by NextAuth.js with JWT sessions. Passwords are never stored in plaintext.</li>
              <li><strong>Infrastructure:</strong> Hosted on Vercel with automatic DDoS protection, WAF, and SOC 2 compliant infrastructure.</li>
              <li><strong>Access control:</strong> Role-based permissions (Admin, Manager, Fundraiser, Viewer) restrict data access within your organization.</li>
            </ul>
          </Section>

          <Section title="5. Data Sharing">
            <p>We do NOT sell, rent, or share your donor data with anyone. Period. Your data is shared only with:</p>
            <ul>
              <li><strong>Anthropic</strong> — AI provider, for generating email drafts and donor insights (minimal context, no training).</li>
              <li><strong>Resend</strong> — Email delivery service, only when you send emails through ChaiRaise.</li>
              <li><strong>Neon</strong> — Database hosting provider (encrypted at rest).</li>
              <li><strong>Vercel</strong> — Application hosting (SOC 2 compliant).</li>
            </ul>
          </Section>

          <Section title="6. Your Rights">
            <ul>
              <li><strong>Access:</strong> You can export all your data at any time via the Exports page.</li>
              <li><strong>Deletion:</strong> You can delete any donor record. To delete your entire account and all associated data, contact us.</li>
              <li><strong>Portability:</strong> Export your complete donor database as CSV or JSON.</li>
              <li><strong>GDPR:</strong> If you or your donors are EU residents, you have the right to access, rectify, erase, and port your data. Contact privacy@chairaise.com.</li>
            </ul>
          </Section>

          <Section title="7. Donor Data Sensitivity">
            <p>We recognize that donor data for Jewish organizations carries additional sensitivity considerations:</p>
            <ul>
              <li>Religious affiliation is classified as special category data under GDPR Article 9.</li>
              <li>We implement additional security measures for donor lists, including audit logging of all data access.</li>
              <li>We never expose donor lists publicly or to other organizations on the platform.</li>
              <li>Each organization's data is fully isolated — no cross-org data access is possible.</li>
            </ul>
          </Section>

          <Section title="8. Data Retention">
            <ul>
              <li>Active account data is retained as long as your account exists.</li>
              <li>Deleted donor records are permanently removed within 30 days.</li>
              <li>Account deletion removes all associated data within 30 days.</li>
              <li>Audit logs are retained for 2 years for compliance purposes.</li>
            </ul>
          </Section>

          <Section title="9. Contact">
            <p>For privacy questions, data access requests, or concerns:</p>
            <p>Email: <strong>privacy@chairaise.com</strong></p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fafafa", marginBottom: 8 }}>{title}</h2>
      <div>{children}</div>
    </div>
  );
}
