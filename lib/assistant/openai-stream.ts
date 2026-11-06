/**
 * Pure helpers for OpenAI-compatible chat APIs (Groq, NVIDIA): server-sent-event parsing,
 * streamed tool-call assembly and tool-format conversion. No network access here.
 */

import { parseDurationMs } from "@/lib/assistant/rate-limits";

export type OpenAiToolCall = { id: string; name: string; arguments: string };

/** Splits an SSE buffer into complete `data:` payloads, returning the unfinished remainder. */
export function takeSseData(buffer: string): { payloads: string[]; rest: string } {
  const payloads: string[] = [];
  const lines = buffer.split("\n");
  const rest = lines.pop() ?? "";
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (line.startsWith("data:")) payloads.push(line.slice(5).trim());
  }
  return { payloads, rest };
}

type ChatDelta = {
  content?: string | null;
  tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
};

/** Merges one streamed delta into the tool-call accumulator; returns any answer text in it. */
export function applyChatDelta(toolCalls: Map<number, OpenAiToolCall>, delta: ChatDelta | undefined): string {
  if (!delta) return "";
  for (const call of delta.tool_calls ?? []) {
    const index = call.index ?? toolCalls.size;
    const current = toolCalls.get(index) ?? { id: "", name: "", arguments: "" };
    if (call.id) current.id = call.id;
    if (call.function?.name) current.name += call.function.name;
    if (call.function?.arguments) current.arguments += call.function.arguments;
    toolCalls.set(index, current);
  }
  return typeof delta.content === "string" ? delta.content : "";
}

/** Parses tool-call arguments defensively; malformed JSON yields an empty object. */
export function parseToolArguments(raw: string): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(raw || "{}");
    return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

/** Removes browser-tool citation markers such as 【1†L14-L18】 from model text. */
export function stripCitationMarkers(text: string): string {
  return text.replace(/【[^】]{0,40}】/g, "").replace(/[ \t]{2,}/g, " ").trim();
}

type Declaration = { name?: string; description?: string; parametersJsonSchema?: unknown };

/** Converts Gemini function declarations to the OpenAI `tools` format. */
export function toOpenAiTools(declarations: Declaration[]) {
  return declarations
    .filter((declaration) => declaration.name)
    .map((declaration) => ({
      type: "function" as const,
      function: {
        name: declaration.name as string,
        description: declaration.description ?? "",
        parameters: (declaration.parametersJsonSchema ?? { type: "object", properties: {} }) as Record<string, unknown>,
      },
    }));
}

/** Retry-After / x-ratelimit-reset style header ("2.5", "3.967s", "1m30s", "802ms") in milliseconds. */
export function parseRetryAfterMs(value: string | null): number | undefined {
  return parseDurationMs(value);
}
