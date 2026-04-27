"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell, CheckCheck, ArrowRight, Briefcase, CheckCircle2,
  AlertTriangle, UserX, Clock, XCircle, RefreshCw,
  FileText, Zap, ChevronLeft, ChevronRight,
} from "lucide-react";
import { markAllAsRead, markAsRead } from "@/app/actions/notification-actions";

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  jobId: string | null;
  createdAt: Date;
};

interface Props {
  notifications: Notification[];
  total: number;
  unreadCount: number;
  pages: number;
  currentPage: number;
  currentFilter: string;
}

const TYPE_CONFIG: Record<string, { Icon: React.ElementType; color: string; bg: string; dot: string }> = {
  JOB_CREATED:    { Icon: Briefcase,    color: "text-blue-600",   bg: "bg-blue-50",   dot: "bg-blue-500"   },
  JOB_VERIFIED:   { Icon: CheckCircle2, color: "text-green-600",  bg: "bg-green-50",  dot: "bg-green-500"  },
  JOB_COMPLETED:  { Icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-50", dot: "bg-purple-500" },
  JOB_DECLINED:   { Icon: UserX,        color: "text-red-600",    bg: "bg-red-50",    dot: "bg-red-500"    },
  JOB_POSTPONED:  { Icon: Clock,        color: "text-amber-600",  bg: "bg-amber-50",  dot: "bg-amber-500"  },
  JOB_ISSUE:      { Icon: AlertTriangle,color: "text-red-600",    bg: "bg-red-50",    dot: "bg-red-500"    },
  JOB_REASSIGNED: { Icon: RefreshCw,    color: "text-indigo-600", bg: "bg-indigo-50", dot: "bg-indigo-500" },
  JOB_CANCELLED:  { Icon: XCircle,      color: "text-slate-600",  bg: "bg-slate-100", dot: "bg-slate-400"  },
  INVOICE_PAID:   { Icon: FileText,     color: "text-green-600",  bg: "bg-green-50",  dot: "bg-green-500"  },
  DEFAULT:        { Icon: Bell,         color: "text-slate-500",  bg: "bg-slate-100", dot: "bg-slate-400"  },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsClient({
  notifications: initial,
  total,
  unreadCount,
  pages,
  currentPage,
  currentFilter,
}: Props) {
  const [items, setItems] = useState(initial);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function handleMarkAll() {
    startTransition(async () => {
      await markAllAsRead();
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })));
      router.refresh();
    });
  }

  function handleMarkOne(id: string) {
    startTransition(async () => {
      await markAsRead(id);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
    });
  }

  function handleClick(n: Notification) {
    if (!n.isRead) handleMarkOne(n.id);
    if (n.link) router.push(n.link);
  }

  const currentUnread = items.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Notifications</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {unreadCount > 0 ? `${unreadCount} unread · ` : ""}{total} total
          </p>
        </div>
        {currentUnread > 0 && (
          <button
            onClick={handleMarkAll}
            disabled={pending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-gray-200 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5">
        {[
          { key: "all", label: "All" },
          { key: "unread", label: `Unread${unreadCount > 0 ? ` (${unreadCount})` : ""}` },
          { key: "read", label: "Read" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={`/admin/notifications?filter=${key}`}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              currentFilter === key
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-slate-600 hover:border-blue-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-50">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Bell className="w-10 h-10 text-slate-200" />
            <p className="text-sm text-slate-400">No notifications here.</p>
          </div>
        ) : (
          items.map((n) => {
            const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.DEFAULT;
            const Icon = cfg.Icon;
            return (
              <div
                key={n.id}
                className={`flex items-start gap-4 px-5 py-4 transition-colors ${
                  !n.isRead ? "bg-blue-50/40" : "hover:bg-slate-50"
                } ${n.link ? "cursor-pointer" : ""}`}
                onClick={() => n.link && handleClick(n)}
              >
                {/* Icon */}
                <div className={`mt-0.5 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                  <Icon className={`w-4.5 h-4.5 ${cfg.color}`} style={{ width: 18, height: 18 }} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-sm leading-snug ${!n.isRead ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{timeAgo(n.createdAt)}</span>
                      {!n.isRead && (
                        <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-3 mt-1.5">
                    {n.link && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleClick(n); }}
                        className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-700 font-medium"
                      >
                        View <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkOne(n.id); }}
                        className="text-[11px] text-slate-400 hover:text-slate-600"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Page {currentPage} of {pages} · {total} total
          </p>
          <div className="flex items-center gap-1">
            <Link
              href={`/admin/notifications?filter=${currentFilter}&page=${Math.max(1, currentPage - 1)}`}
              className={`p-1.5 rounded-lg border border-gray-200 text-slate-500 hover:border-slate-300 transition-colors ${
                currentPage <= 1 ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
            <Link
              href={`/admin/notifications?filter=${currentFilter}&page=${Math.min(pages, currentPage + 1)}`}
              className={`p-1.5 rounded-lg border border-gray-200 text-slate-500 hover:border-slate-300 transition-colors ${
                currentPage >= pages ? "pointer-events-none opacity-40" : ""
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
