"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Wrench,
  Tag,
  FileText,
  Users,
  CreditCard,
  Sparkles,
  Settings,
} from "lucide-react";

const NAV = [
  { href: "/admin",          label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { href: "/admin/jobs",     label: "Jobs",       Icon: Wrench                       },
  { href: "/admin/assets",   label: "Assets",     Icon: Tag                          },
  { href: "/admin/invoices", label: "Invoices",   Icon: FileText                     },
  { href: "/admin/workers",  label: "Workers",    Icon: Users                        },
  { href: "/admin/expenses", label: "Expenses",   Icon: CreditCard                   },
  { href: "/admin/ai",       label: "AI Copilot", Icon: Sparkles                     },
  { href: "/admin/settings", label: "Settings",   Icon: Settings                     },
];

export function NavLinks() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
      {NAV.map(({ href, label, Icon, exact }) => {
        const active = exact ? pathname === href : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? "bg-blue-50 text-blue-700 font-semibold"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Icon
              className={`w-4 h-4 flex-shrink-0 ${
                active ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span>{label}</span>
            {active && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
