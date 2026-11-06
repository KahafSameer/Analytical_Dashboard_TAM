export type AssistantHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

/** A figure taken from the connected Google Sheet. */
export type AssistantSource = {
  site: string;
  field: string;
  value: string;
  /** Dashboard route for the project, when the figure belongs to one project. */
  href?: string;
};

/** A web page used to answer (Google Search grounding, Wikipedia or a page the user supplied). */
export type AssistantWebSource = {
  title: string;
  url: string;
  /** google_search = Gemini grounding, web = live search via the Groq browser tool. */
  provider: "google_search" | "web" | "wikipedia" | "webpage" | "google_maps";
};

/** A located place with map links. */
export type AssistantPlace = {
  name: string;
  address?: string;
  latitude: number;
  longitude: number;
  googleMapsUrl: string;
  openStreetMapUrl: string;
};

/** What the user is looking at when they ask, so "this project" can be resolved. */
export type AssistantPageContext = {
  projectId?: string;
};

export type AssistantToolName =
  | "query_dashboard_data"
  | "get_project_details"
  | "web_search"
  | "find_place"
  | "read_webpage";

export type AssistantStreamEvent =
  | { type: "status"; id: string; tool: AssistantToolName; label: string; state: "running" | "done" | "failed" }
  /** Incremental answer text while the model writes. */
  | { type: "delta"; text: string }
  /** Discard streamed text (the model switched to calling tools, or a retry started). */
  | { type: "reset" }
  | {
    type: "answer";
    answer: string;
    sources: AssistantSource[];
    webSources: AssistantWebSource[];
    places: AssistantPlace[];
    toolsUsed: AssistantToolName[];
  }
  | { type: "error"; error: string };
