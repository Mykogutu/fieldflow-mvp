"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CheckCircle2, ChevronRight, Lock, MessageCircle, Sparkles } from "lucide-react";
import { INDUSTRY_LIST } from "@/lib/industry-templates";

const countries = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Nigeria", "South Africa", "Ghana", "Other"];

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    businessName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
    industry: "TANK_SERVICES",
    country: "Kenya",
    referral: "",
    acceptedTerms: false,
  });

  const selectedIndustry = useMemo(
    () => INDUSTRY_LIST.find((industry) => industry.key === form.industry) ?? INDUSTRY_LIST[0],
    [form.industry]
  );

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error ?? "Signup failed. Please check the form and try again.");
        return;
      }

      router.push(data.redirect ?? "/onboarding");
    } catch {
      setError("Signup failed. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC]">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col justify-between bg-[#071B3A] px-6 py-8 text-white lg:px-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[12px] bg-[#2563EB] text-sm font-black">
                FF
              </div>
              <div>
                <p className="text-sm font-bold">FieldFlow</p>
                <p className="text-xs text-[#94A3B8]">WhatsApp-first field service</p>
              </div>
            </div>

            <div className="mt-16 max-w-md">
              <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-[#BFDBFE]">
                <Sparkles className="h-3.5 w-3.5" />
                Setup takes a few minutes
              </p>
              <h1 className="text-4xl font-black leading-tight tracking-tight">
                Create your workspace and start dispatching by WhatsApp.
              </h1>
              <p className="mt-4 text-sm leading-6 text-[#CBD5E1]">
                FieldFlow creates your business dashboard, industry defaults, document templates, and onboarding checklist in one flow.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-3 text-sm text-[#CBD5E1]">
            {[
              "Industry presets for jobs, documents, and terminology",
              "Admin account created with the right workspace attached",
              "Onboarding continues straight into live settings",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-[#60A5FA]" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-2xl rounded-[18px] border border-[#E2E8F0] bg-white p-5 shadow-card sm:p-7">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-black text-[#0F172A]">Create account</h2>
                <p className="mt-1 text-sm text-[#64748B]">Your first admin user and workspace are created together.</p>
              </div>
              <Link href="/login" className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
                Sign in
              </Link>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Full name">
                  <input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} className="ff-input text-sm" required />
                </Field>
                <Field label="Business name">
                  <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} className="ff-input text-sm" required />
                </Field>
                <Field label="Phone number">
                  <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+254700000000" className="ff-input text-sm" required />
                </Field>
                <Field label="Email">
                  <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="ff-input text-sm" required />
                </Field>
                <Field label="Password">
                  <input type="password" value={form.password} onChange={(e) => update("password", e.target.value)} className="ff-input text-sm" minLength={8} required />
                </Field>
                <Field label="Confirm password">
                  <input type="password" value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} className="ff-input text-sm" minLength={8} required />
                </Field>
                <Field label="Industry preset">
                  <select value={form.industry} onChange={(e) => update("industry", e.target.value)} className="ff-input text-sm">
                    {INDUSTRY_LIST.map((industry) => (
                      <option key={industry.key} value={industry.key}>
                        {industry.displayName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Country">
                  <select value={form.country} onChange={(e) => update("country", e.target.value)} className="ff-input text-sm">
                    {countries.map((country) => (
                      <option key={country}>{country}</option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="How did you hear about FieldFlow?">
                <input value={form.referral} onChange={(e) => update("referral", e.target.value)} placeholder="Optional" className="ff-input text-sm" />
              </Field>

              <div className="rounded-[14px] border border-[#DBEAFE] bg-[#EFF6FF] p-4">
                <div className="flex items-start gap-3">
                  <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#2563EB]" />
                  <div>
                    <p className="text-sm font-bold text-[#0F172A]">{selectedIndustry.displayName} preset</p>
                    <p className="mt-1 text-xs leading-5 text-[#475569]">
                      Creates {selectedIndustry.jobTypes.slice(0, 3).join(", ")} job types, {selectedIndustry.workerTitlePlural.toLowerCase()} terminology, and the right starting document options.
                    </p>
                  </div>
                </div>
              </div>

              <label className="flex items-start gap-3 rounded-[12px] border border-[#E2E8F0] p-3 text-sm text-[#475569]">
                <input
                  type="checkbox"
                  checked={form.acceptedTerms}
                  onChange={(e) => update("acceptedTerms", e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-[#CBD5E1] text-[#2563EB]"
                />
                <span>
                  I agree to the <Link className="font-semibold text-[#2563EB]" href="/terms">Terms</Link> and <Link className="font-semibold text-[#2563EB]" href="/privacy">Privacy Policy</Link>.
                </span>
              </label>

              {error && (
                <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#DC2626]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="ff-btn-primary flex w-full items-center justify-center gap-2 px-4 py-3 text-sm disabled:opacity-60"
              >
                {loading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                {loading ? "Creating workspace..." : "Create workspace"}
                {!loading && <ChevronRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#475569]">{label}</span>
      {children}
    </label>
  );
}
