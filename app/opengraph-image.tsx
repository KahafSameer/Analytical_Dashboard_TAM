import { ImageResponse } from "next/og";
import { formatMillions, getPortfolioSummary } from "@/lib/analytics";
import { getDashboardData } from "@/lib/google-sheets";
import { OG_SIZE, OgCard } from "@/components/og-card";

export const alt = "Punjab tourism portfolio — funding, releases and expenditure";
export const size = OG_SIZE;
export const contentType = "image/png";
// Live sheet data: render on request, never at build time.
export const dynamic = "force-dynamic";

export default async function Image() {
  try {
    const data = await getDashboardData();
    const summary = getPortfolioSummary(data.sites);
    const districts = new Set(data.sites.map((site) => site.district)).size;
    return new ImageResponse(
      <OgCard
        eyebrow="Portfolio overview"
        title="Punjab tourism & heritage projects"
        subtitle={`${summary.siteCount} projects across ${districts} reporting areas · live from Google Sheets`}
        metrics={[
          { label: "Approved cost", value: formatMillions(summary.totalApproved, 0) },
          { label: "Released", value: formatMillions(summary.totalReleased, 0) },
          { label: "Utilized", value: formatMillions(summary.totalUtilized, 0) },
        ]}
        progress={summary.weightedProgress}
      />,
      size,
    );
  } catch {
    return new ImageResponse(
      <OgCard eyebrow="Portfolio overview" title="Punjab tourism & heritage projects" subtitle="Funding, releases and expenditure" metrics={[]} />,
      size,
    );
  }
}
