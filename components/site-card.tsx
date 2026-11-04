import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import type { Site } from "@/lib/types";
import { formatPercent } from "@/lib/analytics";
import { ProgressBar, StatusBadge } from "@/components/ui";

export function SiteCard({ site, priority = false }: { site: Site; priority?: boolean }) {
  const hasSpend = site.utilized > 0;
  return (
    <article className="site-card">
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
          <span className="image-category">{site.category}</span>
          <span className="image-arrow"><ArrowUpRight size={16} /></span>
        </div>
      </Link>
      <div className="site-card-body">
        <div className="site-location"><MapPin size={13} /><span>{site.district}, {site.region}</span><span className="site-code">#{site.code ?? "PROJECT"}</span></div>
        <Link href={`/sites/${site.id}`} className="site-title-link"><h3>{site.name}</h3></Link>
        <p className="site-description">{site.description}</p>
        <div className="card-progress-label"><span>Financial progress</span><strong>{formatPercent(site.overallProgress)}</strong></div>
        <ProgressBar value={site.overallProgress} compact />
        <div className="site-card-footer">
          <StatusBadge status={hasSpend ? "Spend recorded" : "No spend yet"} tone={hasSpend ? "green" : "gold"} />
          <Link href={`/sites/${site.id}`} className="text-link">View progress <ArrowUpRight size={14} /></Link>
        </div>
      </div>
    </article>
  );
}
