"use client";

import { Fragment, useMemo } from "react";
import { ArrowDown, CircleAlert } from "lucide-react";
import { formatMillions, formatPercent, getFundingPipeline, type PipelineStageId } from "@/lib/analytics";
import { NEUTRAL_COLOR, SERIES_COLORS } from "@/lib/chart-theme";
import type { Site } from "@/lib/types";
import { Reveal } from "@/components/motion";

const STAGE_COLORS: Record<PipelineStageId, string> = {
  approved: NEUTRAL_COLOR,
  allocated: SERIES_COLORS.allocation,
  released: SERIES_COLORS.release,
  utilized: SERIES_COLORS.utilized,
};

/** Approved → allocated → released → utilized, with the conversion between each stage. */
export function FundingPipeline({ sites }: { sites: Site[] }) {
  const stages = useMemo(() => getFundingPipeline(sites), [sites]);
  const released = stages[2].value;
  const utilized = stages[3].value;
  return (
    <Reveal className="funding-note-reveal">
      <section className="chart-card pipeline-card" aria-labelledby="pipeline-title">
        <div className="chart-card-heading">
          <div>
            <h3 id="pipeline-title">Funding pipeline</h3>
            <p>How approved cost moves to spending · bars are shares of approved cost.</p>
          </div>
        </div>
        <ol className="pipeline">
          {stages.map((stage, index) => (
            <Fragment key={stage.id}>
              {index > 0 && stage.ofPrevious !== null && (
                <li className="pipeline-step" aria-hidden="true">
                  <ArrowDown size={12} />
                  <span><strong>{formatPercent(stage.ofPrevious)}</strong> {stage.verb}</span>
                </li>
              )}
              <li className="pipeline-stage">
                <div className="pipeline-row">
                  <span className="pipeline-label"><i style={{ backgroundColor: STAGE_COLORS[stage.id] }} />{stage.label}</span>
                  <strong>{formatMillions(stage.value, 0)}</strong>
                </div>
                <div className="pipeline-track" aria-hidden="true">
                  <i style={{ width: `${Math.max(stage.value > 0 ? 1.2 : 0, stage.ofApproved * 100)}%`, backgroundColor: STAGE_COLORS[stage.id] }} />
                </div>
                <span className="sr-only">
                  {formatPercent(stage.ofApproved)} of approved cost{stage.ofPrevious !== null ? `; ${formatPercent(stage.ofPrevious)} of the previous stage ${stage.verb}` : ""}.
                </span>
              </li>
            </Fragment>
          ))}
        </ol>
        <div className="funding-stat"><span>Released, not yet spent</span><strong>{formatMillions(Math.max(0, released - utilized), 0)}</strong></div>
        <p className="pipeline-note"><CircleAlert size={13} /> Financial progress, not construction progress: the sheet reports budgets, releases and spending only.</p>
      </section>
    </Reveal>
  );
}
