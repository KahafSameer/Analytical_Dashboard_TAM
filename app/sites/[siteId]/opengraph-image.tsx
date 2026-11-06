import { ImageResponse } from "next/og";
import { formatMillions } from "@/lib/analytics";
import { getDashboardData } from "@/lib/google-sheets";
import { OG_SIZE, OgCard } from "@/components/og-card";

export const alt = "Tourism project funding summary";
export const size = OG_SIZE;
export const contentType = "image/png";
// Live sheet data: render on request, never at build time.
export const dynamic = "force-dynamic";

export default async function Image({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  try {
    const data = await getDashboardData();
    const site = data.sites.find((entry) => entry.id === siteId);
    if (site) {
      return new ImageResponse(
        <OgCard
          eyebrow={site.district && site.district !== "Not specified" ? site.district : "Tourism project"}
          title={site.name}
          subtitle={site.code ? `Project ${site.code}${site.gestationPeriod ? ` · ${site.gestationPeriod.replace(/\s+/g, " ")}` : ""}` : undefined}
          metrics={[
            { label: "Approved cost", value: formatMillions(site.approvedCost) },
            { label: "Released", value: formatMillions(site.released) },
            { label: "Utilized", value: formatMillions(site.utilized) },
          ]}
          progress={site.overallProgress}
        />,
        size,
      );
    }
  } catch {
    // Fall through to the generic card.
  }
  return new ImageResponse(
    <OgCard eyebrow="Tourism project" title="Punjab tourism & heritage projects" subtitle="Funding, releases and expenditure" metrics={[]} />,
    size,
  );
}
