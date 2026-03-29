// ============================================================
// ChaiRaise — Terms of Service
// ============================================================
import Link from "next/link";

export const metadata = {
  title: "Terms of Service — ChaiRaise",
  description: "ChaiRaise terms of service and acceptable use policy",
};

export default function TermsPage() {
  return (
    <div style={{
      background: "#09090b", color: "#fafafa", minHeight: "100vh",
      fontFamily: "'Inter', system-ui, sans-serif", padding: "80px 24px",
    }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#f59e0b", fontSize: 12, textDecoration: "none" }}>← Back to ChaiRaise</Link>

        <h1 style={{ fontSize: 32, fontWeight: 800, marginTop: 16, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ fontSize: 12, color: "#71717a", marginBottom: 32 }}>Last updated: March 29, 2026</p>

        <div style={{ fontSize: 14, lineHeight: 1.8, color: "#a1a1aa" }}>
          <Section title="1. Acceptance of Terms">
            <p>By accessing or using ChaiRaise ("the Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. ChaiRaise is provided by ChaiRaise Inc. ("we", "us", "our").</p>
          </Section>

          <Section title="2. Description of Service">
            <p>ChaiRaise is an AI-powered Customer Relationship Management (CRM) platform designed for nonprofit fundraising, with specific features for Jewish organizations. The Service includes donor management, AI-generated communications, social graph analysis, campaign tracking, and integration with third-party fundraising platforms.</p>
          </Section>

          <Section title="3. Account Registration">
            <ul>
              <li>You must provide accurate and complete registration information.</li>
              <li>You are responsible for maintaining the security of your account credentials.</li>
              <li>Organization administrators are responsible for managing user access within their organization.</li>
              <li>You must be at least 18 years old to use the Service.</li>
              <li>One person or legal entity may not maintain more than one free account.</li>
            </ul>
          </Section>

          <Section title="4. Acceptable Use">
            <p>You agree NOT to:</p>
            <ul>
              <li>Use the Service for any unlawful purpose or to solicit illegal activities.</li>
              <li>Upload or transmit viruses, malware, or other harmful code.</li>
              <li>Attempt to gain unauthorized access to the Service or its systems.</li>
              <li>Use the Service to send unsolicited communications (spam).</li>
              <li>Impersonate another person or organization.</li>
              <li>Use the Service for fraudulent fundraising activities.</li>
              <li>Reverse engineer, decompile, or disassemble any portion of the Service.</li>
              <li>Use AI features to generate misleading, deceptive, or harmful content.</li>
            </ul>
          </Section>

          <Section title="5. Data Ownership">
            <ul>
              <li><strong>Your Data:</strong> You retain all rights to your donor data, communications, and organizational content. We do not claim ownership of your data.</li>
              <li><strong>License:</strong> You grant us a limited license to process your data solely to provide the Service (including AI features).</li>
              <li><strong>Export:</strong> You may export your complete data at any time via the Exports feature.</li>
              <li><strong>Deletion:</strong> Upon account termination, we will delete your data within 30 days.</li>
            </ul>
          </Section>

          <Section title="6. AI Features">
            <ul>
              <li>AI-generated content (emails, donor briefs, research) is provided as suggestions. You are responsible for reviewing and approving all AI-generated communications before sending.</li>
              <li>AI features use third-party models (Anthropic Claude). Your data is processed according to our Privacy Policy.</li>
              <li>AI outputs may contain inaccuracies. Always verify factual claims, especially donor information and financial data.</li>
              <li>We do not guarantee the accuracy, completeness, or suitability of AI-generated content.</li>
            </ul>
          </Section>

          <Section title="7. Payment Terms">
            <ul>
              <li><strong>Free Tier:</strong> Available with usage limitations as described on our pricing page.</li>
              <li><strong>Paid Plans:</strong> Billed monthly or annually as selected. All fees are in USD.</li>
              <li><strong>Cancellation:</strong> You may cancel at any time. Access continues until the end of your billing period.</li>
              <li><strong>Refunds:</strong> Annual plans may request a pro-rata refund within 30 days of purchase.</li>
              <li><strong>Price Changes:</strong> We will provide 30 days notice before any price increase.</li>
            </ul>
          </Section>

          <Section title="8. Service Availability">
            <p>We strive for 99.9% uptime but do not guarantee uninterrupted access. We are not liable for service interruptions due to maintenance, third-party service failures, or force majeure events.</p>
          </Section>

          <Section title="9. Limitation of Liability">
            <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, CHAIRAISE SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF DATA, REVENUE, OR BUSINESS OPPORTUNITIES, ARISING FROM YOUR USE OF THE SERVICE.</p>
            <p>Our total liability shall not exceed the amount you paid for the Service in the 12 months preceding the claim.</p>
          </Section>

          <Section title="10. Termination">
            <ul>
              <li>We may suspend or terminate your account for violation of these Terms.</li>
              <li>You may terminate your account at any time by contacting us.</li>
              <li>Upon termination, your right to use the Service ceases immediately.</li>
              <li>Sections 5, 9, and 11 survive termination.</li>
            </ul>
          </Section>

          <Section title="11. Governing Law">
            <p>These Terms are governed by the laws of the State of Delaware, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Delaware.</p>
          </Section>

          <Section title="12. Contact">
            <p>For questions about these Terms:</p>
            <p>Email: <strong>legal@chairaise.com</strong></p>
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
