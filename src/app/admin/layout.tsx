import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import LogoutButton from "@/components/admin/LogoutButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import UserDropdown from "@/components/admin/UserDropdown";
import { NavLinks } from "@/components/admin/NavLinks";
import { PageHeader } from "@/components/admin/PageHeader";
import { Search } from "lucide-react";

const INDUSTRY_LABELS: Record<string, string> = {
  TANK_SERVICES:  "Water Tank Services",
  FUEL_TRACKER:   "Fuel & Tracker Installation",
  SOLAR:          "Solar & Energy",
  CLEANING:       "Cleaning Services",
  PEST_CONTROL:   "Pest Control",
  PLUMBING:       "Plumbing Services",
  ELECTRICAL:     "Electrical Services",
  HVAC:           "HVAC Services",
  LOGISTICS:      "Logistics & Delivery",
  SECURITY:       "Security Services",
  PROPERTY:       "Property Management",
  HOME_REPAIR:    "Home Repair",
  OTHER:          "Field Service Platform",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const workspaceId = await currentWorkspaceId();

  const [adminUser, companyNameSetting, industrySetting] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
    prisma.setting.findFirst({ where: { workspaceId, key: "company_name" } }),
    prisma.setting.findFirst({ where: { workspaceId, key: "industry" } }),
  ]);

  const name = adminUser?.name ?? "Admin";
  const initials = name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const companyName = companyNameSetting?.value ?? "FieldFlow";
  const industryLabel = INDUSTRY_LABELS[industrySetting?.value ?? ""] ?? "Field Service Platform";

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
        {/* Workspace identity */}
        <div className="px-4 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-extrabold tracking-tight">
                {companyName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm leading-tight truncate">{companyName}</p>
              <p className="text-[10px] text-slate-400 leading-tight truncate">{industryLabel}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <NavLinks />

        {/* Logout */}
        <div className="p-3 border-t border-gray-100">
          <LogoutButton />
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-5 py-2.5 flex items-center gap-4 shrink-0">
          {/* Page title (client component reads pathname) */}
          <PageHeader />

          {/* Search */}
          <div className="flex-1 max-w-sm mx-4 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search jobs, workers, assets..."
                className="w-full pl-8 pr-14 py-1.5 text-xs bg-slate-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 placeholder:text-slate-400"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono bg-white border border-gray-200 text-slate-400 px-1.5 py-0.5 rounded">
                ⌘K
              </kbd>
            </div>
          </div>

          {/* Bell + user */}
          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell />

            <UserDropdown name={name} initials={initials} />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-100 px-6 py-2 flex items-center justify-between shrink-0">
          <p className="text-[10px] text-slate-400">© 2026 FieldFlow. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {["Help", "Privacy", "Terms"].map((l) => (
              <a key={l} href="#" className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
                {l}
              </a>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}
