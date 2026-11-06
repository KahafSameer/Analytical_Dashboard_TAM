"use client";

import { PRIMARY_COLOR, SERIES_COLORS } from "@/lib/chart-theme";
import type { FiscalYear } from "@/lib/types";
import { revealIndex, useReveal } from "@/components/motion";

/**
 * Tiny inline-SVG visuals for register rows and cards (89 rows would be too heavy as full charts).
 * Colors follow the validated series palette: allocated gold, released blue, utilized green.
 */

const SERIES = [
  { key: "allocation", label: "Allocated" },
  { key: "release", label: "Released" },
  { key: "utilized", label: "Spent" },
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
  const { ref, revealState } = useReveal<SVGSVGElement>(0.6);
  const max = Math.max(0, ...years.flatMap((year) => [year.allocation, year.release, year.utilized]));
  if (!years.length || max <= 0) return <span className="spark-empty">No year-wise funding yet</span>;
  const group = WIDTH / years.length;
  const bar = Math.max(2, Math.min(9, (group - 10 - GAP * 2) / 3));
  const summary = years
    .map((year) => `${year.label}: set aside ${amount(year.allocation)}, handed over ${amount(year.release)}, spent ${amount(year.utilized)}`)
    .join("; ");
  return (
    <span className="spark">
      <svg ref={ref} data-reveal={revealState} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" role="img" aria-label={`Money by budget year, millions of rupees — ${summary}`}>
        <line x1="0" x2={WIDTH} y1={HEIGHT - 0.5} y2={HEIGHT - 0.5} stroke="#dfe6e1" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {years.map((year, index) => {
          const start = index * group + (group - (bar * 3 + GAP * 2)) / 2;
          return (
            <g key={year.label}>
              <title>{`${year.label} — Set aside ${amount(year.allocation)} · Handed over ${amount(year.release)} · Spent ${amount(year.utilized)} (Rs millions)`}</title>
              {SERIES.map((series, position) => {
                const value = year[series.key];
                const height = Math.max(value > 0 ? 2 : 0, (value / max) * (HEIGHT - 3));
                return <rect key={series.key} className="spark-bar" style={revealIndex(index * 3 + position)} x={start + position * (bar + GAP)} y={HEIGHT - 1 - height} width={bar} height={height} rx={1.2} fill={SERIES_COLORS[series.key]} />;
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
  const { ref, revealState } = useReveal<SVGSVGElement>(0.6);
  const radius = 11.5;
  const circumference = 2 * Math.PI * radius;
  const share = Math.max(0, Math.min(1, value));
  const visible = Math.max(circumference * share, 1.5);
  return (
    <svg ref={ref} data-reveal={revealState} className="progress-ring" width={size} height={size} viewBox="0 0 30 30" aria-hidden="true">
      <circle cx="15" cy="15" r={radius} fill="none" stroke="#e6ece7" strokeWidth="4" />
      {share > 0 && (
        // The arc fills from 0 to its value when the ring scrolls into view (stroke-dashoffset in CSS).
        <circle
          className="ring-value"
          cx="15"
          cy="15"
          r={radius}
          fill="none"
          stroke={PRIMARY_COLOR}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ ["--ring-length" as string]: `${circumference}`, ["--ring-offset" as string]: `${circumference - visible}` }}
          transform="rotate(-90 15 15)"
        />
      )}
    </svg>
  );
}
