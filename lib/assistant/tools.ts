import "server-only";

import type { FunctionDeclaration } from "@google/genai";
import type {
  AssistantHistoryMessage,
  AssistantSource,
  AssistantToolName,
} from "@/lib/assistant-context";
import type { DatasetSchema } from "@/lib/data-schema";
import type { DashboardData } from "@/lib/types";
import { runDatasetQuestion } from "@/lib/assistant/dataset-tool";
import { findPlace, readWebpage, webSearch, type ToolOutcome } from "@/lib/assistant/grounding";
import { buildProjectProfile, findProjects } from "@/lib/assistant/project-lookup";

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: "query_dashboard_data",
    description: "Run an analytical query over the dashboard's tourism project data: filters, rankings (top/bottom N), counts, totals, averages, medians, grouping (e.g. by district), comparisons between fields, fiscal-year figures, outliers and portfolio summaries. Results are computed exactly in code and are authoritative. Pass one complete, self-contained question with follow-up references already resolved (e.g. 'projects in Murree with financial progress below 50%').",
    parametersJsonSchema: {
      type: "object",
      properties: { question: { type: "string", description: "Self-contained analytical question about the project data." } },
      required: ["question"],
    },
  },
  {
    name: "get_project_details",
    description: "Look up a single project in the dashboard data by name, partial name, project code or ID and return its full profile: district, description, approved/allocated/released/utilized funds, financial progress, fiscal-year breakdown and dashboard link. Use it for 'tell me about X', to identify which project the user means, and before locating a project on the map.",
    parametersJsonSchema: {
      type: "object",
      properties: { project: { type: "string", description: "Project name, partial name, code or ID." } },
      required: ["project"],
    },
  },
  {
    name: "web_search",
    description: "Search the internet for anything not contained in the dashboard data: tourist attractions, history and background of a place or topic, travel and seasonal information, news, government or tourism policies, definitions and general knowledge. Write a specific search query; English queries usually give the best results.",
    parametersJsonSchema: {
      type: "object",
      properties: { query: { type: "string", description: "Specific web search query." } },
      required: ["query"],
    },
  },
  {
    name: "find_place",
    description: "Locate a place on the map: coordinates, full address, Google Maps / OpenStreetMap links and notable places nearby. Optionally give 'from' to also get the straight-line distance and a directions link. When locating a dashboard project, use the project's site name plus its district and 'Punjab, Pakistan'.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        place: { type: "string", description: "Place to locate, as specific as possible." },
        from: { type: "string", description: "Optional starting place for distance and directions." },
      },
      required: ["place"],
    },
  },
  {
    name: "read_webpage",
    description: "Read one specific public web page and extract information from it. Only use URLs the user provided or that appeared in earlier tool results.",
    parametersJsonSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "Public http(s) URL." },
        focus: { type: "string", description: "What to look for on the page." },
      },
      required: ["url"],
    },
  },
];

const TOOL_NAMES = new Set<string>(toolDeclarations.map((tool) => tool.name as string));

export function isAssistantTool(name: unknown): name is AssistantToolName {
  return typeof name === "string" && TOOL_NAMES.has(name);
}

function stringArg(args: Record<string, unknown> | undefined, key: string, max = 600): string {
  const value = args?.[key];
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

const quote = (value: string, max = 60) => `“${value.length > max ? `${value.slice(0, max - 1)}…` : value}”`;

export function describeToolCall(name: AssistantToolName, args: Record<string, unknown> | undefined): string {
  switch (name) {
    case "query_dashboard_data": return "Analyzing project data";
    case "get_project_details": return `Looking up project ${quote(stringArg(args, "project"))}`;
    case "web_search": return `Searching the web for ${quote(stringArg(args, "query"))}`;
    case "find_place": return `Locating ${quote(stringArg(args, "place"))} on the map`;
    case "read_webpage": {
      const url = stringArg(args, "url", 2048);
      try { return `Reading ${new URL(url).hostname}`; } catch { return "Reading a web page"; }
    }
  }
}

export type ToolContext = {
  dashboard: DashboardData;
  schema: DatasetSchema;
  history: AssistantHistoryMessage[];
  today: string;
  /** URLs read_webpage may open: written by the user, or returned by tools for this question. */
  allowedUrls: Set<string>;
};

export type ExecutedTool = ToolOutcome & { sources?: AssistantSource[] };

export async function executeTool(
  name: AssistantToolName,
  args: Record<string, unknown> | undefined,
  context: ToolContext,
): Promise<ExecutedTool> {
  switch (name) {
    case "query_dashboard_data": {
      const question = stringArg(args, "question", 1_500);
      if (!question) return { result: { status: "missing_question" } };
      const { result, sources } = await runDatasetQuestion(question, context.history, context.dashboard, context.schema);
      return { result, sources };
    }
    case "get_project_details": {
      const query = stringArg(args, "project", 300);
      const matches = findProjects(context.dashboard.sites, query, 3);
      if (!matches.length) {
        return { result: { status: "no_matching_project", query, hint: "Try query_dashboard_data with a broader description, or ask the user which project they mean." } };
      }
      const confident = matches[0].score >= 0.85 || matches.length === 1 || matches[0].score - (matches[1]?.score ?? 0) >= 0.2;
      const top = confident ? [matches[0]] : matches;
      return {
        result: {
          status: confident ? "found" : "multiple_candidates",
          projects: top.map((match) => buildProjectProfile(match.site)),
        },
        sources: top.flatMap(({ site }) => [
          { site: site.name, field: "District", value: site.district, href: `/sites/${site.id}` },
          { site: site.name, field: "Financial progress", value: `${(site.overallProgress * 100).toFixed(1)}%`, href: `/sites/${site.id}` },
        ]),
      };
    }
    case "web_search": {
      const query = stringArg(args, "query", 300);
      if (!query) return { result: { status: "missing_query" } };
      return webSearch(query, context.today);
    }
    case "find_place": {
      const place = stringArg(args, "place", 250);
      if (!place) return { result: { status: "missing_place" } };
      return findPlace(place, stringArg(args, "from", 250) || undefined, context.today);
    }
    case "read_webpage": {
      const url = stringArg(args, "url", 2048);
      let normalized = "";
      try { normalized = new URL(url).href; } catch { /* invalid URL handled below */ }
      // Provenance check: a URL suggested by web content (prompt injection) must not be fetched.
      if (!normalized || !context.allowedUrls.has(normalized)) {
        return { result: { status: "url_not_allowed", note: "Only URLs the user wrote or that earlier tools returned for this question can be read." } };
      }
      return readWebpage(normalized, stringArg(args, "focus", 300));
    }
  }
}
