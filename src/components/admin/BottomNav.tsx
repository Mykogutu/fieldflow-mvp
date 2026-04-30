"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wrench, Users, HardHat, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Role } from "@/types";

type BottomNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  exact?: boolean;
  adminOnly?: boolean;
};

const ITEMS: BottomNavItem[] = [
  { href: "/admin",          label: "Home",    Icon: LayoutDashboard, exact: true },
  { href: "/admin/jobs",     label: "Jobs",    Icon: Wrench                       },
  { href: "/admin/clients",  label: "Clients", Icon: Users                        },
  { href: "/admin/workers",  label: "Workers", Icon: HardHat, adminOnly: true     },
  { href: "/admin/settings", label: "Settings",Icon: Settings, adminOnly: true    },
];

export function BottomNav({ role = "ADMIN" }: { role?: Role }) {
  const pathname = usePathname();
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-[#E2E8F0] z-30 safe-bottom">
      <div className="flex items-stretch">
        {ITEMS.filter((item) => !item.adminOnly || role === "ADMIN").map(({ href, label, Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex-1 relative flex flex-col items-center justify-center py-2.5 gap-1 transition-colors ${
                active ? "text-[#2563EB]" : "text-[#94A3B8] hover:text-[#64748B]"
              }`}
            >
              {active && (
                <span className="absolute top-0 inset-x-3 h-0.5 bg-[#2563EB] rounded-full" />
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
