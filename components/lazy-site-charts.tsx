"use client";

import { lazy, Suspense } from "react";
import type { Site } from "@/lib/types";
import { useNearViewport } from "@/components/use-near-viewport";

const SiteFiscalYearChart = lazy(() =>
  import("@/components/site-fiscal-year-chart").then((module) => ({ default: module.SiteFiscalYearChart })),
);
const SiteFinancialAnalytics = lazy(() =>
  import("@/components/site-financial-analytics").then((module) => ({ default: module.SiteFinancialAnalytics })),
);

export function LazySiteFiscalYearChart({ site }: { site: Site }) {
  const { ref, isNearViewport } = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref} className="site-chart-lazy">
      {isNearViewport ? (
        <Suspense fallback={<div className="site-chart-loading" role="status">Loading fiscal-year chart…</div>}>
          <SiteFiscalYearChart site={site} />
        </Suspense>
      ) : <div className="site-chart-loading" aria-hidden="true" />}
    </div>
  );
}

export function LazySiteFinancialAnalytics({ site }: { site: Site }) {
  const { ref, isNearViewport } = useNearViewport<HTMLDivElement>();
  return (
    <div ref={ref}>
      {isNearViewport ? (
        <Suspense fallback={<div className="site-analytics-loading" role="status">Loading funding analysis…</div>}>
          <SiteFinancialAnalytics site={site} />
        </Suspense>
      ) : <div className="site-analytics-loading" aria-hidden="true" />}
    </div>
  );
}
