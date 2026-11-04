export default function Loading() {
  return (
    <div className="page-stack" aria-label="Loading tourism projects">
      <div className="page-topline skeleton skeleton-line" />
      <div className="skeleton-intro"><div className="skeleton skeleton-kicker" /><div className="skeleton skeleton-title" /><div className="skeleton skeleton-copy" /></div>
      <div className="skeleton-kpis">{[1, 2, 3, 4].map((item) => <div key={item} className="skeleton skeleton-kpi" />)}</div>
      <div className="skeleton-grid">{[1, 2, 3, 4, 5, 6].map((item) => <div key={item} className="skeleton skeleton-site" />)}</div>
    </div>
  );
}
