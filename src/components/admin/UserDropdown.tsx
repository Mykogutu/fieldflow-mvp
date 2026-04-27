"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, User, Settings, LogOut } from "lucide-react";

interface Props {
  name: string;
  initials: string;
}

export default function UserDropdown({ name, initials }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 cursor-pointer rounded-[10px] px-2.5 py-1.5 hover:bg-[#F1F5F9] transition-colors"
      >
        {/* Avatar */}
        <div className="w-7 h-7 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-[11px] font-bold shrink-0">
          {initials}
        </div>
        {/* Name + role */}
        <div className="hidden md:block leading-none text-left">
          <p className="text-[13px] font-semibold text-[#0F172A]">{name}</p>
          <p className="text-[10px] text-[#94A3B8] mt-0.5">Operations Manager</p>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-[#94A3B8] hidden md:block transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-52 bg-white border border-[#E2E8F0] rounded-[12px] shadow-xl z-50 py-1.5 overflow-hidden">
          {/* User header */}
          <div className="px-4 py-2.5 border-b border-[#F1F5F9] mb-1">
            <p className="text-[13px] font-semibold text-[#0F172A]">{name}</p>
            <p className="text-[11px] text-[#94A3B8] mt-0.5">Operations Manager</p>
          </div>

          {/* Items */}
          {[
            {
              label: "My Profile",
              icon: <User className="w-4 h-4" />,
              onClick: () => { setOpen(false); router.push("/admin/settings"); },
            },
            {
              label: "Settings",
              icon: <Settings className="w-4 h-4" />,
              onClick: () => { setOpen(false); router.push("/admin/settings"); },
            },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A] transition-colors"
            >
              <span className="text-[#94A3B8]">{item.icon}</span>
              {item.label}
            </button>
          ))}

          {/* Logout */}
          <div className="border-t border-[#F1F5F9] mt-1 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-[#DC2626] hover:bg-[#FEE2E2] transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
