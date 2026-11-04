import { SiteDetail } from "@/components/site-detail";
import { getDashboardData, getDashboardDataErrorMessage } from "@/lib/google-sheets";
import type { DashboardData } from "@/lib/types";

export default async function SiteDetailPage({ params }: { params: Promise<{ siteId: string }> }) {
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
