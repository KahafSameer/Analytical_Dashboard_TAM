/**
 * Social preview card rendered by next/og (Satori): inline styles and flexbox only. Used by the
 * Open Graph image routes so links shared on WhatsApp, Facebook, X or LinkedIn show a summary.
 */

export const OG_SIZE = { width: 1200, height: 630 };

type Metric = { label: string; value: string };

export function OgCard({
  eyebrow,
  title,
  subtitle,
  metrics,
  progress,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  metrics: Metric[];
  /** Financial progress 0–1, shown as a bar. */
  progress?: number;
}) {
  const shownTitle = title.length > 110 ? `${title.slice(0, 107).trimEnd()}…` : title;
  const percent = progress === undefined ? undefined : Math.max(0, Math.min(1, progress));
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 64px",
        color: "#ffffff",
        background: "linear-gradient(135deg, #0d3a2b 0%, #14533d 58%, #1d6b4f 100%)",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "#e2b93b", color: "#0d3a2b", fontSize: 28, fontWeight: 700 }}>F</div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 28, fontWeight: 700 }}>Fieldnotes</span>
            <span style={{ fontSize: 16, letterSpacing: 3, color: "rgba(255,255,255,.72)" }}>TOURISM INTELLIGENCE</span>
          </div>
        </div>
        <span style={{ fontSize: 20, color: "rgba(255,255,255,.75)" }}>Punjab, Pakistan</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex" }}>
          <span style={{ padding: "6px 16px", borderRadius: 999, background: "rgba(226,185,59,.18)", border: "1px solid rgba(226,185,59,.6)", color: "#f3d77e", fontSize: 20, letterSpacing: 2 }}>{eyebrow.toUpperCase()}</span>
        </div>
        <div style={{ display: "flex", fontSize: shownTitle.length > 70 ? 46 : 58, lineHeight: 1.12, fontWeight: 700, maxWidth: 1040 }}>{shownTitle}</div>
        {subtitle && <div style={{ display: "flex", fontSize: 24, color: "rgba(255,255,255,.78)" }}>{subtitle}</div>}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
        <div style={{ display: "flex", gap: 18 }}>
          {metrics.map((metric) => (
            <div key={metric.label} style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6, padding: "16px 20px", borderRadius: 14, background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.16)" }}>
              <span style={{ fontSize: 18, color: "rgba(255,255,255,.7)" }}>{metric.label}</span>
              <span style={{ fontSize: 32, fontWeight: 700 }}>{metric.value}</span>
            </div>
          ))}
        </div>
        {percent !== undefined && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, color: "rgba(255,255,255,.8)" }}>
              <span>Financial progress (utilized ÷ approved cost)</span>
              <span style={{ color: "#ffffff", fontWeight: 700 }}>{`${(percent * 100).toFixed(1)}%`}</span>
            </div>
            <div style={{ display: "flex", width: "100%", height: 14, borderRadius: 999, background: "rgba(255,255,255,.18)" }}>
              <div style={{ display: "flex", width: `${Math.max(percent * 100, 1)}%`, height: 14, borderRadius: 999, background: "#e2b93b" }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
