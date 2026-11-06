import type { AssistantHistoryMessage, AssistantPageContext } from "@/lib/assistant-context";

export const MAX_MESSAGE_LENGTH = 1_500;
export const MAX_HISTORY_MESSAGES = 8;
export const MAX_HISTORY_MESSAGE_LENGTH = 1_500;

export class RequestValidationError extends Error {}

export type ValidatedAssistantRequest = {
  message: string;
  history: AssistantHistoryMessage[];
  pageContext?: AssistantPageContext;
};

/** Validates and normalizes the assistant request body. Throws RequestValidationError. */
export function validateAssistantRequest(value: unknown): ValidatedAssistantRequest {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new RequestValidationError("invalid-request");
  }
  const body = value as { message?: unknown; history?: unknown; context?: unknown };
  if (typeof body.message !== "string" || !body.message.trim()) {
    throw new RequestValidationError("empty-message");
  }
  const message = body.message.trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new RequestValidationError("message-too-long");
  }

  const historyInput = body.history ?? [];
  if (!Array.isArray(historyInput)) throw new RequestValidationError("invalid-history");
  const history = historyInput.slice(-MAX_HISTORY_MESSAGES).map((item): AssistantHistoryMessage => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new RequestValidationError("invalid-history");
    }
    const entry = item as { role?: unknown; content?: unknown };
    if ((entry.role !== "user" && entry.role !== "assistant") || typeof entry.content !== "string") {
      throw new RequestValidationError("invalid-history");
    }
    // Long earlier answers are trimmed rather than rejected, so follow-up questions keep working.
    return { role: entry.role, content: entry.content.slice(0, MAX_HISTORY_MESSAGE_LENGTH) };
  }).filter((entry) => entry.content.trim());

  let pageContext: AssistantPageContext | undefined;
  if (body.context !== undefined && body.context !== null) {
    if (typeof body.context !== "object" || Array.isArray(body.context)) throw new RequestValidationError("invalid-context");
    const projectId = (body.context as { projectId?: unknown }).projectId;
    if (projectId !== undefined && (typeof projectId !== "string" || projectId.length > 200)) {
      throw new RequestValidationError("invalid-context");
    }
    if (projectId) pageContext = { projectId };
  }
  return { message, history, ...(pageContext ? { pageContext } : {}) };
}
