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

export function LazyPortfolioAnalytics({ sites }: { sites: Site[] }) {
  const { ref, isNearViewport } = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref}>
      {isNearViewport ? (
        <Suspense fallback={<div className="analytics-loading-placeholder" role="status">Loading portfolio analytics…</div>}>
          <PortfolioAnalytics sites={sites} />
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
