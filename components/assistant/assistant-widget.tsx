"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowUp,
  Bot,
  Check,
  CircleAlert,
  Copy,
  Database,
  Globe,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Sparkles,
  Square,
  X,
} from "lucide-react";
import type {
  AssistantPlace,
  AssistantSource,
  AssistantStreamEvent,
  AssistantToolName,
  AssistantWebSource,
} from "@/lib/assistant-context";
import { hostnameOf } from "@/lib/assistant/links";
import { assistantSharePayload } from "@/lib/share";
import { AssistantMarkdown } from "@/components/assistant/assistant-markdown";
import { useDashboardData } from "@/components/dashboard-data-provider";
import { ShareMenu } from "@/components/share-menu";

type Step = { id: string; tool: AssistantToolName; label: string; state: "running" | "done" | "failed" };

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  steps?: Step[];
  sources?: AssistantSource[];
  webSources?: AssistantWebSource[];
  places?: AssistantPlace[];
  toolsUsed?: AssistantToolName[];
  pending?: boolean;
  stopped?: boolean;
  isError?: boolean;
};

class AssistantRequestError extends Error {}

const HISTORY_MESSAGES = 8;
const HISTORY_CHARS = 1_500;
const REQUEST_TIMEOUT_MS = 80_000;
const DEFAULT_ERROR = "Sorry, I couldn’t answer that right now. Please try again.";

const overviewSuggestions = [
  "Which 5 projects have the most released but unspent funds?",
  "Kotli Sattian chair lift project kahan hai aur iski progress kya hai?",
  "Which district has the lowest financial progress, and what is it known for?",
  "پنجاب میں سیاحت کے بڑے مقامات کون سے ہیں؟",
];

const projectSuggestions = [
  "Summarize this project’s funding and progress",
  "Where is this project located, and what’s nearby?",
  "Is project ki location tak Lahore se kitna fasla hai?",
  "Tell me about this area as a tourist destination",
];

const toolIcon: Record<AssistantToolName, typeof Database> = {
  query_dashboard_data: Database,
  get_project_details: Database,
  web_search: Globe,
  read_webpage: Globe,
  find_place: MapPin,
};

const toolGroup = (tool: AssistantToolName) =>
  tool === "find_place" ? "Map" : tool === "web_search" || tool === "read_webpage" ? "Web" : "Dashboard data";

function knownUrlsOf(message: ChatMessage): Set<string> {
  return new Set([
    ...(message.webSources ?? []).map((source) => source.url),
    ...(message.places ?? []).flatMap((place) => [place.googleMapsUrl, place.openStreetMapUrl]),
  ]);
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <ul className="assistant-steps">
      {steps.map((step) => {
        const Icon = toolIcon[step.tool];
        return (
          <li key={step.id} className={`assistant-step assistant-step-${step.state}`}>
            <span className="assistant-step-icon" aria-hidden="true">
              {step.state === "running" ? <LoaderCircle size={13} /> : step.state === "failed" ? <CircleAlert size={13} /> : <Check size={13} />}
            </span>
            <Icon size={13} aria-hidden="true" className="assistant-step-tool" />
            <span>{step.label}{step.state === "failed" ? " — unavailable" : ""}</span>
          </li>
        );
      })}
    </ul>
  );
}

function SourceList({ message }: { message: ChatMessage }) {
  const sources = message.sources ?? [];
  const webSources = message.webSources ?? [];
  const places = message.places ?? [];
  const groups = [...new Set((message.toolsUsed ?? []).map(toolGroup))];
  if (!sources.length && !webSources.length && !places.length) {
    return groups.length ? <div className="assistant-source-summary">Checked: {groups.join(" · ")}</div> : null;
  }
  return (
    <details className="assistant-sources">
      <summary>
        <span className="assistant-source-mark" aria-hidden="true" />
        Sources: {groups.join(" · ") || "Answer details"}
        <span className="assistant-source-count">{sources.length + webSources.length + places.length}</span>
      </summary>
      <div className="assistant-source-body">
        {places.map((place) => (
          <div className="assistant-source-row" key={`${place.latitude},${place.longitude}`}>
            <MapPin size={12} aria-hidden="true" />
            <span className="assistant-source-text">{place.name}</span>
            <a href={place.googleMapsUrl} target="_blank" rel="noopener noreferrer nofollow">Google Maps</a>
            <a href={place.openStreetMapUrl} target="_blank" rel="noopener noreferrer nofollow">OSM</a>
          </div>
        ))}
        {sources.map((source, index) => (
          <div className="assistant-source-row" key={`s${index}`}>
            <Database size={12} aria-hidden="true" />
            <span className="assistant-source-text">
              {source.href ? <Link href={source.href}>{source.site}</Link> : source.site} · {source.field}: <strong>{source.value}</strong>
            </span>
          </div>
        ))}
        {webSources.map((source) => (
          <div className="assistant-source-row" key={source.url}>
            <Globe size={12} aria-hidden="true" />
            <a className="assistant-source-text" href={source.url} target="_blank" rel="noopener noreferrer nofollow">{source.title}</a>
            <span className="assistant-source-host">{source.provider === "wikipedia" ? "Wikipedia" : hostnameOf(source.url)}</span>
          </div>
        ))}
        {places.length > 0 && (
          <div className="assistant-attribution">
            Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer nofollow">OpenStreetMap</a> contributors
          </div>
        )}
      </div>
    </details>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="assistant-icon-action"
      aria-label={copied ? "Copied" : "Copy answer"}
      title={copied ? "Copied" : "Copy answer"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? <Check size={13} /> : <Copy size={13} />}
    </button>
  );
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const reduceMotion = useReducedMotion();
  const pathname = usePathname();
  const { data } = useDashboardData();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const messageId = useRef(0);
  const sentAtRef = useRef(0);
  const [announcement, setAnnouncement] = useState("");

  const projectId = pathname.match(/^\/sites\/([^/]+)/)?.[1];
  const decodedProjectId = projectId ? decodeURIComponent(projectId) : undefined;
  const viewingProject = useMemo(
    () => (decodedProjectId ? data?.sites.find((site) => site.id === decodedProjectId) : undefined),
    [data, decodedProjectId],
  );
  const suggestions = decodedProjectId ? projectSuggestions : overviewSuggestions;

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  // Follow new content only while the reader is already near the bottom.
  useEffect(() => {
    const element = messagesRef.current;
    if (!element) return;
    if (element.scrollHeight - element.scrollTop - element.clientHeight < 80) element.scrollTop = element.scrollHeight;
  }, [messages]);

  // Reopening the panel shows the latest messages.
  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => {
      const element = messagesRef.current;
      if (element) element.scrollTop = element.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  const updateMessage = useCallback((id: number, update: (message: ChatMessage) => ChatMessage) => {
    setMessages((current) => current.map((message) => (message.id === id ? update(message) : message)));
  }, []);

  const applyEvent = useCallback((id: number, event: AssistantStreamEvent) => {
    updateMessage(id, (message) => {
      switch (event.type) {
        case "status": {
          const steps = message.steps ?? [];
          const existing = steps.some((step) => step.id === event.id);
          return {
            ...message,
            steps: existing
              ? steps.map((step) => (step.id === event.id ? { ...step, state: event.state } : step))
              : [...steps, { id: event.id, tool: event.tool, label: event.label, state: event.state }],
          };
        }
        case "delta": return { ...message, content: message.content + event.text };
        case "reset": return { ...message, content: "" };
        case "answer": return {
          ...message,
          content: event.answer,
          sources: event.sources,
          webSources: event.webSources,
          places: event.places,
          toolsUsed: event.toolsUsed,
          pending: false,
        };
        default: return message; // errors are handled by the stream reader
      }
    });
  }, [updateMessage]);

  const submitQuestion = useCallback(async (question: string) => {
    const message = question.trim();
    if (!message || isSending) return;
    setDraft("");
    sentAtRef.current = Date.now();
    setAnnouncement("");
    // Interrupted or failed answers are not sent back as context.
    const history = messages
      .filter((item) => !item.isError && !item.pending && !item.stopped && item.content.trim())
      .slice(-HISTORY_MESSAGES)
      .map(({ role, content }) => ({ role, content: content.slice(0, HISTORY_CHARS) }));
    const answerId = messageId.current + 2;
    messageId.current += 2;
    setMessages((current) => [
      ...current,
      { id: answerId - 1, role: "user", content: message },
      { id: answerId, role: "assistant", content: "", steps: [], pending: true },
    ]);
    setIsSending(true);
    // Keep focus inside the dialog (a clicked suggestion button disappears).
    inputRef.current?.focus();

    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    let gotAnswer = false;
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history, context: decodedProjectId ? { projectId: decodedProjectId } : undefined }),
        signal: controller.signal,
      });
      if (!(response.headers.get("content-type") ?? "").includes("ndjson") || !response.body) {
        const result = await response.json().catch(() => ({})) as { error?: string };
        throw new AssistantRequestError(result.error ?? DEFAULT_ERROR);
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline).trim();
          buffer = buffer.slice(newline + 1);
          if (!line) continue;
          let event: AssistantStreamEvent;
          try {
            event = JSON.parse(line) as AssistantStreamEvent;
          } catch {
            continue;
          }
          if (event.type === "error") throw new AssistantRequestError(event.error);
          if (event.type === "answer") {
            gotAnswer = true;
            setAnnouncement(event.answer);
          }
          applyEvent(answerId, event);
        }
      }
      if (!gotAnswer) throw new AssistantRequestError(DEFAULT_ERROR);
    } catch (requestError) {
      const stoppedByUser = controller.signal.aborted && controllerRef.current === null;
      updateMessage(answerId, (current) => {
        if (stoppedByUser) return { ...current, pending: false, stopped: true };
        return {
          ...current,
          pending: false,
          isError: true,
          content: requestError instanceof AssistantRequestError
            ? requestError.message
            : controller.signal.aborted ? "That took too long. Please try again or ask a narrower question." : DEFAULT_ERROR,
        };
      });
    } finally {
      window.clearTimeout(timeout);
      if (controllerRef.current === controller) controllerRef.current = null;
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [applyEvent, decodedProjectId, isSending, messages, updateMessage]);

  function stop() {
    const controller = controllerRef.current;
    controllerRef.current = null; // marks the abort as user-initiated
    controller?.abort();
  }

  // The Stop button appears where Send was; ignore the second click of a double-click on Send.
  function handleStopClick() {
    if (Date.now() - sentAtRef.current < 700) return;
    stop();
  }

  function newChat() {
    stop();
    setAnnouncement("");
    setMessages([]);
    setDraft("");
    inputRef.current?.focus();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(draft);
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea:not([disabled]), summary',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            ref={buttonRef}
            type="button"
            className="assistant-launcher"
            aria-label="Open AI Assistant"
            onClick={() => setOpen(true)}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
            transition={{ duration: reduceMotion ? 0.12 : 0.24 }}
            // Always set (not conditional on reduced motion): the server cannot know the user's setting, and a
            // conditional gesture changes the rendered tabindex. MotionConfig reducedMotion="user" skips the scale.
            whileTap={{ scale: 0.97 }}
          >
            <Sparkles size={17} aria-hidden="true" />
            <span>AI Assistant</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              className="assistant-scrim"
              aria-label="Close AI Assistant"
              tabIndex={-1}
              onClick={close}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.2 }}
            />
            <motion.section
              className="assistant-panel"
              role="dialog"
              aria-modal="true"
              aria-labelledby="assistant-title"
              onKeyDown={handlePanelKeyDown}
              initial={{ opacity: 0, y: reduceMotion ? 0 : 12, scale: reduceMotion ? 1 : 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: reduceMotion ? 0 : 8, scale: reduceMotion ? 1 : 0.985 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: [0.22, 1, 0.36, 1] }}
            >
              <header className="assistant-header">
                <span className="assistant-avatar"><Bot size={18} aria-hidden="true" /></span>
                <div className="assistant-heading">
                  <strong id="assistant-title">AI Assistant</strong>
                  <span>Projects · Web · Maps</span>
                </div>
                {messages.length > 0 && (
                  <button type="button" className="assistant-close" aria-label="Start a new chat" title="New chat" onClick={newChat}>
                    <RotateCcw size={16} aria-hidden="true" />
                  </button>
                )}
                <button type="button" className="assistant-close" aria-label="Close AI Assistant" onClick={close}>
                  <X size={18} aria-hidden="true" />
                </button>
              </header>

              {viewingProject && (
                <div className="assistant-context-chip" title={viewingProject.name}>
                  <MapPin size={12} aria-hidden="true" />
                  <span>Viewing: <strong>{viewingProject.name}</strong></span>
                </div>
              )}

              <div className="assistant-messages" ref={messagesRef} role="log" aria-live="polite" aria-relevant="additions">
                <div className="assistant-welcome">
                  <span className="assistant-welcome-icon"><Sparkles size={16} aria-hidden="true" /></span>
                  <p>Ask me anything, in any language.</p>
                  <span>I analyze the dashboard’s project data, search the web and find places on the map — with sources for every answer.</span>
                </div>
                {messages.map((message, index) => (
                  <article
                    className={`assistant-message assistant-message-${message.role}${message.isError ? " assistant-message-error" : ""}`}
                    key={message.id}
                    aria-busy={message.pending || undefined}
                    // Streaming fragments are not announced; the finished answer is announced once below.
                    aria-live={message.role === "assistant" && !message.isError ? "off" : undefined}
                  >
                    {message.role === "user" ? (
                      <div className="assistant-message-text"><p dir="auto">{message.content}</p></div>
                    ) : (
                      <>
                        {message.pending && message.steps && message.steps.length > 0 && <StepList steps={message.steps} />}
                        {message.pending && !message.content && (
                          <div className="assistant-typing" role="status">
                            <LoaderCircle size={14} aria-hidden="true" />
                            <span>{message.steps?.length ? "Putting the answer together…" : "Thinking…"}</span>
                          </div>
                        )}
                        {message.content && <AssistantMarkdown content={message.content} knownUrls={knownUrlsOf(message)} />}
                        {message.stopped && <div className="assistant-stopped">Stopped</div>}
                        {!message.pending && !message.isError && !message.stopped && (
                          <div className="assistant-message-footer">
                            <SourceList message={message} />
                            <div className="assistant-message-actions">
                              <CopyButton text={message.content} />
                              <ShareMenu
                                compact
                                label="Share answer"
                                platforms={["whatsapp", "telegram", "email"]}
                                getPayload={(pageUrl) => assistantSharePayload(
                                  messages.slice(0, index).reverse().find((entry) => entry.role === "user")?.content,
                                  message.content,
                                  new URL("/", pageUrl).toString(),
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                ))}
                {messages.length === 0 && (
                  <div className="assistant-suggestions" aria-label="Suggested questions">
                    <span>Try asking</span>
                    {suggestions.map((suggestion) => (
                      <button key={suggestion} type="button" disabled={isSending} onClick={() => void submitQuestion(suggestion)} dir="auto">
                        {suggestion}<ArrowUp size={13} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="sr-only" role="status" aria-live="polite">{announcement}</div>

              <form className="assistant-composer" onSubmit={handleSubmit}>
                <label className="sr-only" htmlFor="assistant-question">Ask the AI Assistant</label>
                <textarea
                  id="assistant-question"
                  ref={inputRef}
                  rows={1}
                  maxLength={1500}
                  dir="auto"
                  placeholder={viewingProject ? "Ask about this project, its location, or anything…" : "Ask about projects, places, or anything…"}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                {isSending ? (
                  <button key="stop" type="button" className="assistant-send assistant-stop" aria-label="Stop generating" onClick={handleStopClick}>
                    <Square size={14} aria-hidden="true" />
                  </button>
                ) : (
                  <button key="send" type="submit" className="assistant-send" aria-label="Send question" disabled={!draft.trim()}>
                    <ArrowUp size={17} aria-hidden="true" />
                  </button>
                )}
              </form>
              <div className="assistant-footnote">Project figures come from the dashboard’s records. Web and map answers cite their sources.</div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
