"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[13px] text-[#94A3B8] hover:text-white hover:bg-[#0B2550] rounded-[10px] transition-colors font-medium"
    >
      <LogOut className="w-4 h-4 shrink-0" />
      <span>Sign Out</span>
    </button>
  );
}
