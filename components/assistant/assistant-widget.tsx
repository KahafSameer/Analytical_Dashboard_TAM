"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowUp, Bot, LoaderCircle, Sparkles, X } from "lucide-react";
import type { AssistantSource } from "@/lib/assistant-context";

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
  isError?: boolean;
};

class AssistantRequestError extends Error {}

const suggestions = [
  "Overall progress?",
  "Sites below 50%",
  "Top performing sites",
  "Sites needing attention",
];

function MessageText({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  return (
    <div className="assistant-message-text">
      {lines.map((line, index) => {
        const isBullet = /^\s*[-*]\s+/.test(line);
        const text = isBullet ? line.replace(/^\s*[-*]\s+/, "") : line;
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        const formatted = parts.map((part, partIndex) => part.startsWith("**") && part.endsWith("**")
          ? <strong key={partIndex}>{part.slice(2, -2)}</strong>
          : part);
        if (!line.trim()) return <span className="assistant-line-break" key={index} />;
        return isBullet
          ? <div className="assistant-bullet" key={index}><span aria-hidden="true">•</span><span>{formatted}</span></div>
          : <p key={index}>{formatted}</p>;
      })}
    </div>
  );
}

export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const reduceMotion = useReducedMotion();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const messageId = useRef(0);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    const element = messagesRef.current;
    if (element) element.scrollTop = element.scrollHeight;
  }, [messages, isSending]);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => buttonRef.current?.focus());
  }, []);

  const submitQuestion = useCallback(async (question: string) => {
    const message = question.trim();
    if (!message || isSending) return;
    setDraft("");
    const history = messages
      .filter((item) => !item.isError)
      .slice(-6)
      .map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, {
      id: ++messageId.current,
      role: "user",
      content: message,
    }]);
    setIsSending(true);

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 65_000);
    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history }),
        signal: controller.signal,
      });
      const result = await response.json() as {
        answer?: string;
        sources?: AssistantSource[];
        error?: string;
      };
      if (!response.ok || typeof result.answer !== "string") {
        throw new AssistantRequestError(result.error ?? "Sorry, I couldn’t analyze the dashboard data right now. Please try again.");
      }
      setMessages((current) => [...current, {
        id: ++messageId.current,
        role: "assistant",
        content: result.answer!,
        sources: Array.isArray(result.sources) ? result.sources.slice(0, 8) : [],
      }]);
    } catch (requestError) {
      const message = requestError instanceof AssistantRequestError
        ? requestError.message
        : "Sorry, I couldn’t analyze the dashboard data right now. Please try again.";
      setMessages((current) => [...current, {
        id: ++messageId.current,
        role: "assistant",
        content: message,
        isError: true,
      }]);
    } finally {
      window.clearTimeout(timeout);
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [isSending, messages]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(draft);
  }

  function handlePanelKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = event.currentTarget.querySelectorAll<HTMLElement>(
      'button:not([disabled]), textarea:not([disabled])',
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
            whileTap={reduceMotion ? undefined : { scale: 0.97 }}
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
                  <span>Ask about dashboard data</span>
                </div>
                <button type="button" className="assistant-close" aria-label="Close AI Assistant" onClick={close}>
                  <X size={18} aria-hidden="true" />
                </button>
              </header>

              <div className="assistant-messages" ref={messagesRef} role="log" aria-live="polite" aria-relevant="additions">
                <div className="assistant-welcome">
                  <span className="assistant-welcome-icon"><Sparkles size={16} aria-hidden="true" /></span>
                  <p>Ask me anything about the project data.</p>
                  <span>I can filter, compare, summarize, and analyze the fields in the connected sheet.</span>
                </div>
                {messages.map((message) => (
                  <article className={`assistant-message assistant-message-${message.role}${message.isError ? " assistant-message-error" : ""}`} key={message.id}>
                    <MessageText content={message.content} />
                    {message.isError && <span className="sr-only" role="status">{message.content}</span>}
                    {message.role === "assistant" && !message.isError && (
                      <div className="assistant-source">
                        <span className="assistant-source-mark" aria-hidden="true" />
                        {message.sources?.length
                          ? message.sources.length === 1
                            ? `${message.sources[0].site} · ${message.sources[0].field}: ${message.sources[0].value}`
                            : `${message.sources.slice(0, 2).map((source) => `${source.site} · ${source.value}`).join("  |  ")}${message.sources.length > 2 ? `  +${message.sources.length - 2} more` : ""}`
                          : "Based on dashboard data"}
                      </div>
                    )}
                  </article>
                ))}
                {messages.length === 0 && (
                  <div className="assistant-suggestions" aria-label="Suggested questions">
                    <span>Try asking</span>
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        disabled={isSending}
                        onClick={() => void submitQuestion(suggestion)}
                      >
                        {suggestion}<ArrowUp size={13} aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                )}
                {isSending && (
                  <div className="assistant-typing" role="status">
                    <LoaderCircle size={14} aria-hidden="true" />
                    <span>Analyzing dashboard data…</span>
                  </div>
                )}
              </div>

              <form className="assistant-composer" onSubmit={handleSubmit}>
                <label className="sr-only" htmlFor="assistant-question">Ask about dashboard data</label>
                <textarea
                  id="assistant-question"
                  ref={inputRef}
                  rows={1}
                  maxLength={1500}
                  placeholder="Ask about sites or progress…"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      event.currentTarget.form?.requestSubmit();
                    }
                  }}
                  disabled={isSending}
                />
                <button type="submit" className="assistant-send" aria-label="Send question" disabled={!draft.trim() || isSending}>
                  <ArrowUp size={17} aria-hidden="true" />
                </button>
              </form>
              <div className="assistant-footnote">Answers use the connected dataset; unavailable fields are identified clearly.</div>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
