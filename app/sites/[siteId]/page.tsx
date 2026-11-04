import { SiteDetail } from "@/components/site-detail";
import { DataSourceError } from "@/components/data-source-state";
import { getSites } from "@/lib/site-repository";
import type { Site } from "@/lib/types";

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  let sites: Site[];
  try {
    sites = getSites();
  } catch {
    return <DataSourceError />;
  }
  const site = sites.find((item) => item.id === siteId);
  if (!site) return <SiteDetail site={null} siteId={siteId} />;
  return <SiteDetail site={site} siteId={siteId} />;
}
