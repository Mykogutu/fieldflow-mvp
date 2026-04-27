import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import LogoutButton from "@/components/admin/LogoutButton";
import NotificationBell from "@/components/notifications/NotificationBell";
import { NavLinks } from "@/components/admin/NavLinks";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white border-2 border-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-blue-600 text-xs font-extrabold tracking-tight">
                FF
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900 text-sm leading-tight">
                FieldFlow
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">
                Field Service Platform
              </p>
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
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-end gap-3 shrink-0">
          <NotificationBell />
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
