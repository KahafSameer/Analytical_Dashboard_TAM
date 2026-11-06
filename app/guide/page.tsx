import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CircleAlert, Info, Lightbulb } from "lucide-react";
import { PageTopline } from "@/components/dashboard-shell";
import { GuideVisit } from "@/components/guide-visit";
import { ATTENTION_COLOR, NEUTRAL_COLOR, SERIES_COLORS, heatCellStyle } from "@/lib/chart-theme";
import { COLOR_GUIDE, GLOSSARY } from "@/lib/guide-content";

export const metadata: Metadata = {
  title: "How to read this dashboard",
  description: "A 2-minute guide to the Punjab tourism projects dashboard: the money journey, what the colors mean, key words and how to use it.",
};

const JOURNEY = [
  { color: NEUTRAL_COLOR, title: "Approved", word: "Approved cost", text: "The total budget the government approved for the whole project." },
  { color: SERIES_COLORS.allocation, title: "Set aside", word: "Allocated", text: "The part of that budget planned for one budget year." },
  { color: SERIES_COLORS.release, title: "Handed over", word: "Released", text: "Money the Finance Department actually gave to the project." },
  { color: SERIES_COLORS.utilized, title: "Spent", word: "Utilized", text: "Money the project has actually used." },
];

const SECTIONS = [
  { id: "what", label: "What it shows" },
  { id: "money-journey", label: "The money journey" },
  { id: "colors", label: "Colors" },
  { id: "numbers", label: "Reading numbers" },
  { id: "glossary", label: "Key words" },
  { id: "how-to-use", label: "How to use it" },
  { id: "good-to-know", label: "Good to know" },
];

export default function GuidePage() {
  return (
    <div className="page-stack guide-page">
      <GuideVisit />
      <PageTopline section="How to read this dashboard" date="Official project records" />
      <section className="page-intro">
        <div>
          <div className="intro-kicker"><span className="intro-kicker-line" /> GUIDE</div>
          <h1>How to read this dashboard<span className="title-period">.</span></h1>
          <p>A 2-minute guide for anyone — no finance background needed.</p>
        </div>
      </section>

      <nav className="guide-toc" aria-label="On this page">
        {SECTIONS.map((section) => <a key={section.id} href={`#${section.id}`}>{section.label}</a>)}
      </nav>

      <section id="what" className="guide-section">
        <h2>What this dashboard shows</h2>
        <p>It follows the money for Punjab&apos;s tourism and heritage projects — museums, resorts, chairlifts, heritage sites and more: how much each project was approved, how much it has received and how much it has spent, and its planned start and finish dates. The numbers update automatically from the department&apos;s official project records.</p>
        <div className="guide-callout">
          <CircleAlert size={16} aria-hidden="true" />
          <p><strong>It does not show</strong> how much construction work is finished, visitor numbers or milestones — only money and dates. &quot;Progress&quot; on this dashboard always means money spent.</p>
        </div>
      </section>

      <section id="money-journey" className="guide-section">
        <h2>The money journey</h2>
        <p>Every project&apos;s money moves through four steps. Most charts use these words and these colors.</p>
        <ol className="journey">
          {JOURNEY.map((step, index) => (
            <li key={step.title}>
              <span className="journey-step" style={{ backgroundColor: step.color }}>{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <span className="journey-word">Official word: {step.word}</span>
                <p>{step.text}</p>
              </div>
              {index < JOURNEY.length - 1 && <ArrowRight size={16} className="journey-arrow" aria-hidden="true" />}
            </li>
          ))}
        </ol>
        <div className="guide-example">
          <Lightbulb size={16} aria-hidden="true" />
          <p><strong>Example:</strong> a museum project is approved for Rs 100m. This year Rs 30m is set aside, Rs 25m is handed over and Rs 20m is spent. Its <strong>financial progress</strong> is 20 ÷ 100 = <strong>20%</strong>, and Rs 5m has been handed over but not spent yet.</p>
        </div>
      </section>

      <section id="colors" className="guide-section">
        <h2>What the colors mean</h2>
        <p>Inside a chart, a color always means one thing. Every chart also has a legend (the small colored dots with names) and an <Info size={13} aria-label="info" className="inline-icon" /> button with a simple explanation.</p>
        <div className="color-groups">
          {COLOR_GUIDE.map((group) => (
            <div className="color-group" key={group.title}>
              <h3>{group.title}</h3>
              {group.note && <p className="color-group-note">{group.note}</p>}
              <ul className="color-list">
                {group.items.map((item) => (
                  <li key={`${group.title}-${item.name}`}>
                    <span className="color-swatch" style={{ backgroundColor: item.color }} aria-hidden="true" />
                    <div>
                      <strong>{item.name}</strong> — {item.meaning}
                      <small>Where: {item.where}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div className="color-group">
            <h3>More or less</h3>
            <p className="color-group-note">In &quot;Money by district and year&quot;, light green means less money and dark green means more. In &quot;Biggest projects by budget&quot;, dark to light green goes from the biggest project to the fifth biggest; light grey is all other projects.</p>
            <div className="color-ramp" aria-hidden="true">
              <span>Less</span>
              {[0.02, 0.1, 0.25, 0.45, 0.7, 1].map((share) => <i key={share} style={{ background: heatCellStyle(share, 1).background }} />)}
              <span>More</span>
            </div>
          </div>
        </div>
        <p className="guide-note">The same color can mean different things in different charts (for example blue is &quot;handed over&quot; in money charts but &quot;not started&quot; in the schedule chart) — the legend on each chart tells you which. Colors were also checked so that people with color blindness can tell them apart, and every chart shows the numbers too.</p>
        <p className="guide-note">Orange is used for things that need attention: <span className="guide-dot" style={{ backgroundColor: ATTENTION_COLOR }} /> money handed over but not spent, projects that have not spent anything, or a planned finish date that has passed.</p>
      </section>

      <section id="numbers" className="guide-section">
        <h2>Reading the numbers</h2>
        <ul className="guide-list">
          <li><strong>Rs 250.0m</strong> means 250 million rupees, which is <strong>25 crore</strong>.</li>
          <li><strong>Percentages</strong> such as 5.4% are shares — usually of the approved budget.</li>
          <li><strong>Budget years</strong> run from July to June: 2025–26 means 1 July 2025 to 30 June 2026.</li>
          <li><strong>A dash (—)</strong> means nothing is recorded.</li>
          <li><strong>More than 100%</strong> can appear when the records show more money set aside or spent than planned — worth checking with the project team.</li>
        </ul>
        <div className="guide-table-wrap">
          <table className="guide-table">
            <caption>Millions to lakh and crore</caption>
            <thead><tr><th scope="col">On the dashboard</th><th scope="col">In rupees</th><th scope="col">In lakh / crore</th></tr></thead>
            <tbody>
              <tr><td>Rs 1m</td><td>10,00,000</td><td>10 lakh</td></tr>
              <tr><td>Rs 10m</td><td>1,00,00,000</td><td>1 crore</td></tr>
              <tr><td>Rs 100m</td><td>10,00,00,000</td><td>10 crore</td></tr>
              <tr><td>Rs 1,000m</td><td>1,00,00,00,000</td><td>100 crore (1 arab)</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="glossary" className="guide-section">
        <h2>Key words</h2>
        <dl className="glossary">
          {GLOSSARY.map((term) => (
            <div id={term.id} key={term.id} className="glossary-item">
              <dt>{term.term}</dt>
              <dd>
                {term.short}
                {term.detail && <> {term.detail}</>}
                {term.example && <span className="glossary-example">Example: {term.example}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section id="how-to-use" className="guide-section">
        <h2>How to use the dashboard</h2>
        <ol className="how-to">
          <li><strong>Find projects.</strong> Type a name, code or district in the search box, or choose a district, spending status or progress range. Every number and chart on the page then shows only those projects.</li>
          <li><strong>Check one project quickly.</strong> In the project list, select <em>View progress</em> (or <em>Details</em> on smaller screens) to see its money, years and schedule without leaving the page.</li>
          <li><strong>Open a project page.</strong> Select a project&apos;s name for the full picture: an &quot;In short&quot; summary, its schedule, a comparison with its district and related projects.</li>
          <li><strong>Explore the charts.</strong> Tap <Info size={13} aria-label="info" className="inline-icon" /> for an explanation. Select a district bar or a district in the heatmap to show only that district — an <em>Undo</em> button appears.</li>
          <li><strong>Share or save.</strong> Use <em>Share</em> (WhatsApp, email, copy link) or <em>Print / PDF</em>. A shared link keeps your filters.</li>
          <li><strong>Ask the AI Assistant.</strong> The button at the bottom right answers questions in English or Urdu — for example &quot;Which district has the most money not spent yet?&quot;</li>
        </ol>
      </section>

      <section id="good-to-know" className="guide-section">
        <h2>Good to know</h2>
        <ul className="guide-list">
          <li>Financial progress is about money, not construction: a project can have finished work with unpaid bills, or the opposite.</li>
          <li>&quot;Spending behind the calendar&quot; is a reason to ask questions, not proof of delay — some projects pay most of their bills near the end.</li>
          <li>&quot;Punjab&quot; or &quot;Multiple District&quot; in the district column means the project covers the whole province or several districts.</li>
          <li>The data refreshes automatically; the time of the last update is shown at the top right of each page.</li>
        </ul>
      </section>

      <div className="guide-cta">
        <Link href="/" className="button button-primary"><BookOpen size={15} /> Go to the dashboard</Link>
        <Link href="/#sites" className="button button-outline">See all projects</Link>
      </div>
      <footer className="page-footer"><span>FIELDNOTES <b>·</b> TOURISM INTELLIGENCE</span><span>Guide · money in millions of rupees</span></footer>
    </div>
  );
}
