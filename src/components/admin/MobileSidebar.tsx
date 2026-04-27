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

  useEffect(() => { setOpen(false); }, [pathname]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  return (
    <>
      {/* Hamburger — hidden on desktop */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden p-2 -ml-1 rounded-[8px] text-[#64748B] hover:bg-[#F1F5F9] transition-colors shrink-0"
        aria-label="Open navigation menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-[1px] z-40 lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Slide-in drawer — dark sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-[#071B3A] z-50 flex flex-col shadow-2xl
          transition-transform duration-200 ease-in-out lg:hidden ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Workspace header */}
        <div className="px-4 py-4 border-b border-[#0B2550] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
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
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-[#94A3B8] hover:text-white hover:bg-[#0B2550] shrink-0 ml-2 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>

        {/* Sign Out */}
        <div className="p-3 border-t border-[#0B2550] shrink-0">
          <LogoutButton />
        </div>
      </aside>
    </>
  );
}
