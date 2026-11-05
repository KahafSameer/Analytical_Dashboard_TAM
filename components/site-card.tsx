import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Site } from "@/lib/types";
import { formatMillions, formatPercent } from "@/lib/analytics";
import { formatLocation, isSpecified } from "@/lib/portfolio-filters";
import { ProgressBar, StatusBadge } from "@/components/ui";

export function SiteCard({
  site,
  priority = false,
  showImage = true,
}: {
  site: Site;
  priority?: boolean;
  /** Hide imagery when every project shares the same fallback photo. */
  showImage?: boolean;
}) {
  const hasSpend = site.utilized > 0;
  return (
    <article className={`site-card${showImage ? "" : " site-card-compact"}`}>
      {showImage && (
        <Link href={`/sites/${site.id}`} className="site-card-image-link" aria-label={`View ${site.name} progress`}>
          <div className="site-card-image">
            <Image
              src={site.image}
              alt={`${site.category} project in ${site.district}`}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="site-image"
              loading={priority ? "eager" : "lazy"}
            />
            {isSpecified(site.category) && <span className="image-category">{site.category}</span>}
            <span className="image-arrow"><ArrowUpRight size={16} /></span>
          </div>
        </Link>
      )}
      <div className="site-card-body">
        <div className="site-location"><MapPin size={13} /><span>{formatLocation(site)}</span><span className="site-code">#{site.code ?? "PROJECT"}</span></div>
        <Link href={`/sites/${site.id}`} className="site-title-link"><h3>{site.name}</h3></Link>
        {site.description.trim().toLowerCase() !== site.name.trim().toLowerCase() && <p className="site-description">{site.description}</p>}
        <div className="card-progress-label"><span>Financial progress</span><strong>{formatPercent(site.overallProgress)}</strong></div>
        <ProgressBar value={site.overallProgress} compact />
        <div className="card-figures">
          <span>Approved <strong>{formatMillions(site.approvedCost)}</strong></span>
          <span>Utilized <strong>{formatMillions(site.utilized)}</strong></span>
        </div>
        <div className="site-card-footer">
          <StatusBadge status={hasSpend ? "Spend recorded" : "No spend yet"} tone={hasSpend ? "green" : "gold"} />
          <Link href={`/sites/${site.id}`} className="text-link">View details <ArrowUpRight size={14} /></Link>
        </div>
      </div>
    </article>
  );
}
