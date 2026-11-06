import type { Metadata } from "next";
import { SiteDetail } from "@/components/site-detail";
import { formatMillions, formatPercent } from "@/lib/analytics";
import { getDashboardData, getDashboardDataErrorMessage } from "@/lib/google-sheets";
import type { DashboardData } from "@/lib/types";

type Props = { params: Promise<{ siteId: string }> };

/** Title and description for link previews (WhatsApp, Facebook, X) and browser tabs. */
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { siteId } = await params;
  try {
    const site = (await getDashboardData()).sites.find((entry) => entry.id === siteId);
    if (!site) return { title: "Project not found" };
    const description = `${site.district} · Approved ${formatMillions(site.approvedCost)} · Released ${formatMillions(site.released)} · Utilized ${formatMillions(site.utilized)} · ${formatPercent(site.overallProgress)} financial progress`;
    return {
      title: site.name,
      description,
      openGraph: { type: "article", siteName: "Fieldnotes — Tourism Intelligence", title: site.name, description, locale: "en_PK" },
      twitter: { card: "summary_large_image", title: site.name, description },
    };
  } catch {
    return { title: "Tourism project" };
  }
}

export default async function SiteDetailPage({ params }: Props) {
  const { siteId } = await params;
  let initialData: DashboardData | null = null;
  let initialError: string | null = null;
  try {
    initialData = await getDashboardData();
  } catch (error) {
    initialError = getDashboardDataErrorMessage(error);
  }
  return <SiteDetail initialData={initialData} initialError={initialError} siteId={siteId} />;
}
