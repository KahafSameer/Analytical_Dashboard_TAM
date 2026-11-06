import { Suspense } from "react";
import { SitesOverview } from "@/components/sites-overview";
import { getDashboardData, getDashboardDataErrorMessage } from "@/lib/google-sheets";
import type { DashboardData } from "@/lib/types";

export default async function HomePage() {
  let initialData: DashboardData | null = null;
  let initialError: string | null = null;
  try {
    initialData = await getDashboardData();
  } catch (error) {
    initialError = getDashboardDataErrorMessage(error);
  }

  return (
    <Suspense fallback={<div className="loading-page">Loading portfolio…</div>}>
      <SitesOverview initialData={initialData} initialError={initialError} />
    </Suspense>
  );
}
