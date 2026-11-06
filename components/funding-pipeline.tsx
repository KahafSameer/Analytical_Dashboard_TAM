"use client";

import { Fragment, useMemo } from "react";
import { ArrowDown, CircleAlert } from "lucide-react";
import { formatMillions, formatPercent, getFundingPipeline, type PipelineStageId } from "@/lib/analytics";
import { NEUTRAL_COLOR, SERIES_COLORS } from "@/lib/chart-theme";
import type { Site } from "@/lib/types";
import { Reveal, revealIndex, useReveal } from "@/components/motion";
import { InfoTip } from "@/components/info-tip";
import { CHART_HELP } from "@/lib/guide-content";

const STAGE_COLORS: Record<PipelineStageId, string> = {
  approved: NEUTRAL_COLOR,
  allocated: SERIES_COLORS.allocation,
  released: SERIES_COLORS.release,
  utilized: SERIES_COLORS.utilized,
};

/** Approved → allocated → released → utilized, with the conversion between each stage. */
export function FundingPipeline({ sites }: { sites: Site[] }) {
  const stages = useMemo(() => getFundingPipeline(sites), [sites]);
  const { ref, revealState } = useReveal<HTMLElement>();
  const released = stages[2].value;
  const utilized = stages[3].value;
  return (
    <Reveal className="funding-note-reveal">
      <section ref={ref} data-reveal={revealState} data-tour="pipeline" className="chart-card pipeline-card" aria-labelledby="pipeline-title">
        <div className="chart-card-heading">
          <div>
            <h3 id="pipeline-title">Where the money is<InfoTip title="Where the money is" label="How to read “Where the money is”" guideAnchor="money-journey">{CHART_HELP.pipeline}</InfoTip></h3>
            <p>From the approved budget to money actually spent · bar length = share of the approved budget.</p>
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
              <li className="pipeline-stage" style={revealIndex(index * 2)}>
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
        <div className="funding-stat"><span>Handed over but not spent yet</span><strong>{formatMillions(Math.max(0, released - utilized), 0)}</strong></div>
        <p className="pipeline-note"><CircleAlert size={13} /> This is about money, not construction: it shows spending, not how much work is finished.</p>
      </section>
    </Reveal>
  );
}
