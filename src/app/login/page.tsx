"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Lock, MessageCircle, Phone, Rocket } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Login failed. Check your credentials.");
      } else {
        router.push("/admin");
      }
    } catch {
      setError("Connection failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto grid min-h-screen w-full max-w-[1180px] px-0 sm:px-6 lg:grid-cols-[0.82fr_1fr] lg:px-10">
        <section className="relative z-0 overflow-hidden bg-[#071B3A] px-6 pb-28 pt-9 text-white sm:my-8 sm:rounded-l-[18px] sm:px-12 lg:flex lg:flex-col lg:justify-between lg:p-14">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_78%,rgba(37,99,235,0.34),transparent_35%),radial-gradient(circle_at_20%_18%,rgba(59,130,246,0.16),transparent_30%)]" />
          <div className="relative">
            <Brand />
            <div className="mt-12 max-w-md">
              <h1 className="text-[38px] font-bold leading-[1.08] text-white lg:text-[46px]">
                Welcome back to your field desk
              </h1>
              <p className="mt-4 text-base leading-7 text-[#D8E6FF]">
                Sign in to manage jobs, workers, invoices, documents, and WhatsApp updates from one workspace.
              </p>
            </div>
          </div>

          <div className="relative mt-7 hidden gap-2.5 text-xs font-medium text-[#D8E6FF] sm:grid lg:mt-0 lg:gap-4 lg:text-sm">
            {[
              "WhatsApp-first job updates",
              "Auto-generated invoices and job cards",
              "Live operations visibility",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <MessageCircle className="h-4 w-4 text-[#BFDBFE] lg:h-5 lg:w-5" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="relative z-10 -mt-20 flex items-start justify-center bg-transparent px-4 pb-8 sm:my-8 sm:mt-8 sm:rounded-r-[18px] sm:border-y sm:border-r sm:border-[#E2E8F0] sm:px-8 lg:items-center lg:bg-[#FBFCFE] lg:px-12">
          <div className="w-full max-w-[480px] rounded-[18px] border border-[#D7E0EC] bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:p-8">
            <div className="mb-7">
              <h2 className="text-[30px] font-bold leading-tight text-[#0F172A]">Sign in</h2>
              <p className="mt-1 text-sm text-[#64748B]">Use the phone number attached to your admin account.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#0F172A]">Phone number</span>
                <div className="auth-control h-11">
                  <Phone className="h-4.5 w-4.5 shrink-0 text-[#64748B]" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+254700000000"
                    required
                    className="auth-input"
                  />
                </div>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#0F172A]">Password</span>
                <div className="auth-control h-11">
                  <Lock className="h-4.5 w-4.5 shrink-0 text-[#64748B]" />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="auth-input"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[#64748B]" aria-label={showPassword ? "Hide password" : "Show password"}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>

              {error && (
                <p className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#DC2626]">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#2563EB] px-4 text-base font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-[#1D4ED8] disabled:opacity-60"
              >
                {loading ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Rocket className="h-5 w-5" />}
                {loading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <div className="mt-7 border-t border-[#E2E8F0] pt-5 text-center text-sm text-[#64748B]">
              New to FieldFlow?{" "}
              <Link href="/signup" className="font-bold text-[#2563EB] hover:text-[#1D4ED8]">
                Create a workspace
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <span className="relative block h-9 w-9">
        <span className="absolute left-1 top-2 h-3 w-7 rounded-br-[10px] rounded-tl-[10px] bg-[#3B82F6]" />
        <span className="absolute left-1 top-4 h-3 w-5 rounded-br-[10px] rounded-tl-[10px] bg-white" />
      </span>
      <span className="text-2xl font-bold tracking-[-0.01em]">FieldFlow</span>
    </div>
  );
}
