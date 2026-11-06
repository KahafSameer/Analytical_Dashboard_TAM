"use client";

import { lazy, Suspense } from "react";
import type { FiscalYear, Site } from "@/lib/types";
import { useNearViewport } from "@/components/use-near-viewport";

const PortfolioAnalytics = lazy(() =>
  import("@/components/portfolio-analytics").then((module) => ({ default: module.PortfolioAnalytics })),
);
const PortfolioFundingChart = lazy(() =>
  import("@/components/portfolio-chart").then((module) => ({ default: module.PortfolioFundingChart })),
);
const ScheduleInsights = lazy(() =>
  import("@/components/schedule-insights").then((module) => ({ default: module.ScheduleInsights })),
);

export function LazyPortfolioAnalytics({ sites, onSelectDistrict }: { sites: Site[]; onSelectDistrict?: (district: string) => void }) {
  const { ref, isNearViewport } = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref}>
      {isNearViewport ? (
        <Suspense fallback={<div className="analytics-loading-placeholder" role="status">Loading portfolio analytics…</div>}>
          <PortfolioAnalytics sites={sites} onSelectDistrict={onSelectDistrict} />
        </Suspense>
      ) : <div className="analytics-loading-placeholder" aria-hidden="true" />}
    </div>
  );
}

export function LazyPortfolioFundingChart({ data }: { data: FiscalYear[] }) {
  const { ref, isNearViewport } = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref} className="funding-chart-lazy">
      {isNearViewport ? (
        <Suspense fallback={<div className="funding-chart-loading" role="status">Loading funding chart…</div>}>
          <PortfolioFundingChart data={data} />
        </Suspense>
      ) : <div className="funding-chart-loading" aria-hidden="true" />}
    </div>
  );
}

export function LazyScheduleInsights({ sites, asOf }: { sites: Site[]; asOf: string }) {
  const { ref, isNearViewport } = useNearViewport<HTMLDivElement>();
  return (
    // The anchor stays in the DOM before the charts load, so /#schedule links can scroll to it.
    <div ref={ref} id="schedule" className="schedule-anchor">
      {isNearViewport ? (
        <Suspense fallback={<div className="schedule-loading-placeholder" role="status">Loading schedule analysis…</div>}>
          <ScheduleInsights sites={sites} asOf={asOf} />
        </Suspense>
      ) : <div className="schedule-loading-placeholder" aria-hidden="true" />}
    </div>
  );
}
