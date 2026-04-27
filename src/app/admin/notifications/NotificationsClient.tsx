"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCheck, ArrowRight, Briefcase, CheckCircle2,
  AlertTriangle, UserX, Clock, XCircle, RefreshCw,
  FileText, ChevronLeft, ChevronRight,
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

const TYPE_CONFIG: Record<string, { Icon: React.ElementType; color: string; bg: string; dot: string }> = {
  JOB_CREATED:    { Icon: Briefcase,    color: "text-[#2563EB]", bg: "bg-blue-50",   dot: "bg-[#2563EB]"  },
  JOB_VERIFIED:   { Icon: CheckCircle2, color: "text-[#16A34A]", bg: "bg-green-50",  dot: "bg-[#16A34A]"  },
  JOB_COMPLETED:  { Icon: CheckCircle2, color: "text-[#7C3AED]", bg: "bg-purple-50", dot: "bg-[#7C3AED]"  },
  JOB_DECLINED:   { Icon: UserX,        color: "text-[#DC2626]", bg: "bg-red-50",    dot: "bg-[#DC2626]"  },
  JOB_POSTPONED:  { Icon: Clock,        color: "text-[#D97706]", bg: "bg-amber-50",  dot: "bg-[#D97706]"  },
  JOB_ISSUE:      { Icon: AlertTriangle,color: "text-[#DC2626]", bg: "bg-red-50",    dot: "bg-[#DC2626]"  },
  JOB_REASSIGNED: { Icon: RefreshCw,    color: "text-indigo-600",bg: "bg-indigo-50", dot: "bg-indigo-500" },
  JOB_CANCELLED:  { Icon: XCircle,      color: "text-[#64748B]", bg: "bg-[#F1F5F9]",dot: "bg-[#94A3B8]"  },
  INVOICE_PAID:   { Icon: FileText,     color: "text-[#16A34A]", bg: "bg-green-50",  dot: "bg-[#16A34A]"  },
  DEFAULT:        { Icon: Bell,         color: "text-[#64748B]", bg: "bg-[#F1F5F9]", dot: "bg-[#94A3B8]"  },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsClient({
  notifications: initial, total, unreadCount, pages, currentPage, currentFilter,
}: Props) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
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

  function handleClick(n: Notification) {
    if (!n.isRead) handleMarkOne(n.id);
    if (n.link) router.push(n.link);
  }

  const currentUnread = items.filter(n => !n.isRead).length;

  const tabs = [
    { key: "all",    label: "All",    count: total },
    { key: "unread", label: "Unread", count: unreadCount },
    { key: "read",   label: "Read",   count: undefined },
  ];

  return (
    <div className="space-y-5 max-w-3xl">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ff-page-title">Notifications</h1>
          <p className="ff-page-desc">
            {unreadCount > 0 ? `${unreadCount} unread · ` : ""}{total} total
          </p>
        </div>
        {currentUnread > 0 && (
          <button onClick={handleMarkAll} disabled={pending}
            className="ff-btn-secondary inline-flex items-center gap-1.5 text-sm px-3 py-2 disabled:opacity-50">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* ── Tab bar + list card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-[#E2E8F0] px-4">
          <div className="flex gap-0">
            {tabs.map(tab => (
              <Link key={tab.key} href={`/admin/notifications?filter=${tab.key}`}
                className={`ff-tab ${currentFilter === tab.key ? "ff-tab-active" : "ff-tab-inactive"}`}>
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                    ${currentFilter === tab.key ? "bg-[#2563EB]/15 text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    {tab.count}
                  </span>
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Notification list */}
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
              <Bell className="w-6 h-6 text-[#94A3B8]" />
            </div>
            <p className="text-sm font-semibold text-[#475569]">All caught up!</p>
            <p className="text-xs text-[#94A3B8]">New activity will appear here</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F8FAFC]">
            {items.map(n => {
              const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.DEFAULT;
              return (
                <div key={n.id}
                  className={`flex items-start gap-4 px-5 py-4 transition-colors
                    ${!n.isRead ? "bg-blue-50/30" : "hover:bg-[#F8FAFC]"}
                    ${n.link ? "cursor-pointer" : ""}`}
                  onClick={() => n.link && handleClick(n)}>

                  {/* Icon */}
                  <div className={`mt-0.5 w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${cfg.bg}`}>
                    <cfg.Icon className={`w-4 h-4 ${cfg.color}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-[#0F172A]" : "font-medium text-[#334155]"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-[#64748B] mt-0.5 leading-relaxed">{n.message}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-[#94A3B8] whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                        {!n.isRead && (
                          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                        )}
                      </div>
                    </div>

                    {/* Action row */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {n.link && (
                        <button
                          onClick={e => { e.stopPropagation(); handleClick(n); }}
                          className="inline-flex items-center gap-1 text-[11px] text-[#2563EB] hover:text-[#1D4ED8] font-semibold transition-colors">
                          View <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                      {!n.isRead && (
                        <button
                          onClick={e => { e.stopPropagation(); handleMarkOne(n.id); }}
                          className="text-[11px] text-[#94A3B8] hover:text-[#64748B] transition-colors">
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-[#E2E8F0]">
            <p className="text-xs text-[#94A3B8]">
              Page {currentPage} of {pages} · {total} total
            </p>
            <div className="flex items-center gap-1">
              <Link href={`/admin/notifications?filter=${currentFilter}&page=${Math.max(1, currentPage - 1)}`}
                className={`p-1.5 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] transition-colors
                  ${currentPage <= 1 ? "pointer-events-none opacity-40" : ""}`}>
                <ChevronLeft className="w-4 h-4" />
              </Link>
              <Link href={`/admin/notifications?filter=${currentFilter}&page=${Math.min(pages, currentPage + 1)}`}
                className={`p-1.5 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] transition-colors
                  ${currentPage >= pages ? "pointer-events-none opacity-40" : ""}`}>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
