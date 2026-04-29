"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  FileText,
  MapPin,
  MessageCircle,
  Palette,
  Settings2,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { INDUSTRY_LIST, INDUSTRY_TEMPLATES, type IndustryKey } from "@/lib/industry-templates";

const DOCUMENT_OPTIONS = [
  { key: "invoice", label: "Invoice" },
  { key: "job_card", label: "Job Card" },
  { key: "warranty", label: "Warranty Certificate" },
  { key: "completion_certificate", label: "Completion Certificate" },
  { key: "service_report", label: "Service Report" },
  { key: "installation_report", label: "Installation Report" },
  { key: "fuel_calibration_report", label: "Fuel Calibration Report" },
  { key: "device_replacement_report", label: "Device Replacement Report" },
  { key: "client_confirmation_receipt", label: "Client Confirmation Receipt" },
  { key: "delivery_note", label: "Delivery Note" },
  { key: "compliance_certificate", label: "Compliance Certificate" },
];

const steps = [
  { title: "Company", Icon: Building2 },
  { title: "Industry", Icon: Sparkles },
  { title: "Operations", Icon: Wrench },
  { title: "Branding", Icon: Palette },
  { title: "Documents", Icon: FileText },
  { title: "WhatsApp", Icon: MessageCircle },
  { title: "First records", Icon: MapPin },
  { title: "Review", Icon: Settings2 },
];

function safeJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

const documentKeyMap: Record<string, string> = {
  Invoice: "invoice",
  Warranty: "warranty",
  DeliveryNote: "delivery_note",
  Certificate: "completion_certificate",
  ServiceReport: "service_report",
  InstallationCertificate: "installation_report",
};

export default function OnboardingClient({
  settings,
  adminName,
}: {
  settings: Record<string, string>;
  adminName: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const savedStep = settings.onboarding_step && settings.onboarding_step !== "complete"
    ? Math.max(0, Math.min(7, Number(settings.onboarding_step) - 1))
    : 0;
  const [step, setStep] = useState(savedStep);
  const [error, setError] = useState("");
  const [newJobType, setNewJobType] = useState("");
  const [newZone, setNewZone] = useState("");
  const [form, setForm] = useState({
    company_name: settings.company_name ?? "",
    support_email: settings.support_email ?? "",
    company_phone: settings.company_phone ?? "",
    business_location: settings.business_location ?? "",
    country: settings.country ?? "Kenya",
    industry: (settings.industry as IndustryKey) || "TANK_SERVICES",
    worker_title: settings.worker_title ?? "Technician",
    worker_title_plural: settings.worker_title_plural ?? "Technicians",
    job_label: settings.job_label ?? "Job",
    job_label_plural: settings.job_label_plural ?? "Jobs",
    asset_label: settings.asset_label ?? "Asset",
    asset_label_plural: settings.asset_label_plural ?? "Assets",
    client_label: settings.client_label ?? "Client",
    client_label_plural: settings.client_label_plural ?? "Clients",
    default_warranty: settings.default_warranty ?? "",
    brand_color: settings.brand_color ?? "#2563EB",
    pdf_footer: settings.pdf_footer ?? "",
    whatsapp_setup_mode: settings.whatsapp_setup_mode ?? "shared",
  });
  const [jobTypes, setJobTypes] = useState<string[]>(safeJson(settings.job_types, []));
  const [zones, setZones] = useState<string[]>(safeJson(settings.zones, []));
  const [enabledDocs, setEnabledDocs] = useState<string[]>(safeJson(settings.enabled_documents, ["invoice", "job_card"]));

  const selectedIndustry = useMemo(
    () => INDUSTRY_LIST.find((industry) => industry.key === form.industry) ?? INDUSTRY_LIST[0],
    [form.industry]
  );

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function applyIndustry(value: IndustryKey) {
    const template = INDUSTRY_TEMPLATES[value] ?? INDUSTRY_TEMPLATES.OTHER;
    const mappedDocs = template.defaultDocuments.map((doc) => documentKeyMap[doc]).filter(Boolean);
    setForm((current) => ({
      ...current,
      industry: value,
      worker_title: template.workerTitle,
      worker_title_plural: template.workerTitlePlural,
      job_label: template.jobLabel,
      job_label_plural: template.jobLabelPlural,
      default_warranty: template.defaultWarranty ?? "",
    }));
    setJobTypes(template.jobTypes);
    setEnabledDocs(Array.from(new Set(["invoice", "job_card", ...mappedDocs])));
  }

  function settingsPayload() {
    return {
      ...form,
      job_types: JSON.stringify(jobTypes),
      zones: JSON.stringify(zones),
      enabled_documents: JSON.stringify(enabledDocs),
      currency: settings.currency ?? "KES",
      currency_symbol: settings.currency_symbol ?? settings.currency ?? "KES",
      show_logo_on_docs: settings.show_logo_on_docs ?? "true",
      brand_color_header: settings.brand_color_header ?? "true",
      include_otp_stamp: settings.include_otp_stamp ?? "true",
    };
  }

  function save(nextStep: number, complete = false) {
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: nextStep + 1, complete, settings: settingsPayload() }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error ?? "Unable to save onboarding.");
        return;
      }

      if (complete) {
        router.push("/admin");
        router.refresh();
        return;
      }

      setStep(nextStep);
    });
  }

  function next() {
    save(Math.min(step + 1, steps.length - 1));
  }

  function finish() {
    const missing = [];
    if (!form.company_name.trim()) missing.push("company name");
    if (!form.industry.trim()) missing.push("industry");
    if (jobTypes.length === 0) missing.push("one job type");
    if (zones.length === 0) missing.push("one service zone");
    if (enabledDocs.length === 0) missing.push("one document type");

    if (missing.length > 0) {
      setError(`Please add ${missing.join(", ")} before finishing.`);
      return;
    }

    save(step, true);
  }

  return (
    <main className="min-h-screen bg-[#F8FAFC] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-[#2563EB]">Welcome, {adminName}</p>
            <h1 className="mt-1 text-3xl font-black text-[#0F172A]">Set up your FieldFlow workspace</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
              These choices become your live dashboard settings: job types, zones, document options, WhatsApp setup, and branding.
            </p>
          </div>
          <div className="rounded-[10px] border border-[#E2E8F0] bg-white px-3 py-2 text-xs font-semibold text-[#64748B]">
            Progress saves as you continue
          </div>
        </header>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
          <aside className="rounded-[16px] border border-[#E2E8F0] bg-white p-3 shadow-card lg:sticky lg:top-6 lg:self-start">
            {steps.map(({ title, Icon }, index) => (
              <button
                key={title}
                type="button"
                onClick={() => save(index)}
                className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-3 text-left text-sm transition-colors ${
                  step === index ? "bg-[#EFF6FF] font-bold text-[#2563EB]" : "text-[#64748B] hover:bg-[#F8FAFC]"
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-[10px] ${step === index ? "bg-[#2563EB] text-white" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span>{title}</span>
                {index < step && <Check className="ml-auto h-4 w-4 text-[#16A34A]" />}
              </button>
            ))}
          </aside>

          <section className="rounded-[18px] border border-[#E2E8F0] bg-white shadow-card">
            <div className="border-b border-[#E2E8F0] px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-wide text-[#94A3B8]">Step {step + 1} of {steps.length}</p>
              <h2 className="mt-1 text-xl font-black text-[#0F172A]">{steps[step].title}</h2>
            </div>

            <div className="p-5">
              {step === 0 && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Company name" value={form.company_name} onChange={(value) => update("company_name", value)} />
                  <Input label="Business phone" value={form.company_phone} onChange={(value) => update("company_phone", value)} />
                  <Input label="Support email" value={form.support_email} onChange={(value) => update("support_email", value)} />
                  <Input label="Country" value={form.country} onChange={(value) => update("country", value)} />
                  <label className="block sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Business address</span>
                    <textarea value={form.business_location} onChange={(e) => update("business_location", e.target.value)} rows={3} className="ff-input text-sm resize-none" />
                  </label>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-5">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Industry preset</span>
                    <select value={form.industry} onChange={(e) => applyIndustry(e.target.value as IndustryKey)} className="ff-input text-sm">
                      {INDUSTRY_LIST.map((industry) => (
                        <option key={industry.key} value={industry.key}>{industry.displayName}</option>
                      ))}
                    </select>
                  </label>
                  <div className="rounded-[14px] border border-[#DBEAFE] bg-[#EFF6FF] p-4">
                    <p className="text-sm font-bold text-[#0F172A]">{selectedIndustry.displayName}</p>
                    <p className="mt-1 text-xs leading-5 text-[#475569]">
                      This preset uses {selectedIndustry.workerTitlePlural.toLowerCase()}, {selectedIndustry.jobLabelPlural.toLowerCase()}, and starts with {selectedIndustry.defaultDocuments.join(", ")} documents.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Input label="Worker label" value={form.worker_title} onChange={(value) => update("worker_title", value)} />
                    <Input label="Worker plural" value={form.worker_title_plural} onChange={(value) => update("worker_title_plural", value)} />
                    <Input label="Job label" value={form.job_label} onChange={(value) => update("job_label", value)} />
                    <Input label="Job plural" value={form.job_label_plural} onChange={(value) => update("job_label_plural", value)} />
                    <Input label="Asset label" value={form.asset_label} onChange={(value) => update("asset_label", value)} />
                    <Input label="Asset plural" value={form.asset_label_plural} onChange={(value) => update("asset_label_plural", value)} />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                  <TagEditor title={`${form.job_label_plural || "Jobs"} you offer`} values={jobTypes} value={newJobType} setValue={setNewJobType} add={() => { if (newJobType.trim()) { setJobTypes([...jobTypes, newJobType.trim()]); setNewJobType(""); } }} remove={(value) => setJobTypes(jobTypes.filter((item) => item !== value))} placeholder="Add job type" />
                  <TagEditor title="Service zones" values={zones} value={newZone} setValue={setNewZone} add={() => { if (newZone.trim()) { setZones([...zones, newZone.trim()]); setNewZone(""); } }} remove={(value) => setZones(zones.filter((item) => item !== value))} placeholder="Add zone" />
                  <label className="block lg:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-[#475569]">Default warranty terms</span>
                    <textarea value={form.default_warranty} onChange={(e) => update("default_warranty", e.target.value)} rows={4} className="ff-input text-sm resize-none" placeholder="Optional warranty wording for generated documents" />
                  </label>
                </div>
              )}

              {step === 3 && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_260px]">
                  <div className="space-y-4">
                    <Input label="Brand color" value={form.brand_color} onChange={(value) => update("brand_color", value)} type="color" />
                    <Input label="PDF footer" value={form.pdf_footer} onChange={(value) => update("pdf_footer", value)} placeholder={`${form.company_name} - ${form.company_phone}`} />
                  </div>
                  <div className="overflow-hidden rounded-[14px] border border-[#E2E8F0]">
                    <div className="p-5 text-center text-white" style={{ backgroundColor: form.brand_color }}>
                      <p className="text-lg font-black">{form.company_name || "Company"}</p>
                      <p className="mt-1 text-xs text-white/80">DOCUMENT PREVIEW</p>
                    </div>
                    <div className="space-y-2 bg-white p-4 text-xs text-[#64748B]">
                      <div className="h-2 rounded bg-[#E2E8F0]" />
                      <div className="h-2 w-2/3 rounded bg-[#E2E8F0]" />
                      <div className="mt-4 text-[10px]">{form.pdf_footer || "Footer text"}</div>
                    </div>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {DOCUMENT_OPTIONS.map((doc) => {
                    const selected = enabledDocs.includes(doc.key);
                    return (
                      <button
                        key={doc.key}
                        type="button"
                        onClick={() => setEnabledDocs(selected ? enabledDocs.filter((item) => item !== doc.key) : [...enabledDocs, doc.key])}
                        className={`flex items-center justify-between rounded-[12px] border px-4 py-3 text-left text-sm transition-colors ${
                          selected ? "border-[#93C5FD] bg-[#EFF6FF] text-[#1D4ED8]" : "border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]"
                        }`}
                      >
                        <span className="font-semibold">{doc.label}</span>
                        {selected ? <Check className="h-4 w-4" /> : <X className="h-4 w-4 text-[#CBD5E1]" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {step === 5 && (
                <div className="grid grid-cols-1 gap-3">
                  {[
                    ["shared", "Use FieldFlow shared WhatsApp sender", "Fastest path for pilots and demos."],
                    ["managed", "Request managed branded WhatsApp number", "FieldFlow helps provision a dedicated sender."],
                    ["skip", "Skip WhatsApp setup for now", "Keep configuring the dashboard first."],
                  ].map(([value, label, description]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => update("whatsapp_setup_mode", value)}
                      className={`rounded-[14px] border p-4 text-left transition-colors ${
                        form.whatsapp_setup_mode === value ? "border-[#93C5FD] bg-[#EFF6FF]" : "border-[#E2E8F0] hover:bg-[#F8FAFC]"
                      }`}
                    >
                      <p className="text-sm font-bold text-[#0F172A]">{label}</p>
                      <p className="mt-1 text-xs text-[#64748B]">{description}</p>
                    </button>
                  ))}
                </div>
              )}

              {step === 6 && (
                <div className="grid gap-4 sm:grid-cols-3">
                  {[
                    ["Add a worker", "/admin/workers"],
                    ["Add a client", "/admin/clients"],
                    ["Create first job", "/admin/jobs"],
                  ].map(([label, href]) => (
                    <Link key={label} href={href} className="rounded-[14px] border border-[#E2E8F0] p-5 text-sm font-bold text-[#0F172A] hover:border-[#93C5FD] hover:bg-[#EFF6FF]">
                      {label}
                    </Link>
                  ))}
                  <p className="text-sm leading-6 text-[#64748B] sm:col-span-3">
                    You can finish onboarding now and add records from the dashboard, or open any setup screen above.
                  </p>
                </div>
              )}

              {step === 7 && (
                <div className="grid gap-3 text-sm">
                  <Review label="Company" value={form.company_name || "Not set"} />
                  <Review label="Industry" value={selectedIndustry.displayName} />
                  <Review label="Job types" value={`${jobTypes.length} configured`} />
                  <Review label="Zones" value={`${zones.length} configured`} />
                  <Review label="Documents" value={`${enabledDocs.length} enabled`} />
                  <Review label="WhatsApp" value={form.whatsapp_setup_mode} />
                </div>
              )}

              {error && (
                <div className="mt-5 rounded-[10px] border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-sm text-[#DC2626]">
                  {error}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-[#E2E8F0] px-5 py-4">
              <button
                type="button"
                onClick={() => setStep(Math.max(0, step - 1))}
                disabled={step === 0 || isPending}
                className="ff-btn-secondary inline-flex items-center gap-2 px-3 py-2 text-sm disabled:opacity-40"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
              {step === steps.length - 1 ? (
                <button type="button" onClick={finish} disabled={isPending} className="ff-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-60">
                  {isPending ? "Saving..." : "Finish setup"}
                  <Check className="h-4 w-4" />
                </button>
              ) : (
                <button type="button" onClick={next} disabled={isPending} className="ff-btn-primary inline-flex items-center gap-2 px-4 py-2.5 text-sm disabled:opacity-60">
                  {isPending ? "Saving..." : "Save and continue"}
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-[#475569]">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="ff-input text-sm" />
    </label>
  );
}

function TagEditor({
  title,
  values,
  value,
  setValue,
  add,
  remove,
  placeholder,
}: {
  title: string;
  values: string[];
  value: string;
  setValue: (value: string) => void;
  add: () => void;
  remove: (value: string) => void;
  placeholder: string;
}) {
  return (
    <div className="rounded-[14px] border border-[#E2E8F0] p-4">
      <h3 className="text-sm font-bold text-[#0F172A]">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((item) => (
          <span key={item} className="inline-flex items-center gap-1 rounded-full border border-[#DBEAFE] bg-[#EFF6FF] px-2.5 py-1 text-xs font-semibold text-[#2563EB]">
            {item}
            <button type="button" onClick={() => remove(item)}><X className="h-3 w-3" /></button>
          </span>
        ))}
        {values.length === 0 && <span className="text-xs text-[#94A3B8]">None added yet.</span>}
      </div>
      <div className="mt-3 flex gap-2">
        <input value={value} onChange={(event) => setValue(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }} placeholder={placeholder} className="ff-input text-sm" />
        <button type="button" onClick={add} className="ff-btn-primary px-3 py-2 text-sm">Add</button>
      </div>
    </div>
  );
}

function Review({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-[12px] border border-[#E2E8F0] px-4 py-3">
      <span className="font-semibold text-[#64748B]">{label}</span>
      <span className="font-bold text-[#0F172A]">{value}</span>
    </div>
  );
}
