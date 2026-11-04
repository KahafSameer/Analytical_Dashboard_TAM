import { Suspense } from "react";
import { SitesOverview } from "@/components/sites-overview";
import { sites } from "@/lib/sites";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="loading-page">Loading portfolio…</div>}>
      <SitesOverview sites={sites} />
    </Suspense>
  );
}
