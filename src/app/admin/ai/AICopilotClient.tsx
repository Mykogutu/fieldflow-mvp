"use client";
import { useState, useRef, useEffect } from "react";
import type { CopilotMessage, FollowUp, DraftJob } from "@/lib/ai-ops";

// ── Tab ───────────────────────────────────────────────────────────────────────
type Tab = "chat" | "briefing" | "followups" | "intake";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "chat", label: "Copilot", icon: "chat" },
  { id: "briefing", label: "Briefing", icon: "sun" },
  { id: "followups", label: "Follow-ups", icon: "bell" },
  { id: "intake", label: "Job Intake", icon: "inbox" },
];

const STARTER_QUESTIONS = [
  "What happened today?",
  "Which jobs are still pending?",
  "Which clients have unpaid invoices?",
  "Which technician has not accepted their jobs?",
  "How much did we invoice this week?",
  "Which jobs were postponed and why?",
  "Which jobs need follow up tomorrow?",
  "Who are our top performing technicians?",
];

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: "bg-red-50 border-red-200 text-red-700",
  MEDIUM: "bg-amber-50 border-amber-200 text-amber-700",
  LOW: "bg-blue-50 border-blue-200 text-blue-700",
};

// ── Icons ─────────────────────────────────────────────────────────────────────
function Icon({ name }: { name: string }) {
  const cls = "w-4 h-4 flex-shrink-0";
  if (name === "chat")
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  if (name === "sun")
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    );
  if (name === "bell")
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    );
  if (name === "inbox")
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      </svg>
    );
  if (name === "send")
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
      </svg>
    );
  if (name === "copy")
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  if (name === "spark")
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
      </svg>
    );
  return null;
}

function Spinner() {
  return (
    <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {history.length === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 text-center py-4">
              Ask anything about your operations, jobs, clients, or workers.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  className="text-left text-xs px-3 py-2.5 rounded-lg border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {history.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name="spark" />
                {/* override icon color */}
                <style>{`.copilot-icon { color: white }`}</style>
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-gray-100 text-gray-800 rounded-bl-sm"
              }`}
            >
              {msg.content}
              {msg.role === "assistant" && (
                <button
                  onClick={() => navigator.clipboard.writeText(msg.content)}
                  className="ml-2 opacity-40 hover:opacity-80 inline-flex items-center"
                  title="Copy"
                >
                  <Icon name="copy" />
                </button>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0 text-white">
              <Icon name="spark" />
            </div>
            <div className="bg-gray-100 rounded-xl rounded-bl-sm px-4 py-3 text-gray-400 flex items-center gap-2">
              <Spinner /> Thinking…
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 p-3">
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about your operations…"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-1.5 text-sm font-medium"
          >
            <Icon name="send" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
        {history.length > 0 && (
          <button
            onClick={() => setHistory([])}
            className="text-xs text-gray-400 hover:text-gray-600 mt-2 ml-1"
          >
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
  const [copied, setCopied] = useState(false);

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

  function copy() {
    navigator.clipboard.writeText(briefing);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(["morning", "evening"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setType(t); setBriefing(""); }}
              className={`px-4 py-2 text-sm font-medium transition-colors capitalize ${
                type === t
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {t === "morning" ? "☀️ Morning" : "🌙 Evening"}
            </button>
          ))}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Spinner /> : <Icon name="spark" />}
          {loading ? "Generating…" : "Generate Briefing"}
        </button>
      </div>

      {briefing && (
        <div className="relative bg-gray-50 rounded-xl border border-gray-200 p-5">
          <button
            onClick={copy}
            className="absolute top-3 right-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 bg-white border border-gray-200 rounded-md px-2 py-1"
          >
            <Icon name="copy" />
            {copied ? "Copied!" : "Copy"}
          </button>
          <pre className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed font-sans pr-16">
            {briefing}
          </pre>
        </div>
      )}

      {!briefing && !loading && (
        <p className="text-sm text-gray-400 text-center py-8">
          Generate a {type} briefing from your live business data.
        </p>
      )}
    </div>
  );
}

// ── Follow-ups tab ────────────────────────────────────────────────────────────
function FollowUpsTab() {
  const [followups, setFollowups] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

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

  function copy(text: string, idx: number) {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          AI identifies clients, jobs, and workers that need your attention today.
        </p>
        <button
          onClick={generate}
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 whitespace-nowrap"
        >
          {loading ? <Spinner /> : <Icon name="spark" />}
          {loading ? "Analysing…" : "Find Follow-ups"}
        </button>
      </div>

      {followups.length > 0 && (
        <div className="space-y-3">
          {followups.map((f, i) => (
            <div
              key={i}
              className={`border rounded-xl p-4 space-y-2 ${PRIORITY_COLORS[f.priority] ?? "bg-gray-50 border-gray-200"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wide opacity-70">
                    {f.type.replace(/_/g, " ")}
                    {f.clientName && ` · ${f.clientName}`}
                  </span>
                  <p className="text-sm font-medium mt-0.5">{f.description}</p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">
                  {f.priority}
                </span>
              </div>
              {f.whatsappDraft && (
                <div className="bg-white/60 rounded-lg p-3 flex items-start justify-between gap-3">
                  <p className="text-xs text-gray-700 leading-relaxed flex-1">
                    {f.whatsappDraft}
                  </p>
                  <button
                    onClick={() => copy(f.whatsappDraft, i)}
                    className="text-xs flex items-center gap-1 text-gray-500 hover:text-gray-900 whitespace-nowrap flex-shrink-0"
                  >
                    <Icon name="copy" />
                    {copiedIdx === i ? "Copied!" : "Copy"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && followups.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">
          Click &ldquo;Find Follow-ups&rdquo; to analyse your jobs and invoices.
        </p>
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

  const confColor =
    !draft ? ""
    : draft.confidence >= 0.8 ? "text-green-600"
    : draft.confidence >= 0.5 ? "text-amber-600"
    : "text-red-600";

  return (
    <div className="flex-1 overflow-y-auto p-5 space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">
          Paste the client&apos;s WhatsApp message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          placeholder={"e.g. My 5000L tank is leaking at our office in Syokimau. When can someone come?"}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <button
          onClick={parse}
          disabled={!message.trim() || loading}
          className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Spinner /> : <Icon name="spark" />}
          {loading ? "Parsing…" : "Parse into Draft Job"}
        </button>
      </div>

      {draft && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Draft Job</h3>
            <span className={`text-xs font-medium ${confColor}`}>
              {Math.round((draft.confidence ?? 0) * 100)}% confidence
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Job Type", value: draft.jobType },
              { label: "Location", value: draft.location },
              { label: "Client Name", value: draft.clientName },
              { label: "Client Phone", value: draft.clientPhone },
              { label: "Asset / Equipment", value: draft.assetDescription },
              { label: "Notes", value: draft.notes },
            ].map(({ label, value }) =>
              value ? (
                <div key={label}>
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-sm text-gray-800 mt-0.5">{value}</p>
                </div>
              ) : null
            )}
          </div>

          {draft.missingFields.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <p className="text-xs font-semibold text-amber-700 mb-1.5">Missing information needed:</p>
              <ul className="space-y-1">
                {draft.missingFields.map((f) => (
                  <li key={f} className="text-xs text-amber-700 flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-amber-500 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <a
            href="/admin/jobs"
            className="block text-center bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700"
          >
            Open Jobs → Create with this info
          </a>
        </div>
      )}

      {!draft && !loading && (
        <p className="text-sm text-gray-400 text-center py-4">
          AI will extract job type, location, client details, and flag missing fields.
        </p>
      )}
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function AICopilotClient() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header row */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0">
          <Icon name="spark" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Operations Intelligence</h1>
          <p className="text-xs text-gray-500 mt-0.5">AI assistant powered by your live business data</p>
        </div>
      </div>

      {/* Card fills remaining height */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Tab bar — icon+label on sm+, icon-only on mobile */}
        <div className="flex border-b border-gray-100 shrink-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              title={t.label}
              className={`flex items-center justify-center gap-2 flex-1 sm:flex-none px-3 sm:px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === t.id
                  ? "border-blue-600 text-blue-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon name={t.icon} />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tab body fills card */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">
          {activeTab === "chat" && <ChatTab />}
          {activeTab === "briefing" && <BriefingTab />}
          {activeTab === "followups" && <FollowUpsTab />}
          {activeTab === "intake" && <IntakeTab />}
        </div>
      </div>
    </div>
  );
}
