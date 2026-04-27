"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wrench, UserCheck, Users, Settings } from "lucide-react";

const ITEMS = [
  { href: "/admin",          label: "Home",    Icon: LayoutDashboard, exact: true },
  { href: "/admin/jobs",     label: "Jobs",    Icon: Wrench           },
  { href: "/admin/clients",  label: "Clients", Icon: UserCheck        },
  { href: "/admin/workers",  label: "Workers", Icon: Users            },
  { href: "/admin/settings", label: "Settings",Icon: Settings         },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-30">
      <div className="flex items-stretch">
        {ITEMS.map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 relative flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
                active ? "text-blue-600" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {active && (
                <span className="absolute top-0 inset-x-4 h-0.5 bg-blue-500 rounded-full" />
              )}
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-medium leading-none">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
