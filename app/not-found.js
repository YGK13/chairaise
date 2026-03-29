// ============================================================
// ChaiRaise — Custom 404 Page
// ============================================================
import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#09090b", color: "#fafafa", fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 56, height: 56, background: "#f59e0b", borderRadius: 12,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontWeight: 800, fontSize: 20, color: "#09090b", margin: "0 auto 16px",
        }}>CR</div>
        <h1 style={{ fontSize: 72, fontWeight: 800, color: "#27272a", marginBottom: 8 }}>404</h1>
        <p style={{ fontSize: 16, color: "#71717a", marginBottom: 24 }}>Page not found</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/" style={{
            padding: "10px 24px", borderRadius: 8, background: "#f59e0b",
            color: "#09090b", fontWeight: 700, fontSize: 14, textDecoration: "none",
          }}>Go to CRM</Link>
          <Link href="/landing" style={{
            padding: "10px 24px", borderRadius: 8, border: "1px solid #3f3f46",
            color: "#fafafa", fontWeight: 600, fontSize: 14, textDecoration: "none",
          }}>Visit Homepage</Link>
        </div>
      </div>
    </div>
  );
}
