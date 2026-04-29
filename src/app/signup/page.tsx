"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  ChevronDown,
  Droplets,
  Eye,
  EyeOff,
  FileText,
  Globe2,
  Info,
  Lock,
  Mail,
  MessageCircle,
  Rocket,
  User,
} from "lucide-react";
import { INDUSTRY_LIST } from "@/lib/industry-templates";

const countries = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Nigeria", "South Africa", "Ghana", "Other"];
const referrals = ["Select an option", "Google search", "WhatsApp referral", "Friend or colleague", "LinkedIn", "Other"];

export default function SignupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    <main className="min-h-screen bg-[#F8FAFC] text-[#0F172A]">
      <div className="mx-auto min-h-screen w-full max-w-[1400px] px-0 sm:px-6 lg:px-10">
        <div className="grid min-h-screen overflow-hidden bg-white shadow-[0_16px_60px_rgba(15,23,42,0.10)] sm:my-8 sm:min-h-[calc(100vh-4rem)] sm:rounded-[18px] sm:border sm:border-[#E2E8F0] lg:grid-cols-[0.82fr_1.08fr]">
          <SignupBrandPanel selectedIndustry={selectedIndustry.displayName} />

          <section className="relative z-10 -mt-24 flex items-start justify-center bg-transparent px-4 pb-8 sm:px-8 lg:mt-0 lg:items-center lg:bg-[#FBFCFE] lg:px-12 lg:py-10">
            <div className="w-full max-w-[620px] rounded-[18px] border border-[#D7E0EC] bg-white p-5 shadow-[0_18px_45px_rgba(15,23,42,0.10)] sm:p-8 lg:p-9">
              <div className="mb-6 hidden lg:block">
                <h1 className="text-[30px] font-bold leading-tight text-[#0F172A]">Create your workspace</h1>
                <p className="mt-1 text-base text-[#64748B]">Start your free trial and continue to onboarding.</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
                  <Field label="Full name" icon={User}>
                    <input value={form.fullName} onChange={(e) => update("fullName", e.target.value)} placeholder="Enter your full name" className="auth-input" required />
                  </Field>
                  <Field label="Business name" icon={Building2}>
                    <input value={form.businessName} onChange={(e) => update("businessName", e.target.value)} placeholder="Enter business name" className="auth-input" required />
                  </Field>
                  <PhoneField value={form.phone} onChange={(value) => update("phone", value)} />
                  <Field label="Email address" icon={Mail}>
                    <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="you@company.com" className="auth-input" required />
                  </Field>
                  <Field label="Password" icon={Lock} trailing={
                    <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-[#64748B]" aria-label={showPassword ? "Hide password" : "Show password"}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }>
                    <input type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => update("password", e.target.value)} placeholder="Create a strong password" className="auth-input" minLength={8} required />
                  </Field>
                  <Field label="Confirm password" icon={Lock} trailing={
                    <button type="button" onClick={() => setShowConfirm((v) => !v)} className="text-[#64748B]" aria-label={showConfirm ? "Hide password" : "Show password"}>
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }>
                    <input type={showConfirm ? "text" : "password"} value={form.confirmPassword} onChange={(e) => update("confirmPassword", e.target.value)} placeholder="Re-enter password" className="auth-input" minLength={8} required />
                  </Field>
                </div>

                <p className="-mt-2 text-xs text-[#64748B]">Use 8+ characters with a mix of letters, numbers & symbols.</p>

                <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
                  <SelectField label="Industry preset" icon={Droplets} value={form.industry} onChange={(value) => update("industry", value)}>
                    {INDUSTRY_LIST.map((industry) => (
                      <option key={industry.key} value={industry.key}>{industry.displayName}</option>
                    ))}
                  </SelectField>
                  <SelectField label="Country" icon={Globe2} value={form.country} onChange={(value) => update("country", value)}>
                    {countries.map((country) => <option key={country}>{country}</option>)}
                  </SelectField>
                </div>

                <SelectField label="How did you hear about us? (optional)" value={form.referral || referrals[0]} onChange={(value) => update("referral", value === referrals[0] ? "" : value)}>
                  {referrals.map((referral) => <option key={referral}>{referral}</option>)}
                </SelectField>

                <label className="flex items-start gap-3 text-sm text-[#334155]">
                  <input
                    type="checkbox"
                    checked={form.acceptedTerms}
                    onChange={(e) => update("acceptedTerms", e.target.checked)}
                    className="mt-0.5 h-5 w-5 rounded-[5px] border-[#CBD5E1] text-[#2563EB]"
                    required
                  />
                  <span>
                    I agree to the <Link className="font-medium text-[#2563EB]" href="/terms">Terms of Service</Link> and <Link className="font-medium text-[#2563EB]" href="/privacy">Privacy Policy</Link>.
                  </span>
                </label>

                {error && (
                  <div className="rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#DC2626]">
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading} className="flex h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-[#2563EB] px-4 text-base font-bold text-white shadow-[0_10px_24px_rgba(37,99,235,0.22)] transition hover:bg-[#1D4ED8] disabled:opacity-60">
                  {loading ? <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> : <Rocket className="h-5 w-5" />}
                  {loading ? "Creating workspace..." : "Create workspace"}
                </button>

                <div className="flex items-center justify-center gap-2 text-xs text-[#64748B]">
                  <Lock className="h-3.5 w-3.5" />
                  Your data is secure and never shared with third parties.
                </div>

                <div className="flex gap-3 rounded-[10px] border border-[#BFDBFE] bg-[#EFF6FF]/70 p-3 text-sm leading-5 text-[#1D4ED8]">
                  <Info className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>After signup, you&apos;ll be guided through onboarding to set up jobs, service zones, branding, documents, and WhatsApp.</p>
                </div>

                <div className="border-t border-[#E2E8F0] pt-5 text-center text-sm text-[#64748B]">
                  Already have an account?{" "}
                  <Link href="/login" className="font-bold text-[#2563EB] hover:text-[#1D4ED8]">Sign in</Link>
                </div>
              </form>
            </div>
          </section>
        </div>

        <footer className="hidden items-center justify-between px-1 py-5 text-xs text-[#94A3B8] sm:flex">
          <span className="mx-auto">(c) 2026 FieldFlow. All rights reserved.</span>
          <div className="flex gap-6">
            <Link href="/help">Help</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </div>
        </footer>
      </div>
    </main>
  );
}

function SignupBrandPanel({ selectedIndustry }: { selectedIndustry: string }) {
  const features = [
    { icon: MessageCircle, title: "WhatsApp first workflows", shortTitle: "WhatsApp", body: "Communicate and collect updates where your customers already are." },
    { icon: FileText, title: "Document automation", shortTitle: "Docs", body: "Create, send, and store invoices, reports, and receipts in seconds." },
    { icon: Building2, title: "Multi-industry ready", shortTitle: "Industry", body: "Built for water tank cleaning, plumbing, electrical, HVAC, and more." },
    { icon: BarChart3, title: "Real-time visibility", shortTitle: "Live", body: "Track jobs, teams, and performance with live dashboards and alerts." },
  ];

  return (
    <section className="relative z-0 min-h-[468px] overflow-hidden bg-[#071B3A] px-6 pb-20 pt-9 text-white sm:px-12 lg:flex lg:min-h-0 lg:flex-col lg:justify-between lg:p-14">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_82%,rgba(37,99,235,0.38),transparent_34%),radial-gradient(circle_at_15%_15%,rgba(59,130,246,0.16),transparent_30%)]" />
      <div className="absolute -bottom-24 -right-24 h-80 w-80 rounded-full border border-white/10" />
      <div className="absolute -bottom-10 right-8 h-56 w-56 rounded-full border border-white/10" />

      <div className="relative">
        <Brand />

        <div className="mt-10 lg:mt-16">
          <h2 className="text-[42px] font-bold leading-[1.08] text-white max-lg:hidden">
            Run your field<br />operations with<br />less chaos
          </h2>
          <h2 className="text-[34px] font-bold leading-[1.08] text-white min-[390px]:text-[36px] lg:hidden">
            Create your workspace
          </h2>
          <p className="mt-4 max-w-[430px] text-lg leading-7 text-[#D8E6FF] lg:text-base lg:leading-6">
            <span className="lg:hidden">Start your free trial and continue to onboarding.</span>
            <span className="hidden lg:inline">FieldFlow helps field service businesses manage jobs, teams, documents, and customers in one powerful, easy-to-use platform.</span>
          </p>
        </div>

        <div className="mt-7 grid grid-cols-4 gap-1.5 text-center lg:mt-10 lg:block lg:space-y-6 lg:text-left">
          {features.map(({ icon: Icon, title, shortTitle, body }) => (
            <div key={title} className="flex flex-col items-center gap-2 lg:flex-row lg:items-start lg:gap-4">
              <Icon className="h-6 w-6 shrink-0 text-[#D8E6FF] lg:h-6 lg:w-6" />
              <div>
                <p className="text-[11px] font-semibold leading-tight text-white min-[390px]:text-xs lg:hidden">{shortTitle}</p>
                <p className="hidden text-base font-medium leading-tight text-white lg:block">{title}</p>
                <p className="mt-1 hidden max-w-[320px] text-sm leading-5 text-[#BFD1F3] lg:block">{body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-12 hidden overflow-hidden rounded-[12px] border border-white/15 bg-white/10 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)] backdrop-blur lg:block">
        <div className="flex items-center gap-5">
          <div className="relative h-32 w-40 rounded-[10px] bg-[#DCE8FA] p-4">
            <div className="h-full rounded-[8px] bg-white p-4 shadow-sm">
              <div className="mb-3 h-2 w-16 rounded-full bg-[#CBD5E1]" />
              <div className="space-y-2">
                <div className="h-2 rounded-full bg-[#E2E8F0]" />
                <div className="h-2 w-4/5 rounded-full bg-[#E2E8F0]" />
                <div className="h-2 w-2/3 rounded-full bg-[#E2E8F0]" />
              </div>
            </div>
            <div className="absolute -bottom-2 left-6 right-6 rounded-[8px] bg-white p-3 text-[#0F172A] shadow-lg">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-full border-2 border-[#2563EB] text-[10px] font-bold text-[#2563EB]">2/5</div>
                <div>
                  <p className="text-xs font-bold">Setup progress</p>
                  <div className="mt-1 h-1.5 w-20 rounded-full bg-[#E2E8F0]">
                    <div className="h-full w-2/5 rounded-full bg-[#2563EB]" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div>
            <p className="font-bold text-white">Guided onboarding</p>
            <p className="mt-2 max-w-[240px] text-sm leading-5 text-[#D8E6FF]">
              After signup, we&apos;ll guide you through a quick setup for your {selectedIndustry.toLowerCase()} workspace.
            </p>
            <div className="mt-5 grid grid-cols-4 gap-2 text-[10px] text-[#BFD1F3]">
              {["Workspace", "Settings", "Team", "Finish"].map((step, index) => (
                <div key={step} className="min-w-0">
                  <span className={`mx-auto grid h-5 w-5 place-items-center rounded-full text-[10px] font-bold ${index === 0 ? "bg-[#2563EB] text-white" : "bg-white/20 text-white"}`}>{index + 1}</span>
                  <span className="mt-1 block truncate text-center">{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <BrandMark />
      <span className="text-2xl font-bold tracking-[-0.01em]">FieldFlow</span>
    </div>
  );
}

function BrandMark() {
  return (
    <span className="relative block h-9 w-9">
      <span className="absolute left-1 top-2 h-3 w-7 rounded-br-[10px] rounded-tl-[10px] bg-[#3B82F6]" />
      <span className="absolute left-1 top-4 h-3 w-5 rounded-br-[10px] rounded-tl-[10px] bg-white" />
    </span>
  );
}

function Field({ label, icon: Icon, trailing, children }: {
  label: string;
  icon?: React.ElementType;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#0F172A]">{label}</span>
      <div className="auth-control">
        {Icon && <Icon className="h-4.5 w-4.5 shrink-0 text-[#64748B]" />}
        {children}
        {trailing}
      </div>
    </label>
  );
}

function PhoneField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#0F172A]">Phone number</span>
      <div className="auth-control">
        <span className="inline-flex shrink-0 items-center gap-1.5 border-r border-[#E2E8F0] pr-2 text-sm font-medium text-[#0F172A]">
          <span className="grid h-5 w-5 place-items-center rounded-[4px] bg-[#0F172A] text-[9px] font-bold text-white">KE</span>
          +254
          <ChevronDown className="h-3.5 w-3.5 text-[#64748B]" />
        </span>
        <input
          type="tel"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="700 123 456"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#94A3B8]"
          required
        />
      </div>
    </label>
  );
}

function SelectField({ label, icon: Icon, value, onChange, children }: {
  label: string;
  icon?: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-[#0F172A]">{label}</span>
      <div className="auth-control">
        {Icon && <Icon className="h-4.5 w-4.5 shrink-0 text-[#64748B]" />}
        <select value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 appearance-none bg-transparent text-sm text-[#334155] outline-none">
          {children}
        </select>
        <ChevronDown className="h-4 w-4 shrink-0 text-[#64748B]" />
      </div>
    </label>
  );
}
