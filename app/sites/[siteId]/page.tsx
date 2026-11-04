import { SiteDetail } from "@/components/site-detail";
import { sites } from "@/lib/sites";

export function generateStaticParams() {
  return sites.map((site) => ({ siteId: site.id }));
}

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
  const { siteId } = await params;
  const site = sites.find((item) => item.id === siteId);
  if (!site) return <SiteDetail site={null} siteId={siteId} />;
  return <SiteDetail site={site} siteId={siteId} />;
}
