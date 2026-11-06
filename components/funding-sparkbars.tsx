import { PRIMARY_COLOR, SERIES_COLORS } from "@/lib/chart-theme";
import type { FiscalYear } from "@/lib/types";

/**
 * Tiny inline-SVG visuals for register rows and cards (89 rows would be too heavy as full charts).
 * Colors follow the validated series palette: allocated gold, released blue, utilized green.
 */

const SERIES = [
  { key: "allocation", label: "Allocated" },
  { key: "release", label: "Released" },
  { key: "utilized", label: "Utilized" },
] as const;

const WIDTH = 132;
const HEIGHT = 34;
const GAP = 1.5;

const amount = (value: number) => value.toLocaleString("en-PK", { maximumFractionDigits: 1 });

/** "2025–26" → "25–26". */
export function shortYearLabel(label: string): string {
  return label.replace(/^20(\d{2})/, "$1");
}

/** Allocated / released / utilized per fiscal year, scaled to the project's own largest amount. */
export function FundingSparkbars({ years }: { years: FiscalYear[] }) {
  const max = Math.max(0, ...years.flatMap((year) => [year.allocation, year.release, year.utilized]));
  if (!years.length || max <= 0) return <span className="spark-empty">No year-wise funding yet</span>;
  const group = WIDTH / years.length;
  const bar = Math.max(2, Math.min(9, (group - 10 - GAP * 2) / 3));
  const summary = years
    .map((year) => `${year.label}: allocated ${amount(year.allocation)}, released ${amount(year.release)}, utilized ${amount(year.utilized)}`)
    .join("; ");
  return (
    <span className="spark">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`Funding by fiscal year, PKR millions — ${summary}`}>
        <line x1="0" x2={WIDTH} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} stroke="#dfe6e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {years.map((year, index) => {
          const start = index * group + (group - (bar * 3 + GAP * 2)) / 2;
          return (
            <g key={year.label}>
              <title>{`${year.label} — Allocated ${amount(year.allocation)} · Released ${amount(year.release)} · Utilized ${amount(year.utilized)} (PKR m)`}</title>
              {SERIES.map((series, position) => {
                const value = year[series.key];
                const height = Math.max(value > 0 ? 2 : 0, (value / max) * (HEIGHT - 3));
                return <rect key={series.key} x={start + position * (bar + GAP)} y={HEIGHT - 1 - height} width={bar} height={height} rx={1.2} fill={SERIES_COLORS[series.key]} />;
              })}
            </g>
          );
        })}
      </svg>
      <span className="spark-years" aria-hidden="true">{years.map((year) => <span key={year.label}>{shortYearLabel(year.label)}</span>)}</span>
    </span>
  );
}

export function SparkLegend() {
  return (
    <span className="spark-legend" aria-hidden="true">
      {SERIES.map((series) => <span key={series.key}><i style={{ backgroundColor: SERIES_COLORS[series.key] }} />{series.label}</span>)}
    </span>
  );
}

/** Financial progress as a small ring (decorative; the percentage is always shown as text beside it). */
export function ProgressRing({ value, size = 30 }: { value: number; size?: number }) {
  const radius = 11.5;
  const circumference = 2 * Math.PI * radius;
  const share = Math.max(0, Math.min(1, value));
  return (
    <svg className="progress-ring" width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r={radius} fill="none" stroke="#e6ece7" strokeWidth="4" />
      {share > 0 && (
        <circle
          cx="15"
          cy="15"
          r={radius}
          fill="none"
          stroke={PRIMARY_COLOR}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={`${Math.max(circumference * share, 1.5)} ${circumference}`}
          transform="rotate(-90 15 15)"
        />
      )}
    </svg>
  );
}
