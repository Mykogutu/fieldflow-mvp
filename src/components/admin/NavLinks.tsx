"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Wrench,
  Users,
  Package,
  FileText,
  Receipt,
  HardHat,
  Wallet,
  Bell,
  Sparkles,
  Settings,
} from "lucide-react";

// ── Nav structure with grouping ───────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: "Main",
    items: [
      { href: "/admin",         label: "Dashboard", Icon: LayoutDashboard, exact: true },
      { href: "/admin/jobs",    label: "Jobs",       Icon: Wrench                      },
      { href: "/admin/clients", label: "Clients",    Icon: Users                       },
      { href: "/admin/assets",  label: "Assets",     Icon: Package                     },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/admin/documents",    label: "Documents",    Icon: FileText  },
      { href: "/admin/invoices",     label: "Invoices",     Icon: Receipt   },
      { href: "/admin/workers",      label: "Workers",      Icon: HardHat   },
      { href: "/admin/expenses",     label: "Expenses",     Icon: Wallet    },
      { href: "/admin/notifications",label: "Notifications",Icon: Bell      },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/admin/ai", label: "Ask AI", Icon: Sparkles },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/admin/settings", label: "Settings", Icon: Settings },
    ],
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-5">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          {/* Section label */}
          <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">
            {group.label}
          </p>

          {/* Items */}
          <div className="space-y-0.5">
            {group.items.map(({ href, label, Icon, exact }) => {
              const active = exact ? pathname === href : pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] text-[13.5px] font-medium transition-all duration-100 ${
                    active
                      ? "bg-[#2563EB] text-white"
                      : "text-[#CBD5E1] hover:bg-[#0B2550] hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
