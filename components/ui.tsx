import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Check, Clock3, CircleDashed } from "lucide-react";

export function StatusBadge({
  status,
  tone = "green",
}: {
  status: string;
  tone?: "green" | "gold" | "neutral";
}) {
  const style = tone === "gold" ? "badge badge-gold" : tone === "neutral" ? "badge badge-neutral" : "badge badge-green";
  return <span className={style}><span className="badge-dot" />{status}</span>;
}

export function ProgressBar({ value, compact = false }: { value: number; compact?: boolean }) {
  const percentage = Math.max(0, Math.min(100, value * 100));
  return (
    <div
      className={`progress-track${compact ? " progress-track-compact" : ""}`}
      role="progressbar"
      aria-label="Financial progress"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span className="progress-fill" style={{ width: `${percentage}%` }} />
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon"><CircleDashed size={22} strokeWidth={1.6} /></span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}

export function KpiCard({
  label,
  value,
  supporting,
  icon,
  trend,
  accent = false,
}: {
  label: string;
  value: string;
  supporting: string;
  icon: ReactNode;
  trend?: "up" | "down";
  accent?: boolean;
}) {
  return (
    <article className={`kpi-card${accent ? " kpi-card-accent" : ""}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-foot">
        {trend && (
          <span className="trend-icon" aria-label={trend === "up" ? "Increase" : "Decrease"}>
            {trend === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          </span>
        )}
        <span>{supporting}</span>
      </div>
    </article>
  );
}

export function ChartCard({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`chart-card ${className}`}>
      <div className="chart-card-heading">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export function MilestonePlaceholder() {
  return (
    <div className="data-note">
      <div className="data-note-icon"><Clock3 size={18} /></div>
      <div>
        <p className="data-note-title">Activity milestones aren’t in this workbook</p>
        <p className="data-note-copy">Import a workbook with activity-level records to add a delivery timeline.</p>
      </div>
      <Check size={16} className="data-note-check" />
    </div>
  );
}

export function SiteLink({ id, children }: { id: string; children: ReactNode }) {
  return <Link href={`/sites/${id}`}>{children}</Link>;
}
