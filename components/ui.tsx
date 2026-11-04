"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Check, Clock3, CircleDashed } from "lucide-react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { useEffect, useRef } from "react";

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
  const reduceMotion = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "30px 0px" });
  return (
    <div
      ref={ref}
      className={`progress-track${compact ? " progress-track-compact" : ""}`}
      role="progressbar"
      aria-label="Financial progress"
      aria-valuenow={Math.round(percentage)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <motion.span
        className="progress-fill"
        initial={{ width: 0 }}
        animate={{ width: isInView || reduceMotion ? `${percentage}%` : 0 }}
        transition={{ duration: reduceMotion ? 0.15 : 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
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
  const valueRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(valueRef, { once: true, margin: "30px 0px" });
  const reduceMotion = useReducedMotion();
  const metric = parseMetric(value);
  const count = useMotionValue(metric.number ?? 0);
  const displayedMetric = useTransform(count, (current) =>
    `${metric.prefix}${formatMetric(current, metric.decimals)}${metric.suffix}`,
  );
  useEffect(() => {
    if (metric.number === null) return;
    if (reduceMotion) {
      count.set(metric.number);
      return;
    }
    if (!isInView) return;
    count.set(0);
    const controls = animate(count, metric.number, {
      duration: 0.75,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [count, isInView, metric.number, reduceMotion]);
  return (
    <motion.article
      className={`kpi-card${accent ? " kpi-card-accent" : ""}`}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.38, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className="kpi-icon">{icon}</span>
      </div>
      <div className="kpi-value">
        {metric.number === null
          ? <span ref={valueRef}>{value}</span>
          : <motion.span ref={valueRef}>{displayedMetric}</motion.span>}
      </div>
      <div className="kpi-foot">
        {trend && (
          <span className="trend-icon" aria-label={trend === "up" ? "Increase" : "Decrease"}>
            {trend === "up" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          </span>
        )}
        <span>{supporting}</span>
      </div>
    </motion.article>
  );
}

function parseMetric(value: string) {
  const match = value.match(/(\d[\d,]*(?:\.\d+)?)/);
  if (!match) return { number: null, prefix: "", suffix: "", decimals: 0 };
  const number = Number(match[1].replaceAll(",", ""));
  return {
    number: Number.isFinite(number) ? number : null,
    prefix: value.slice(0, match.index),
    suffix: value.slice((match.index ?? 0) + match[1].length),
    decimals: match[1].split(".")[1]?.length ?? 0,
  };
}

function formatMetric(value: number, decimals: number) {
  return value.toLocaleString("en-PK", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
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
  const reduceMotion = useReducedMotion();
  return (
    <motion.section
      className={`chart-card ${className}`}
      initial={{ opacity: 0, y: reduceMotion ? 0 : 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reduceMotion ? 0.15 : 0.44, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="chart-card-heading">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </motion.section>
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
