"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Sparkles, Send, ChevronDown, TrendingUp, AlertCircle, Info,
  FileText, BarChart2, Users, Shield, Wrench, ArrowRight,
  Clock, ExternalLink, BookOpen, MessageSquare, Lightbulb, HelpCircle,
  RefreshCw, X, RotateCcw,
} from "lucide-react";

// ── Icon map ──────────────────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ElementType> = {
  TrendingUp, AlertCircle, BarChart2, Clock, FileText, Users,
  Wrench, RefreshCw, Lightbulb, Sparkles,
};
function resolveIcon(name: string): React.ElementType {
  return ICON_MAP[name] ?? Info;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type Msg = { role: "user" | "assistant"; content: string };

interface InsightRaw {
  id: string; icon: string; iconBg: string; iconColor: string;
  text: string; sub: string; badge: string; badgeBg: string; badgeText: string;
}
interface Insight extends Omit<InsightRaw, "icon"> { icon: React.ElementType }

interface SuggestionRaw {
  id: string; icon: string; iconBg: string; iconColor: string;
  title: string; sub: string; href: string;
}
interface Suggestion extends Omit<SuggestionRaw, "icon"> { icon: React.ElementType }

interface RecentPrompt { text: string; time: string }

// ── Static content ─────────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  "Summarize this month",
  "Show unpaid invoices",
  "Jobs due this week",
  "Revenue comparison",
];

const TRY_QUESTIONS = [
  { icon: TrendingUp,    color: "text-[#2563EB]", bg: "bg-[#EFF6FF]",   text: "What is my revenue trend for the last 6 months?" },
  { icon: AlertCircle,   color: "text-[#DC2626]", bg: "bg-[#FFF1F2]",    text: "Which jobs are delayed and why?" },
  { icon: Users,         color: "text-[#16A34A]", bg: "bg-[#F0FDF4]",  text: "Show me top performing workers this month" },
  { icon: Wrench,        color: "text-[#7C3AED]", bg: "bg-[#F5F3FF]", text: "What assets need maintenance soon?" },
  { icon: FileText,      color: "text-[#D97706]", bg: "bg-[#FFFBEB]",  text: "Summarize expenses by category" },
  { icon: BarChart2,     color: "text-[#4F46E5]",bg: "bg-[#EEF2FF]", text: "Forecast revenue for next month" },
  { icon: Lightbulb,     color: "text-[#D97706]", bg: "bg-[#FFFBEB]",  text: "Identify cost savings opportunities" },
  { icon: MessageSquare, color: "text-[#2563EB]", bg: "bg-[#EFF6FF]",   text: "Give me a business performance overview" },
];

const QUICK_ACTIONS = [
  { icon: FileText,    bg: "bg-[#EFF6FF]",   color: "text-[#2563EB]", title: "Create a job report",         sub: "Generate a detailed job report",    href: "/admin/jobs"                  },
  { icon: AlertCircle, bg: "bg-[#FFFBEB]",  color: "text-[#D97706]", title: "Analyze pending invoices",    sub: "Get insights on unpaid invoices",   href: "/admin/invoices?status=PENDING"},
  { icon: TrendingUp,  bg: "bg-[#F0FDF4]",  color: "text-[#16A34A]", title: "Forecast this month revenue", sub: "AI prediction based on trends",     href: "/admin/ai"                    },
  { icon: Users,       bg: "bg-[#F5F3FF]", color: "text-[#7C3AED]", title: "Optimize worker allocation",  sub: "Suggest better workforce planning",  href: "/admin/workers"               },
  { icon: Shield,      bg: "bg-[#EEF2FF]", color: "text-[#4F46E5]",title: "Check asset health",          sub: "Get AI insights on your assets",    href: "/admin/assets"                },
];

const RESOURCES = [
  { icon: BookOpen, title: "How to use AI Copilot", sub: "Learn the basics", href: "/help" },
  { icon: MessageSquare, title: "Prompt examples", sub: "See example questions", href: "/admin/ai" },
  { icon: HelpCircle, title: "Give feedback", sub: "Help us improve AI Copilot", href: "/admin/settings" },
  { icon: Sparkles, title: "AI Copilot roadmap", sub: "See what's coming next", href: "/help" },
];

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner({ size = "sm" }: { size?: "sm" | "md" }) {
  const cls = size === "md" ? "w-4 h-4" : "w-3.5 h-3.5";
  return <span className={`inline-block ${cls} border-2 border-current border-t-transparent rounded-full animate-spin`} />;
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AICopilotClient({ userName = "Admin" }: { userName?: string }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<Msg[]>([]);
  const [chatActive, setChatActive] = useState(false);

  const [insights, setInsights] = useState<Insight[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(true);
  const [recentPrompts, setRecentPrompts] = useState<RecentPrompt[]>([]);
  const [showMoreChips, setShowMoreChips] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatThreadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadInsights();
    try {
      const stored = localStorage.getItem("ff_recent_prompts");
      if (stored) setRecentPrompts(JSON.parse(stored));
    } catch {}
  }, []);

  useEffect(() => {
    const thread = chatThreadRef.current;
    if (!thread) return;
    thread.scrollTo({
      top: thread.scrollHeight,
      behavior: "smooth",
    });
  }, [chatHistory, loading]);

  async function loadInsights() {
    setInsightsLoading(true);
    try {
      const res = await fetch("/api/ai/insights");
      const data = await res.json();
      if (data.insights)    setInsights(data.insights.map((i: InsightRaw) => ({ ...i, icon: resolveIcon(i.icon) })));
      if (data.suggestions) setSuggestions(data.suggestions.map((s: SuggestionRaw) => ({ ...s, icon: resolveIcon(s.icon) })));
    } catch {
      setInsights(FALLBACK_INSIGHTS);
      setSuggestions(FALLBACK_SUGGESTIONS);
    } finally {
      setInsightsLoading(false);
    }
  }

  function savePrompt(text: string) {
    const timeStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const entry: RecentPrompt = { text, time: `Today, ${timeStr}` };
    const updated = [entry, ...recentPrompts].slice(0, 6);
    setRecentPrompts(updated);
    try { localStorage.setItem("ff_recent_prompts", JSON.stringify(updated)); } catch {}
  }

  async function handleSend(question?: string) {
    const q = (question ?? input).trim();
    if (!q || loading) return;
    setInput("");
    setLoading(true);
    setChatActive(true);
    savePrompt(q);

    const next: Msg[] = [...chatHistory, { role: "user", content: q }];
    setChatHistory(next);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q, history: chatHistory }),
      });
      const data = await res.json();
      setChatHistory([
        ...next,
        { role: "assistant", content: data.answer ?? data.error ?? "No response." },
      ]);
    } catch {
      setChatHistory([
        ...next,
        { role: "assistant", content: "Connection error. Please try again." },
      ]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }

  function clearChat() {
    setChatHistory([]);
    setChatActive(false);
    setInput("");
    setTimeout(() => inputRef.current?.focus(), 80);
  }

  return (
    <div className="flex gap-5 items-start">
      {/* ── Main content ─────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* Hero card */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-6 space-y-5">
          {/* Greeting / chat header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-[14px] bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center shrink-0">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                {chatActive ? (
                  <>
                    <h1 className="text-xl font-bold text-[#0F172A] leading-tight">AI Copilot</h1>
                    <p className="text-sm text-[#94A3B8] mt-0.5">{chatHistory.length} message{chatHistory.length !== 1 ? "s" : ""} in this conversation</p>
                  </>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold text-[#0F172A] leading-tight">Hello {userName},</h1>
                    <p className="text-2xl font-bold text-[#334155] leading-tight">How can I help you today?</p>
                    <p className="text-sm text-[#94A3B8] mt-1">Ask me anything about your business, data, or tasks.</p>
                  </>
                )}
              </div>
            </div>
            {chatActive && (
              <button onClick={clearChat}
                title="New conversation"
                className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155] transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> New chat
              </button>
            )}
          </div>

          {/* Chat message thread */}
          {chatActive && (
            <div
              ref={chatThreadRef}
              className="space-y-3 max-h-[380px] overflow-y-auto pr-1"
            >
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
                    ${msg.role === "user"
                      ? "bg-[#2563EB] text-white rounded-br-sm"
                      : "bg-[#F8FAFC] border border-[#E2E8F0] text-[#334155] rounded-bl-sm"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5 justify-start">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#2563EB] to-[#7C3AED] flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl rounded-bl-sm px-4 py-2.5 text-[#94A3B8] flex items-center gap-2 text-sm">
                    <Spinner /> Thinking…
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input bar */}
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder={chatActive ? "Ask a follow-up question…" : "Ask a question or give a command…"}
              className="flex-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] px-4 py-3 text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB] transition-colors"
            />
            {input && (
              <button onClick={() => setInput("")}
                className="w-11 h-11 rounded-[12px] bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#94A3B8] flex items-center justify-center transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-11 h-11 rounded-[12px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center transition-colors disabled:opacity-40 shrink-0">
              {loading ? <Spinner /> : <Send className="w-4 h-4" />}
            </button>
          </div>

          {/* Quick chips — hide when chat is active with messages */}
          {!chatActive && (
            <div className="flex items-center gap-2 flex-wrap">
              {QUICK_CHIPS.map(chip => (
                <button key={chip} onClick={() => handleSend(chip)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-[#E2E8F0] text-[#475569]
                    hover:border-[#2563EB]/40 hover:text-[#2563EB] hover:bg-[#EFF6FF]/50 transition-colors bg-white">
                  {chip}
                </button>
              ))}
              <button onClick={() => setShowMoreChips(v => !v)}
                className="text-xs font-medium px-3 py-1.5 rounded-full border border-[#E2E8F0] text-[#94A3B8] hover:text-[#475569] hover:border-[#CBD5E1] transition-colors bg-white flex items-center gap-1">
                More <ChevronDown className={`w-3 h-3 transition-transform ${showMoreChips ? "rotate-180" : ""}`} />
              </button>
            </div>
          )}
          {showMoreChips && !chatActive && (
            <div className="flex gap-2 flex-wrap -mt-2">
              {TRY_QUESTIONS.slice(0, 4).map(q => (
                <button key={q.text} onClick={() => handleSend(q.text)}
                  className="text-xs font-medium px-3 py-1.5 rounded-full border border-[#E2E8F0] text-[#475569] hover:border-[#2563EB]/40 hover:text-[#2563EB] hover:bg-[#EFF6FF]/50 transition-colors bg-white">
                  {q.text}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* AI Insights + Smart Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* AI Insights */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2563EB]" />
                <h2 className="text-sm font-bold text-[#0F172A]">AI Insights</h2>
              </div>
              <button onClick={loadInsights} disabled={insightsLoading}
                className="p-1.5 rounded-[8px] hover:bg-[#F8FAFC] text-[#94A3B8] hover:text-[#64748B] transition-colors">
                <RefreshCw className={`w-3.5 h-3.5 ${insightsLoading ? "animate-spin" : ""}`} />
              </button>
            </div>
            <div className="divide-y divide-[#F8FAFC]">
              {insightsLoading
                ? Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="px-5 py-4 flex items-start gap-3 animate-pulse">
                      <div className="w-8 h-8 rounded-[8px] bg-[#F1F5F9] shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 bg-[#F1F5F9] rounded w-5/6" />
                        <div className="h-2.5 bg-[#F1F5F9] rounded w-3/4" />
                      </div>
                      <div className="h-5 w-16 bg-[#F1F5F9] rounded-full" />
                    </div>
                  ))
                : (insights.length > 0 ? insights : FALLBACK_INSIGHTS).map((insight, i) => (
                    <div key={i} className="px-5 py-4 flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${insight.iconBg}`}>
                        <insight.icon className={`w-4 h-4 ${insight.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#0F172A] font-medium leading-snug">{insight.text}</p>
                        <p className="text-xs text-[#94A3B8] mt-0.5">{insight.sub}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${insight.badgeBg} ${insight.badgeText}`}>
                        {insight.badge}
                      </span>
                    </div>
                  ))
              }
            </div>
            <div className="px-5 py-3.5 border-t border-[#F1F5F9]">
              <button onClick={() => handleSend("Generate full business summary")}
                className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] py-1.5 rounded-[10px] hover:bg-[#EFF6FF]/50 transition-colors">
                <Sparkles className="w-3.5 h-3.5" /> Generate full business summary
              </button>
            </div>
          </div>

          {/* Smart Suggestions */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#D97706]" />
                <h2 className="text-sm font-bold text-[#0F172A]">Smart Suggestions</h2>
              </div>
              <Link href="/admin/ai" className="text-xs text-[#2563EB] hover:text-[#1D4ED8] font-medium">
                View all
              </Link>
            </div>
            <div className="divide-y divide-[#F8FAFC]">
              {(suggestions.length > 0 ? suggestions : FALLBACK_SUGGESTIONS).map((s, i) => (
                <Link key={i} href={s.href}
                  className="flex items-center gap-3 px-5 py-4 hover:bg-[#F8FAFC] transition-colors group">
                  <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${s.iconBg}`}>
                    <s.icon className={`w-4 h-4 ${s.iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#0F172A] leading-snug">{s.title}</p>
                    <p className="text-xs text-[#94A3B8] mt-0.5">{s.sub}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#2563EB] shrink-0 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Try asking */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-5">
          <h2 className="text-sm font-bold text-[#0F172A] mb-4">Try asking AI Copilot</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {TRY_QUESTIONS.map((q, i) => (
              <button key={i} onClick={() => handleSend(q.text)}
                className="group flex items-start gap-3 p-3.5 rounded-[12px] border border-[#E2E8F0] hover:border-[#2563EB]/30 hover:shadow-card hover:bg-[#EFF6FF]/20 transition-all text-left">
                <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center shrink-0 ${q.bg}`}>
                  <q.icon className={`w-3.5 h-3.5 ${q.color}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[#334155] leading-relaxed group-hover:text-[#0F172A] transition-colors">
                    {q.text}
                  </p>
                </div>
                <ArrowRight className="w-3 h-3 text-[#E2E8F0] group-hover:text-[#2563EB] shrink-0 mt-0.5 transition-colors" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right sidebar ─────────────────────────────────────────────────── */}
      <div className="hidden xl:flex flex-col gap-4 w-72 shrink-0">
        {/* Quick Actions */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#F1F5F9]">
            <h3 className="text-sm font-bold text-[#0F172A]">Quick Actions</h3>
          </div>
          <div className="divide-y divide-[#F8FAFC]">
            {QUICK_ACTIONS.map((action, i) => (
              <Link key={i} href={action.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors group">
                <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${action.bg}`}>
                  <action.icon className={`w-3.5 h-3.5 ${action.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#0F172A] leading-snug">{action.title}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5 leading-tight">{action.sub}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-[#CBD5E1] group-hover:text-[#2563EB] shrink-0 transition-colors" />
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Prompts */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-[#F1F5F9]">
            <h3 className="text-sm font-bold text-[#0F172A]">Recent Prompts</h3>
            {recentPrompts.length > 0 && (
              <button onClick={() => { setRecentPrompts([]); try { localStorage.removeItem("ff_recent_prompts"); } catch {} }}
                className="text-[11px] text-[#94A3B8] hover:text-[#64748B] transition-colors">
                Clear
              </button>
            )}
          </div>
          {recentPrompts.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <Clock className="w-5 h-5 text-[#E2E8F0] mx-auto mb-2" />
              <p className="text-xs text-[#94A3B8]">No recent prompts yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F8FAFC]">
              {recentPrompts.map((p, i) => (
                <button key={i} onClick={() => handleSend(p.text)}
                  className="w-full flex items-start gap-2.5 px-4 py-3 hover:bg-[#F8FAFC] transition-colors text-left">
                  <Clock className="w-3.5 h-3.5 text-[#94A3B8] shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-[#334155] leading-snug truncate">{p.text}</p>
                    <p className="text-[10px] text-[#94A3B8] mt-0.5">{p.time}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Resources */}
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
          <div className="px-4 py-3.5 border-b border-[#F1F5F9]">
            <h3 className="text-sm font-bold text-[#0F172A]">Resources</h3>
          </div>
          <div className="divide-y divide-[#F8FAFC]">
            {RESOURCES.map((r, i) => (
              <a key={i} href={r.href}
                className="flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors group">
                <div className="w-8 h-8 rounded-[8px] bg-[#F1F5F9] flex items-center justify-center shrink-0">
                  <r.icon className="w-3.5 h-3.5 text-[#64748B]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-[#334155] leading-snug">{r.title}</p>
                  <p className="text-[11px] text-[#94A3B8] mt-0.5">{r.sub}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-[#CBD5E1] group-hover:text-[#64748B] shrink-0 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Fallback data ─────────────────────────────────────────────────────────────
const FALLBACK_INSIGHTS: Insight[] = [
  { id: "1", icon: TrendingUp,  iconBg: "bg-[#EFF6FF]",  iconColor: "text-[#2563EB]", text: "Revenue is up this month compared to last month.",       sub: "Check the invoices page for a full breakdown.",    badge: "Positive",       badgeBg: "bg-[#F0FDF4]",          badgeText: "text-[#16A34A]" },
  { id: "2", icon: AlertCircle, iconBg: "bg-[#FFFBEB]", iconColor: "text-[#D97706]", text: "You have pending invoices that need attention.",          sub: "Review and follow up with clients.",               badge: "Action needed",  badgeBg: "bg-[#FFFBEB]",          badgeText: "text-[#D97706]" },
  { id: "3", icon: BarChart2,   iconBg: "bg-[#EFF6FF]",  iconColor: "text-[#2563EB]", text: "Jobs completion rate is on track this month.",            sub: "Keep up the momentum.",                           badge: "Info",            badgeBg: "bg-[#EFF6FF]",           badgeText: "text-[#2563EB]" },
  { id: "4", icon: TrendingUp,  iconBg: "bg-[#FFF1F2]",   iconColor: "text-[#DC2626]", text: "Fuel & Transport expenses increased this month.",         sub: "Review your expense categories.",                 badge: "Review",          badgeBg: "bg-[#FEF3C7]",         badgeText: "text-[#D97706]" },
];

const FALLBACK_SUGGESTIONS: Suggestion[] = [
  { id: "1", icon: AlertCircle, iconBg: "bg-[#FFFBEB]",  iconColor: "text-[#D97706]", title: "Review pending invoices",      sub: "Take action to improve cash flow",     href: "/admin/invoices?status=PENDING"   },
  { id: "2", icon: Wrench,      iconBg: "bg-[#EFF6FF]",   iconColor: "text-[#2563EB]", title: "Check pending jobs",           sub: "Follow up on in-progress work",        href: "/admin/jobs?status=IN_PROGRESS"   },
  { id: "3", icon: Users,       iconBg: "bg-[#F0FDF4]",  iconColor: "text-[#16A34A]", title: "Review worker performance",    sub: "See who's performing best",            href: "/admin/workers"                   },
  { id: "4", icon: BarChart2,   iconBg: "bg-[#F5F3FF]", iconColor: "text-[#7C3AED]", title: "Analyze expense trends",       sub: "Identify cost saving opportunities",   href: "/admin/expenses"                  },
];
