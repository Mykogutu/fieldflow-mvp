"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, User, Sun, Moon, Home, BookOpen, LogOut } from "lucide-react";

interface Props {
  name: string;
  initials: string;
}

export default function UserDropdown({ name, initials }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Sync theme state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      document.documentElement.classList.add("dark");
      setIsDark(true);
    } else {
      document.documentElement.classList.remove("dark");
      setIsDark(false);
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }

  async function handleLogout() {
    setOpen(false);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const items = [
    {
      label: "My profile",
      icon: <User className="w-4 h-4" />,
      onClick: () => { setOpen(false); router.push("/admin/settings"); },
    },
    {
      label: isDark ? "Light mode" : "Dark mode",
      icon: isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />,
      shortcut: "M",
      onClick: () => toggleTheme(),
    },
    {
      label: "Homepage",
      icon: <Home className="w-4 h-4" />,
      onClick: () => { setOpen(false); window.open("/", "_blank"); },
    },
    {
      label: "Onboarding",
      icon: <BookOpen className="w-4 h-4" />,
      onClick: () => { setOpen(false); router.push("/admin/settings"); },
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 cursor-pointer rounded-xl px-2 py-1.5 hover:bg-slate-50 transition-colors"
      >
        <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
          {initials}
        </div>
        <div className="hidden md:block leading-none text-left">
          <p className="text-xs font-semibold text-slate-900">{name}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Operations Manager</p>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 hidden md:block transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-11 w-56 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1.5 overflow-hidden">
          {/* User info header */}
          <div className="px-4 py-2.5 border-b border-gray-100 mb-1">
            <p className="text-xs font-semibold text-slate-900">{name}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Operations Manager</p>
          </div>

          {/* Menu items */}
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors gap-3"
            >
              <span className="flex items-center gap-2.5">
                <span className="text-slate-400">{item.icon}</span>
                {item.label}
              </span>
              {item.shortcut && (
                <kbd className="text-[9px] font-mono bg-slate-100 border border-slate-200 text-slate-400 px-1.5 py-0.5 rounded">
                  {item.shortcut}
                </kbd>
              )}
            </button>
          ))}

          {/* Divider + Logout */}
          <div className="border-t border-gray-100 mt-1 pt-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
