import Link from "next/link";
import { Lightbulb } from "lucide-react";

/** Plain-language summary at the top of a page, built from the data (see lib/plain-summary.ts). */
export function InShort({ sentences, guideLink = true }: { sentences: string[]; guideLink?: boolean }) {
  if (!sentences.length) return null;
  return (
    <section className="in-short" aria-labelledby="in-short-title">
      <span className="in-short-icon" aria-hidden="true"><Lightbulb size={17} /></span>
      <div>
        <h2 id="in-short-title" className="in-short-title">In short</h2>
        <p className="in-short-text">{sentences.join(" ")}</p>
        {guideLink && <Link href="/guide" className="in-short-link">New here? Read the 2-minute guide →</Link>}
      </div>
    </section>
  );
}
