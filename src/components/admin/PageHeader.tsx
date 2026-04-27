"use client";
import { usePathname } from "next/navigation";

const PAGES: Record<string, { title: string; subtitle: string }> = {
  "/admin":             { title: "Dashboard",  subtitle: "Overview of your field operations" },
  "/admin/jobs":        { title: "Jobs",       subtitle: "Manage your field service jobs" },
  "/admin/clients":     { title: "Clients",    subtitle: "Manage client profiles and history" },
  "/admin/assets":      { title: "Assets",     subtitle: "Track and manage service assets" },
  "/admin/documents":   { title: "Documents",  subtitle: "All generated documents and reports" },
  "/admin/invoices":    { title: "Invoices",   subtitle: "Billing, payments and receipts" },
  "/admin/workers":     { title: "Workers",    subtitle: "Manage your field team" },
  "/admin/expenses":       { title: "Expenses",       subtitle: "Track costs and expenses" },
  "/admin/notifications":  { title: "Notifications",  subtitle: "Your activity feed and alerts" },
  "/admin/ai":             { title: "AI Copilot",     subtitle: "AI-powered operations intelligence" },
  "/admin/settings":    { title: "Settings",   subtitle: "Configure your workspace" },
};

export function PageHeader() {
  const pathname = usePathname();
  const key =
    pathname === "/admin"
      ? "/admin"
      : Object.keys(PAGES).find((k) => k !== "/admin" && pathname.startsWith(k));
  const { title, subtitle } = PAGES[key ?? "/admin"];
  return (
    <div className="min-w-0">
      <h1 className="text-base font-bold text-slate-900 leading-tight">{title}</h1>
      <p className="text-[11px] text-slate-400 leading-tight">{subtitle}</p>
    </div>
  );
}
