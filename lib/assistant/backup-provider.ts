import "server-only";

import type { AssistantHistoryMessage } from "@/lib/assistant-context";
import { describeProviderError, getChatProviders, streamChatWithFailover, type ChatMessage } from "@/lib/assistant/openai-compatible";
import { parseToolArguments, toOpenAiTools } from "@/lib/assistant/openai-stream";
import { toolDeclarations } from "@/lib/assistant/tools";

/** Groq's free tier allows ~8k tokens/minute per model, so backup prompts stay compact. */
const MAX_BACKUP_PROMPT_CHARS = 12_000;
const MAX_TOOL_RESULT_CHARS = 4_000;
const MAX_BACKUP_TURNS = 4;

/** True when a backup model is configured and not used up, so Gemini need not be waited for. */
export function hasBackupProvider(): boolean {
  return getChatProviders().length > 0;
}

function historyMessages(history: AssistantHistoryMessage[]): ChatMessage[] {
  return history.slice(-6).map((item) => ({ role: item.role, content: item.content.slice(0, 1_000) }));
}

type SynthesisOptions = {
  systemInstruction: string;
  history: AssistantHistoryMessage[];
  prompt: string;
  timeoutMs: number;
  signal?: AbortSignal;
  onDelta: (text: string) => void;
  onReset: () => void;
};

/** Writes a plain-text answer from a prepared prompt on the first available backup model. */
export async function synthesizeWithBackupProvider(options: SynthesisOptions): Promise<string> {
  if (options.signal?.aborted) return "";
  const deadline = Date.now() + options.timeoutMs;
  const prompt = options.prompt.length > MAX_BACKUP_PROMPT_CHARS
    ? `${options.prompt.slice(0, MAX_BACKUP_PROMPT_CHARS)}\n…(truncated)`
    : options.prompt;
  options.onReset();
  try {
    const { content } = await streamChatWithFailover({
      messages: [{ role: "system", content: options.systemInstruction }, ...historyMessages(options.history), { role: "user", content: prompt }],
      timeoutMs: options.timeoutMs,
      remainingMs: () => deadline - Date.now(),
      signal: options.signal,
      onDelta: options.onDelta,
      onReset: options.onReset,
    });
    return content;
  } catch (error) {
    console.error("[assistant] backup synthesis failed", describeProviderError(error));
    return "";
  }
}

type AgentOptions = {
  systemInstruction: string;
  history: AssistantHistoryMessage[];
  userText: string;
  remainingMs: () => number;
  signal?: AbortSignal;
  runTool: (name: string, args: Record<string, unknown>) => Promise<Record<string, unknown>>;
  onDelta: (text: string) => void;
  onReset: () => void;
};

/**
 * Runs the same tool-using agent on backup models (OpenAI-compatible function calling) when
 * every Gemini model is unavailable. Each turn fails over to the next backup model, continuing
 * the same conversation. Returns "" if no provider is configured or all fail.
 */
export async function runBackupAgent(options: AgentOptions): Promise<string> {
  const tools = toOpenAiTools(toolDeclarations);
  const messages: ChatMessage[] = [
    { role: "system", content: options.systemInstruction },
    ...historyMessages(options.history),
    { role: "user", content: options.userText },
  ];
  try {
    for (let turn = 0; turn < MAX_BACKUP_TURNS; turn += 1) {
      if (options.signal?.aborted) return "";
      const finalTurn = turn === MAX_BACKUP_TURNS - 1 || options.remainingMs() < 14_000;
      options.onReset();
      const result = await streamChatWithFailover({
        messages,
        tools: finalTurn ? undefined : tools,
        timeoutMs: Math.min(25_000, Math.max(5_000, options.remainingMs())),
        remainingMs: options.remainingMs,
        signal: options.signal,
        onDelta: options.onDelta,
        onReset: options.onReset,
      });
      if (!result.toolCalls.length || finalTurn) return result.content;
      messages.push({
        role: "assistant",
        content: result.content || null,
        tool_calls: result.toolCalls.map((call, index) => ({
          id: call.id || `call_${turn}_${index}`,
          type: "function" as const,
          function: { name: call.name, arguments: call.arguments || "{}" },
        })),
      });
      const outputs = await Promise.all(result.toolCalls.map((call) => options.runTool(call.name, parseToolArguments(call.arguments))));
      result.toolCalls.forEach((call, index) => {
        messages.push({
          role: "tool",
          tool_call_id: call.id || `call_${turn}_${index}`,
          content: JSON.stringify(outputs[index]).slice(0, MAX_TOOL_RESULT_CHARS),
        });
      });
    }
  } catch (error) {
    console.error("[assistant] backup agent failed", describeProviderError(error));
  }
  return "";
}
