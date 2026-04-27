"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { NavLinks } from "./NavLinks";
import LogoutButton from "./LogoutButton";

interface Props {
  companyName: string;
  industryLabel: string;
}

export function MobileSidebar({ companyName, industryLabel }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close whenever the route changes (user tapped a nav link)
  useEffect(() => { setOpen(false); }, [pathname]);

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // Lock body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Hamburger button — hidden on desktop */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 -ml-1 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-in drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white z-50 flex flex-col shadow-2xl transition-transform duration-200 ease-in-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Workspace header */}
        <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
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
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 shrink-0 ml-2"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>

        {/* Logout */}
        <div className="p-3 border-t border-gray-100 shrink-0">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
