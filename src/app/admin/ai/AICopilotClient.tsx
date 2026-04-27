"use client";
import { useState, useRef, useEffect } from "react";
import {
  Sparkles, Sun, Moon, Bell, Inbox, Send, Copy, Check,
  MessageSquare, RefreshCw, ArrowRight, AlertTriangle,
  Info, Zap,
} from "lucide-react";
import type { CopilotMessage, FollowUp, DraftJob } from "@/lib/ai-ops";

// ── Types ─────────────────────────────────────────────────────────────────────
type Tab = "chat" | "briefing" | "followups" | "intake";

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "chat",      label: "Copilot",     Icon: MessageSquare },
  { id: "briefing",  label: "Briefing",    Icon: Sun           },
  { id: "followups", label: "Follow-ups",  Icon: Bell          },
  { id: "intake",    label: "Job Intake",  Icon: Inbox         },
];

const STARTER_QUESTIONS = [
  "What happened today?",
  "Which jobs are still pending?",
  "Which clients have unpaid invoices?",
  "Who hasn't accepted their jobs yet?",
  "How much did we invoice this week?",
  "Which jobs were postponed and why?",
  "Which jobs need follow up tomorrow?",
  "Who are our top performing technicians?",
];

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const cls = size === "sm" ? "w-3.5 h-3.5" : "w-5 h-5";
  return (
    <span className={`inline-block ${cls} border-2 border-current border-t-transparent rounded-full animate-spin`} />
  );
}

// ── CopyButton ────────────────────────────────────────────────────────────────
function CopyButton({ text, className = "" }: { text: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  return (
    <button onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-[11px] font-medium transition-colors ${className}`}
      title="Copy">
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ── Chat tab ──────────────────────────────────────────────────────────────────
function ChatTab() {
  const [history, setHistory] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history, loading]);

  async function send(question: string) {
    if (!question.trim() || loading) return;
    const next: CopilotMessage[] = [...history, { role: "user", content: question }];
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
      setHistory([...next, { role: "assistant", content: data.answer ?? data.error ?? "No response" }]);
    } catch {
      setHistory([...next, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
        {history.length === 0 && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-semibold text-[#334155]">Ask anything about your operations</p>
              <p className="text-xs text-[#94A3B8] mt-1">Jobs, clients, workers, invoices — all at once.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTER_QUESTIONS.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-left text-xs px-3 py-2.5 rounded-[10px] border border-[#E2E8F0] text-[#475569]
                    hover:border-[#2563EB]/40 hover:text-[#2563EB] hover:bg-blue-50/50 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div className={`max-w-[82%] rounded-[14px] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap
              ${msg.role === "user"
                ? "bg-[#2563EB] text-white rounded-br-[4px]"
                : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] rounded-bl-[4px]"
              }`}>
              {msg.content}
              {msg.role === "assistant" && (
                <div className="mt-2 pt-2 border-t border-[#E2E8F0]">
                  <CopyButton text={msg.content} className="text-[#94A3B8] hover:text-[#64748B]" />
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-[8px] bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center shrink-0 text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] rounded-bl-[4px] px-4 py-3 text-[#94A3B8] flex items-center gap-2 text-sm">
              <Spinner /> Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[#E2E8F0] p-4">
        <form onSubmit={e => { e.preventDefault(); send(input); }} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask about jobs, clients, workers, revenue…"
            className="ff-input flex-1 text-sm"
          />
          <button type="submit" disabled={!input.trim() || loading}
            className="ff-btn-primary px-3 py-2 text-sm disabled:opacity-40 flex items-center gap-1.5 shrink-0">
            {loading ? <Spinner /> : <Send className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        {history.length > 0 && (
          <button onClick={() => setHistory([])}
            className="text-[11px] text-[#94A3B8] hover:text-[#64748B] mt-2 ml-1 transition-colors">
            Clear conversation
          </button>
        )}
      </div>
    </div>
  );
}

// ── Briefing tab ──────────────────────────────────────────────────────────────
function BriefingTab() {
  const [type, setType] = useState<"morning" | "evening">("morning");
  const [briefing, setBriefing] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setBriefing("");
    try {
      const res = await fetch(`/api/ai/briefing?type=${type}`);
      const data = await res.json();
      setBriefing(data.briefing ?? data.error ?? "");
    } catch {
      setBriefing("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Controls */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Toggle */}
        <div className="flex rounded-[10px] border border-[#E2E8F0] overflow-hidden shrink-0">
          {(["morning", "evening"] as const).map(t => (
            <button key={t} onClick={() => { setType(t); setBriefing(""); }}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors capitalize
                ${type === t
                  ? "bg-[#2563EB] text-white"
                  : "bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                }`}>
              {t === "morning" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              {t === "morning" ? "Morning" : "Evening"}
            </button>
          ))}
        </div>

        <button onClick={generate} disabled={loading}
          className="ff-btn-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50">
          {loading ? <Spinner /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Generating…" : "Generate Briefing"}
        </button>
      </div>

      {/* Output */}
      {briefing ? (
        <div className="relative bg-[#F8FAFC] rounded-[14px] border border-[#E2E8F0] p-5">
          <div className="absolute top-3.5 right-3.5">
            <CopyButton text={briefing}
              className="text-[#94A3B8] hover:text-[#64748B] bg-white border border-[#E2E8F0] rounded-[8px] px-2.5 py-1.5" />
          </div>
          <pre className="text-sm text-[#334155] whitespace-pre-wrap leading-relaxed font-sans pr-20">
            {briefing}
          </pre>
        </div>
      ) : !loading ? (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
            {type === "morning" ? <Sun className="w-6 h-6 text-amber-500" /> : <Moon className="w-6 h-6 text-indigo-500" />}
          </div>
          <p className="text-sm text-[#475569] font-medium">Generate a {type} briefing</p>
          <p className="text-xs text-[#94A3B8] mt-1">Pulled from your live business data right now.</p>
        </div>
      ) : null}
    </div>
  );
}

// ── Follow-ups tab ────────────────────────────────────────────────────────────
function FollowUpsTab() {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setLoading(true);
    setFollowups([]);
    try {
      const res = await fetch("/api/ai/followups");
      const data = await res.json();
      setFollowups(data.followups ?? []);
    } catch {
      setFollowups([]);
    } finally {
      setLoading(false);
    }
  }

  const priorityConfig: Record<string, { border: string; bg: string; text: string; dot: string }> = {
    HIGH:   { border: "border-red-200",   bg: "bg-red-50",   text: "text-[#DC2626]", dot: "bg-[#DC2626]"  },
    MEDIUM: { border: "border-amber-200", bg: "bg-amber-50", text: "text-[#D97706]", dot: "bg-[#D97706]"  },
    LOW:    { border: "border-blue-200",  bg: "bg-blue-50",  text: "text-[#2563EB]", dot: "bg-[#2563EB]"  },
  };

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-sm text-[#64748B] max-w-sm">
          AI identifies clients, jobs, and workers that need your attention today.
        </p>
        <button onClick={generate} disabled={loading}
          className="ff-btn-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50 whitespace-nowrap shrink-0">
          {loading ? <Spinner /> : <Sparkles className="w-3.5 h-3.5" />}
          {loading ? "Analysing…" : "Find Follow-ups"}
        </button>
      </div>

      {/* Cards */}
      {followups.length > 0 && (
        <div className="space-y-3">
          {followups.map((f, i) => {
            const cfg = priorityConfig[f.priority] ?? { border: "border-[#E2E8F0]", bg: "bg-[#F8FAFC]", text: "text-[#64748B]", dot: "bg-[#94A3B8]" };
            return (
              <div key={i} className={`rounded-[14px] border p-4 space-y-3 ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 mt-1.5 ${cfg.dot}`} />
                    <div className="min-w-0">
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text} opacity-70`}>
                        {f.type.replace(/_/g, " ")}
                        {f.clientName && <span className="normal-case"> · {f.clientName}</span>}
                      </p>
                      <p className="text-sm font-semibold text-[#0F172A] mt-0.5 leading-snug">{f.description}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider shrink-0 ${cfg.text}`}>
                    {f.priority}
                  </span>
                </div>

                {f.whatsappDraft && (
                  <div className="bg-white/70 rounded-[10px] border border-white p-3 flex items-start justify-between gap-3">
                    <p className="text-xs text-[#334155] leading-relaxed flex-1">{f.whatsappDraft}</p>
                    <CopyButton text={f.whatsappDraft}
                      className="text-[#94A3B8] hover:text-[#64748B] shrink-0" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && followups.length === 0 && (
        <div className="text-center py-12">
          <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
            <Bell className="w-6 h-6 text-[#94A3B8]" />
          </div>
          <p className="text-sm text-[#475569] font-medium">No follow-ups yet</p>
          <p className="text-xs text-[#94A3B8] mt-1">Click &ldquo;Find Follow-ups&rdquo; to analyse your jobs and invoices.</p>
        </div>
      )}
    </div>
  );
}

// ── Intake tab ────────────────────────────────────────────────────────────────
function IntakeTab() {
  const [message, setMessage] = useState("");
  const [draft, setDraft] = useState<DraftJob | null>(null);
  const [loading, setLoading] = useState(false);

  async function parse() {
    if (!message.trim()) return;
    setLoading(true);
    setDraft(null);
    try {
      const res = await fetch("/api/ai/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();
      setDraft(data.draft ?? null);
    } catch {
      setDraft({ missingFields: ["Connection error"], confidence: 0 });
    } finally {
      setLoading(false);
    }
  }

  const confColor = !draft ? ""
    : draft.confidence >= 0.8 ? "text-[#16A34A]"
    : draft.confidence >= 0.5 ? "text-[#D97706]"
    : "text-[#DC2626]";

  const confBg = !draft ? ""
    : draft.confidence >= 0.8 ? "bg-green-50 border-green-200"
    : draft.confidence >= 0.5 ? "bg-amber-50 border-amber-200"
    : "bg-red-50 border-red-200";

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-5">
      {/* Input */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold text-[#475569]">
          Paste the client&apos;s WhatsApp message
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          rows={4}
          placeholder="e.g. My 5000L tank is leaking at our office in Syokimau. When can someone come?"
          className="ff-input text-sm resize-none"
        />
        <button onClick={parse} disabled={!message.trim() || loading}
          className="ff-btn-primary flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50">
          {loading ? <Spinner /> : <Zap className="w-3.5 h-3.5" />}
          {loading ? "Parsing…" : "Parse into Draft Job"}
        </button>
      </div>

      {/* Draft output */}
      {draft && (
        <div className="bg-[#F8FAFC] rounded-[14px] border border-[#E2E8F0] overflow-hidden">
          {/* Draft header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#E2E8F0]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              <span className="text-sm font-semibold text-[#0F172A]">Draft Job</span>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${confBg} ${confColor}`}>
              {Math.round((draft.confidence ?? 0) * 100)}% confidence
            </span>
          </div>

          {/* Fields grid */}
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Job Type",          value: draft.jobType },
              { label: "Location",          value: draft.location },
              { label: "Client Name",       value: draft.clientName },
              { label: "Client Phone",      value: draft.clientPhone },
              { label: "Asset / Equipment", value: draft.assetDescription },
              { label: "Notes",             value: draft.notes },
            ].filter(({ value }) => !!value).map(({ label, value }) => (
              <div key={label} className="bg-white rounded-[10px] border border-[#E2E8F0] p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{label}</p>
                <p className="text-sm text-[#0F172A] mt-0.5 font-medium">{value}</p>
              </div>
            ))}
          </div>

          {/* Missing fields */}
          {draft.missingFields && draft.missingFields.length > 0 && (
            <div className="mx-4 mb-4 bg-amber-50 border border-amber-200 rounded-[10px] p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <p className="text-xs font-semibold text-amber-700">Missing information needed:</p>
              </div>
              <ul className="space-y-1">
                {draft.missingFields.map(f => (
                  <li key={f} className="text-xs text-amber-700 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <div className="px-4 pb-4">
            <a href="/admin/jobs"
              className="flex items-center justify-center gap-2 w-full ff-btn-primary text-sm py-2.5">
              Open Jobs — Create with this info <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}

      {!draft && !loading && (
        <div className="text-center py-10">
          <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6 text-[#94A3B8]" />
          </div>
          <p className="text-sm text-[#475569] font-medium">Paste a client message above</p>
          <p className="text-xs text-[#94A3B8] mt-1">AI will extract job type, location, client details, and flag missing fields.</p>
        </div>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AICopilotClient() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  return (
    <div className="flex flex-col gap-5 h-full max-w-3xl">
      {/* Page header */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="ff-page-title">Operations Intelligence</h1>
          <p className="ff-page-desc">AI assistant powered by your live business data</p>
        </div>
      </div>

      {/* Card */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden flex flex-col flex-1 min-h-0" style={{ minHeight: "560px" }}>
        {/* Tab bar */}
        <div className="border-b border-[#E2E8F0] px-4 shrink-0">
          <div className="flex gap-0">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`ff-tab ${activeTab === tab.id ? "ff-tab-active" : "ff-tab-inactive"}`}>
                <tab.Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {activeTab === "chat"      && <ChatTab />}
          {activeTab === "briefing"  && <BriefingTab />}
          {activeTab === "followups" && <FollowUpsTab />}
          {activeTab === "intake"    && <IntakeTab />}
        </div>
      </div>
    </div>
  );
}
