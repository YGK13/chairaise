"use client";
// ============================================================
// ChaiRaise — Skeleton Loading Components
// Pulse-animated placeholders for data loading states
// ============================================================

export function Skeleton({ width, height, radius, style }) {
  return (
    <div style={{
      width: width || "100%",
      height: height || 16,
      borderRadius: radius || "var(--radius-sm)",
      background: "var(--surface2)",
      animation: "pulse 1.5s ease-in-out infinite",
      ...style,
    }} />
  );
}

export function SkeletonCard({ height }) {
  return (
    <div style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius)",
      padding: 16,
      display: "flex",
      flexDirection: "column",
      gap: 8,
    }}>
      <Skeleton width="60%" height={14} />
      <Skeleton width="40%" height={24} />
      <Skeleton width="80%" height={10} />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 12,
      padding: "10px 12px",
      borderBottom: "1px solid var(--border)",
    }}>
      <Skeleton width={28} height={28} radius="50%" />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
        <Skeleton width="30%" height={12} />
        <Skeleton width="50%" height={10} />
      </div>
      <Skeleton width={60} height={12} />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 16 }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12 }}>
        {[1, 2, 3, 4].map(i => <SkeletonRow key={i} />)}
      </div>
    </div>
  );
}
