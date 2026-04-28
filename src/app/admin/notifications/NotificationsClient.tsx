"use client";
import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCheck, Briefcase, CheckCircle2,
  AlertTriangle, UserX, Clock, XCircle, RefreshCw,
  FileText, MoreHorizontal, Filter, Mail, Smartphone,
  Settings, HelpCircle, ExternalLink, ChevronDown,
} from "lucide-react";
import { markAllAsRead, markAsRead } from "@/app/actions/notification-actions";

type Notification = {
  id: string; type: string; title: string; message: string;
  isRead: boolean; link: string | null; jobId: string | null; createdAt: Date;
};

interface Props {
  notifications: Notification[]; total: number; unreadCount: number;
  pages: number; currentPage: number; currentFilter: string;
}

const TYPE_CONFIG: Record<string, { Icon: React.ElementType; color: string; bg: string }> = {
  JOB_CREATED:    { Icon: Briefcase,     color: "text-[#2563EB]", bg: "bg-[#EFF6FF]"  },
  JOB_VERIFIED:   { Icon: CheckCircle2,  color: "text-[#16A34A]", bg: "bg-[#F0FDF4]"  },
  JOB_COMPLETED:  { Icon: CheckCircle2,  color: "text-[#7C3AED]", bg: "bg-[#F5F3FF]"  },
  JOB_DECLINED:   { Icon: UserX,         color: "text-[#DC2626]", bg: "bg-[#FFF1F2]"  },
  JOB_POSTPONED:  { Icon: Clock,         color: "text-[#D97706]", bg: "bg-[#FFFBEB]"  },
  JOB_ISSUE:      { Icon: AlertTriangle, color: "text-[#DC2626]", bg: "bg-[#FFF1F2]"  },
  JOB_REASSIGNED: { Icon: RefreshCw,     color: "text-[#4F46E5]", bg: "bg-[#EEF2FF]"  },
  JOB_CANCELLED:  { Icon: XCircle,       color: "text-[#64748B]", bg: "bg-[#F1F5F9]"  },
  INVOICE_PAID:   { Icon: FileText,      color: "text-[#16A34A]", bg: "bg-[#F0FDF4]"  },
  DEFAULT:        { Icon: Bell,          color: "text-[#64748B]", bg: "bg-[#F1F5F9]"  },
};

function getActionLabel(type: string): string {
  if (type.startsWith("JOB_"))     return "View Job";
  if (type.startsWith("INVOICE_")) return "View Invoice";
  if (type.startsWith("CLIENT_"))  return "View Client";
  return "View";
}

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function groupByDate(items: Notification[]): { label: string; items: Notification[] }[] {
  const now = new Date();
  const today     = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo   = new Date(today.getTime() - 7 * 86400000);

  const groups: { label: string; items: Notification[] }[] = [
    { label: "Today",     items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "Older",     items: [] },
  ];

  for (const n of items) {
    const d = new Date(n.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    if (day >= today)     groups[0].items.push(n);
    else if (day >= yesterday) groups[1].items.push(n);
    else if (day >= weekAgo)   groups[2].items.push(n);
    else                       groups[3].items.push(n);
  }

  return groups.filter(g => g.items.length > 0);
}

function ThreeDotMenu({ onMarkRead, onDelete }: { onMarkRead: () => void; onDelete?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={e => { e.stopPropagation(); setOpen(v => !v); }}
        className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition-colors"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-8 z-20 w-40 bg-white border border-[#E2E8F0] rounded-[10px] shadow-lg py-1 text-sm">
          <button
            onClick={e => { e.stopPropagation(); onMarkRead(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-[#334155] hover:bg-[#F8FAFC] transition-colors"
          >
            Mark as read
          </button>
          <button
            onClick={e => { e.stopPropagation(); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-[#334155] hover:bg-[#F8FAFC] transition-colors"
          >
            Mute this type
          </button>
          {onDelete && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-[#DC2626] hover:bg-red-50 transition-colors"
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SelectField({ label, options }: { label: string; options: string[] }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#475569] mb-1.5">{label}</label>
      <div className="relative">
        <select className="w-full appearance-none bg-white border border-[#E2E8F0] rounded-[8px] px-3 py-2 text-xs text-[#334155] focus:outline-none focus:ring-2 focus:ring-[#2563EB] pr-8">
          {options.map(o => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8] pointer-events-none" />
      </div>
    </div>
  );
}

function SettingRow({ icon: Icon, label, description, defaultOn = true }: {
  icon: React.ElementType; label: string; description: string; defaultOn?: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-start justify-between gap-3 py-3">
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#F1F5F9] flex items-center justify-center shrink-0 mt-0.5">
          <Icon className="w-3.5 h-3.5 text-[#64748B]" />
        </div>
        <div>
          <p className="text-xs font-semibold text-[#0F172A]">{label}</p>
          <p className="text-[11px] text-[#94A3B8] mt-0.5">{description}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => setOn(v => !v)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 mt-0.5
          ${on ? "bg-[#2563EB]" : "bg-[#E2E8F0]"}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition duration-200 ease-in-out ${on ? "translate-x-4" : "translate-x-0"}`} />
      </button>
    </div>
  );
}

export default function NotificationsClient({
  notifications: initial, total, unreadCount, pages, currentPage, currentFilter,
}: Props) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState(currentFilter || "all");
  const router = useRouter();

  function handleMarkAll() {
    startTransition(async () => {
      await markAllAsRead();
      setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      router.refresh();
    });
  }

  function handleMarkOne(id: string) {
    startTransition(async () => {
      await markAsRead(id);
      setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    });
  }

  const currentUnread = items.filter(n => !n.isRead).length;

  const filteredItems = activeTab === "unread"
    ? items.filter(n => !n.isRead)
    : activeTab === "system"
    ? items.filter(n => !n.type.startsWith("JOB_"))
    : items;

  const grouped = groupByDate(filteredItems);

  const tabs = [
    { key: "all",      label: "All",      count: total },
    { key: "unread",   label: "Unread",   count: unreadCount },
    { key: "mentions", label: "Mentions", count: 0 },
    { key: "system",   label: "System",   count: undefined },
  ];

  return (
    <div className="space-y-5">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ff-page-title">Notifications</h1>
          <p className="ff-page-desc">
            {unreadCount > 0 ? `${unreadCount} unread · ` : ""}{total} total
          </p>
        </div>
        {currentUnread > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={pending}
            className="ff-btn-secondary inline-flex items-center gap-1.5 text-sm px-3 py-2 disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* ── Two-column layout ────────────────────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── LEFT: Notification list ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
          {/* Tab bar */}
          <div className="border-b border-[#E2E8F0] px-4 overflow-x-auto scrollbar-none">
            <div className="flex gap-0 min-w-max">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`ff-tab rounded-none border-0 border-b-2 py-3.5 px-4 text-sm transition-colors
                    ${activeTab === tab.key
                      ? "border-[#2563EB] text-[#2563EB] font-semibold"
                      : "border-transparent text-[#64748B] hover:text-[#334155]"
                    }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                      ${activeTab === tab.key ? "bg-[#2563EB]/15 text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {filteredItems.length === 0 && (
            <div className="flex flex-col items-center gap-3 py-20 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                <Bell className="w-6 h-6 text-[#94A3B8]" />
              </div>
              <p className="text-sm font-semibold text-[#475569]">All caught up!</p>
              <p className="text-xs text-[#94A3B8]">New activity will appear here</p>
            </div>
          )}

          {/* Grouped list */}
          {grouped.map(group => (
            <div key={group.label}>
              {/* Group header */}
              <div className="px-5 py-2 bg-[#F8FAFC] border-b border-[#F1F5F9]">
                <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">{group.label}</p>
              </div>
              <div className="divide-y divide-[#F8FAFC]">
                {group.items.map(n => {
                  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.DEFAULT;
                  const actionLabel = getActionLabel(n.type);
                  return (
                    <div
                      key={n.id}
                      className={`flex items-start gap-3.5 px-5 py-4 transition-colors
                        ${!n.isRead ? "bg-[#EFF6FF]/60" : "hover:bg-[#F8FAFC]"}`}
                    >
                      {/* Unread dot */}
                      <div className="flex items-center justify-center pt-1.5 shrink-0 w-3">
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />
                        )}
                      </div>

                      {/* Icon */}
                      <div className={`mt-0.5 w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${cfg.bg}`}>
                        <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-[#0F172A]" : "font-medium text-[#334155]"}`}>
                            {n.title}
                          </p>
                          <span className="text-[10px] text-[#94A3B8] whitespace-nowrap shrink-0 mt-0.5">
                            {timeAgo(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{n.message}</p>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 mt-2">
                          {n.link && (
                            <Link
                              href={n.link}
                              onClick={() => !n.isRead && handleMarkOne(n.id)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#2563EB]/30 text-[#2563EB] hover:bg-blue-50 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {actionLabel}
                            </Link>
                          )}
                          {!n.isRead && (
                            <button
                              onClick={() => handleMarkOne(n.id)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
                            >
                              Mark read
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Three-dot menu */}
                      <ThreeDotMenu onMarkRead={() => handleMarkOne(n.id)} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E8F0]">
              <p className="text-xs text-[#94A3B8]">Page {currentPage} of {pages}</p>
              <div className="flex items-center gap-1">
                <Link href={`/admin/notifications?filter=${currentFilter}&page=${Math.max(1, currentPage - 1)}`}
                  className={`px-3 py-1.5 text-xs rounded-[6px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] transition-colors
                    ${currentPage <= 1 ? "pointer-events-none opacity-40" : ""}`}>
                  Prev
                </Link>
                <Link href={`/admin/notifications?filter=${currentFilter}&page=${Math.min(pages, currentPage + 1)}`}
                  className={`px-3 py-1.5 text-xs rounded-[6px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] transition-colors
                    ${currentPage >= pages ? "pointer-events-none opacity-40" : ""}`}>
                  Next
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL ─────────────────────────────────────────────────── */}
        <div className="hidden lg:flex flex-col gap-4 w-[260px] shrink-0">

          {/* Filter section */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#64748B]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Filter</h3>
            </div>
            <SelectField label="Type" options={["All types", "Job updates", "Invoice", "System"]} />
            <SelectField label="Date" options={["Any date", "Today", "This week", "This month"]} />
            <SelectField label="Status" options={["All", "Unread", "Read"]} />
            <SelectField label="Related To" options={["All", "Jobs", "Invoices", "Workers", "Clients"]} />
            <button className="w-full bg-[#2563EB] text-white text-xs font-semibold py-2.5 rounded-[8px] hover:bg-[#1D4ED8] transition-colors">
              Apply Filters
            </button>
          </div>

          {/* Notification Settings */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-4 h-4 text-[#64748B]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Notification Settings</h3>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              <SettingRow
                icon={Mail}
                label="Email Notifications"
                description="Receive updates via email"
                defaultOn={true}
              />
              <SettingRow
                icon={Smartphone}
                label="Push Notifications"
                description="Browser push alerts"
                defaultOn={false}
              />
              <div className="py-3">
                <button className="flex items-center gap-1.5 text-xs font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors">
                  <Settings className="w-3.5 h-3.5" />
                  Notification Preferences
                </button>
              </div>
            </div>
          </div>

          {/* Need Help */}
          <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle className="w-4 h-4 text-[#64748B]" />
              <h3 className="text-sm font-semibold text-[#0F172A]">Need Help?</h3>
            </div>
            <p className="text-[11px] text-[#94A3B8] leading-relaxed mb-3">
              Learn how notifications work and how to configure alerts for your team.
            </p>
            <button className="w-full text-xs font-semibold py-2 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155] transition-colors flex items-center justify-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5" />
              Go to Help Center
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
