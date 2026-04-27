"use client";
import { useEffect, useRef, useState } from "react";
import { Bell, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  link?: string;
}

const TYPE_COLORS: Record<string, string> = {
  JOB_CREATED: "bg-blue-100 text-blue-600",
  JOB_VERIFIED: "bg-green-100 text-green-600",
  JOB_COMPLETED: "bg-purple-100 text-purple-600",
  JOB_DECLINED: "bg-red-100 text-red-600",
  JOB_POSTPONED: "bg-amber-100 text-amber-600",
  JOB_ISSUE: "bg-red-100 text-red-600",
  DEFAULT: "bg-slate-100 text-slate-500",
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  async function load() {
    const res = await fetch("/api/notifications");
    if (res.ok) {
      const data = await res.json();
      setNotifications(data.notifications);
      setUnread(data.notifications.filter((n: Notification) => !n.isRead).length);
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAll() {
    await fetch("/api/notifications/read-all", { method: "POST" });
    load();
  }

  async function handleItemClick(n: Notification) {
    // mark as read
    await fetch(`/api/notifications/${n.id}/read`, { method: "POST" }).catch(() => {});
    setOpen(false);
    if (n.link) router.push(n.link);
    load();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <Bell className="w-[18px] h-[18px] text-slate-500" />
        {unread > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-1rem)] bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm">Notifications</span>
              {unread > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                  {unread}
                </span>
              )}
            </div>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-blue-600 hover:underline">
                Mark all read
              </button>
            )}
          </div>

          {/* Items */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10">
                <Bell className="w-8 h-8 text-slate-200" />
                <p className="text-sm text-slate-400">No notifications yet</p>
              </div>
            ) : (
              notifications.slice(0, 15).map((n) => {
                const dotColor = TYPE_COLORS[n.type] ?? TYPE_COLORS.DEFAULT;
                return (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors ${
                      !n.isRead ? "bg-blue-50/60" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${!n.isRead ? "bg-blue-500" : "bg-transparent"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-800 leading-snug">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {new Date(n.createdAt).toLocaleString("en-KE", {
                            timeZone: "Africa/Nairobi",
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-100 px-4 py-2.5">
            <Link
              href="/admin/notifications"
              onClick={() => setOpen(false)}
              className="flex items-center justify-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              View all notifications <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
