import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import LogoutButton from "@/components/admin/LogoutButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import UserDropdown from "@/components/admin/UserDropdown";
import { NavLinks } from "@/components/admin/NavLinks";
import { PageHeader } from "@/components/admin/PageHeader";
import { MobileSidebar } from "@/components/admin/MobileSidebar";
import { BottomNav } from "@/components/admin/BottomNav";
import Link from "next/link";
import { Search, Sparkles } from "lucide-react";

const INDUSTRY_LABELS: Record<string, string> = {
  TANK_SERVICES: "Water Tank Services",
  FUEL_TRACKER: "Fuel & Tracker Installation",
  SOLAR: "Solar & Energy",
  CLEANING: "Cleaning Services",
  PEST_CONTROL: "Pest Control",
  PLUMBING: "Plumbing Services",
  ELECTRICAL: "Electrical Services",
  HVAC: "HVAC Services",
  LOGISTICS: "Logistics & Delivery",
  SECURITY: "Security Services",
  PROPERTY: "Property Management",
  HOME_REPAIR: "Home Repair",
  OTHER: "Field Service Platform",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const workspaceId = await currentWorkspaceId();

  const [adminUser, companyNameSetting, industrySetting, onboardingSetting] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } }),
    prisma.setting.findFirst({ where: { workspaceId, key: "company_name" } }),
    prisma.setting.findFirst({ where: { workspaceId, key: "industry" } }),
    prisma.setting.findFirst({ where: { workspaceId, key: "onboarding_complete" } }),
  ]);

  if (onboardingSetting?.value === "false") redirect("/onboarding");

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
    <div className="flex h-screen bg-[#F8FAFC]">
      <aside className="hidden lg:flex w-56 bg-[#071B3A] flex-col shrink-0 shadow-sidebar">
        <div className="px-4 py-4 border-b border-[#0B2550]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-[#2563EB] rounded-[10px] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-extrabold tracking-tight">
                {companyName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-tight truncate">{companyName}</p>
              <p className="text-[10px] text-[#94A3B8] leading-tight truncate">{industryLabel}</p>
            </div>
          </div>
        </div>

        <NavLinks />

        <div className="p-3 border-t border-[#0B2550]">
          <LogoutButton />
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="bg-white border-b border-[#E2E8F0] px-4 lg:px-5 py-2.5 flex items-center gap-3 shrink-0">
          <MobileSidebar companyName={companyName} industryLabel={industryLabel} />
          <PageHeader />

          <div className="flex-1 max-w-sm mx-2 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input
                type="text"
                placeholder="Search jobs, clients, assets, workers..."
                className="w-full pl-8 pr-12 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-[10px] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-[#2563EB] text-[#334155] placeholder:text-[#94A3B8] transition-colors"
              />
              <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono bg-white border border-[#E2E8F0] text-[#94A3B8] px-1.5 py-0.5 rounded">
                Ctrl K
              </kbd>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-3 ml-auto">
            <Link
              href="/admin/ai"
              className="hidden md:inline-flex min-h-9 items-center gap-2 rounded-[10px] border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-xs font-semibold text-[#2563EB] transition-colors hover:border-[#93C5FD] hover:bg-[#DBEAFE]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Ask AI
            </Link>
            <NotificationBell />
            <UserDropdown name={name} initials={initials} />
          </div>
        </header>

        <main id="main-content" className="flex-1 overflow-y-auto p-4 pb-24 lg:p-6 lg:pb-6">
          {children}
        </main>

        <footer className="hidden lg:flex bg-white border-t border-[#E2E8F0] px-6 py-2 items-center justify-between shrink-0">
          <p className="text-[10px] text-[#94A3B8]">Copyright 2026 FieldFlow. All rights reserved.</p>
          <div className="flex items-center gap-4">
            {[
              { label: "Help", href: "/help" },
              { label: "Privacy", href: "/privacy" },
              { label: "Terms", href: "/terms" },
            ].map((l) => (
              <a key={l.label} href={l.href} className="text-[10px] text-[#94A3B8] hover:text-[#64748B] transition-colors">
                {l.label}
              </a>
            ))}
          </div>
        </footer>
      </div>

      <BottomNav />
    </div>
  );
}
