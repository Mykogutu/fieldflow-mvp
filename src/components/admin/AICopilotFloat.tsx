"use client";
import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sparkles, X, Send, RotateCcw, ExternalLink,
} from "lucide-react";

type Msg = { role: "user" | "assistant"; content: string };

const STARTERS = [
  "What happened today?",
  "Which jobs are pending OTP?",
  "Any unpaid invoices?",
  "Which jobs were postponed this week?",
];

function Spinner() {
  return (
    <span className="inline-block w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
  );
}

export function AICopilotFloat() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Hide on the full copilot page — it has its own UI
  const hidden = pathname.startsWith("/admin/ai");

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    const next: Msg[] = [...history, { role: "user", content: question }];
    setHistory(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
      });
      const data = await res.json();
      setHistory([
        ...next,
        { role: "assistant", content: data.answer ?? data.error ?? "No response." },
      ]);
    } catch {
      setHistory([
        ...next,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (hidden) return null;

  return (
    <>
      {/* ── Chat panel ── */}
      <div
        className={`fixed z-50 right-4 left-4 sm:left-auto sm:w-[360px] lg:right-6
          bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col
          overflow-hidden transition-all duration-200 ease-out
          bottom-[5.5rem] lg:bottom-[4.5rem]
          ${open
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
          }`}
        style={{ maxHeight: "min(520px, 72dvh)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-gradient-to-r from-blue-600 to-blue-500 rounded-t-2xl">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white leading-tight">AI Copilot</p>
              <p className="text-[10px] text-blue-200 leading-tight">Live business intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {history.length > 0 && (
              <button
                onClick={() => setHistory([])}
                title="Clear chat"
                className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/15 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            <Link
              href="/admin/ai"
              onClick={() => setOpen(false)}
              title="Open full copilot"
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/15 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/15 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {history.length === 0 && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 text-center pt-1">
                Ask anything about your operations.
              </p>
              <div className="space-y-1.5">
                {STARTERS.map((q) => (
                  <button
                    key={q}
                    onClick={() => send(q)}
                    className="w-full text-left text-xs px-3 py-2.5 rounded-xl border border-gray-200 text-slate-600
                      hover:border-blue-300 hover:bg-blue-50/50 hover:text-blue-700 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {history.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
              )}
              <div
                className={`max-w-[82%] rounded-2xl px-3 py-2.5 text-xs leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-blue-600 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-2 justify-start">
              <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center shrink-0 text-white">
                <Sparkles className="w-3 h-3" />
              </div>
              <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-3 py-2.5 text-slate-400 flex items-center gap-2 text-xs">
                <Spinner /> Thinking…
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 shrink-0 bg-white">
          <form
            onSubmit={(e) => { e.preventDefault(); send(input); }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your jobs, workers…"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-700 disabled:opacity-40 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* ── Floating action button ── */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI Copilot" : "Open AI Copilot"}
        className={`fixed z-50 bottom-20 right-4 lg:bottom-6 lg:right-6
          w-13 h-13 w-[52px] h-[52px] rounded-2xl shadow-lg shadow-blue-500/25
          flex items-center justify-center
          transition-all duration-200
          ${open
            ? "bg-slate-800 hover:bg-slate-700 rotate-0 scale-95"
            : "bg-blue-600 hover:bg-blue-700 hover:scale-105 hover:shadow-xl hover:shadow-blue-500/30"
          }`}
      >
        <div className={`transition-all duration-200 ${open ? "rotate-0" : ""}`}>
          {open
            ? <X className="w-5 h-5 text-white" />
            : <Sparkles className="w-5 h-5 text-white" />
          }
        </div>
        {/* Unread pulse when closed */}
        {!open && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
        )}
      </button>
    </>
  );
}
