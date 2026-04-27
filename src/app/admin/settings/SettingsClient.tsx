"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INDUSTRY_LIST, INDUSTRY_TEMPLATES, type IndustryKey } from "@/lib/industry-templates";
import {
  Settings, Layers, FileText, Zap, Palette, X, Plus, RotateCcw, Save,
  MessageCircle, Droplets, Gauge, Wrench, Wind, Sparkles, Bug, Sun, Plug,
  Truck, Shield, Hammer, Leaf, Car, Monitor, HelpCircle, Clipboard,
  ShieldCheck, Award, FileEdit, Check,
  type LucideIcon,
} from "lucide-react";

// ── Industry → lucide icon map ────────────────────────────────────────────────
const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  TANK_SERVICES:    Droplets,
  FUEL_TRACKER:     Gauge,
  PLUMBING:         Wrench,
  ELECTRICAL:       Zap,
  HVAC:             Wind,
  CLEANING:         Sparkles,
  PEST_CONTROL:     Bug,
  SOLAR:            Sun,
  APPLIANCE_REPAIR: Plug,
  LOGISTICS:        Truck,
  SECURITY:         Shield,
  HANDYMAN:         Hammer,
  LANDSCAPING:      Leaf,
  AUTO_REPAIR:      Car,
  IT_SUPPORT:       Monitor,
  OTHER:            HelpCircle,
};

// ── Constants ─────────────────────────────────────────────────────────────────
const CURRENCY_OPTIONS = [
  { code: "KES", label: "Kenyan Shilling (KES)" },
  { code: "USD", label: "US Dollar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "British Pound (GBP)" },
  { code: "NGN", label: "Nigerian Naira (NGN)" },
  { code: "GHS", label: "Ghanaian Cedi (GHS)" },
  { code: "ZAR", label: "South African Rand (ZAR)" },
  { code: "UGX", label: "Ugandan Shilling (UGX)" },
  { code: "TZS", label: "Tanzanian Shilling (TZS)" },
];

const TIMEZONE_OPTIONS = [
  "Africa/Nairobi", "Africa/Lagos", "Africa/Accra", "Africa/Cairo",
  "Africa/Johannesburg", "Europe/London", "America/New_York", "America/Los_Angeles",
];

const DOCUMENT_OPTIONS: {
  key: string; label: string; Icon: LucideIcon; iconBg: string; iconColor: string; description: string;
}[] = [
  { key: "invoice",     label: "Invoice",                Icon: FileText,    iconBg: "bg-blue-50",   iconColor: "text-blue-600",   description: "Auto-generated PDF sent to the client when a job is completed" },
  { key: "job_card",    label: "Job Card",               Icon: Clipboard,   iconBg: "bg-[#F1F5F9]", iconColor: "text-[#64748B]",  description: "Full job record with timeline, worker details, and client verification" },
  { key: "warranty",    label: "Warranty Certificate",   Icon: ShieldCheck, iconBg: "bg-blue-50",   iconColor: "text-[#2563EB]",  description: "Warranty document issued to the client after job verification" },
  { key: "certificate", label: "Completion Certificate", Icon: Award,       iconBg: "bg-green-50",  iconColor: "text-[#16A34A]",  description: "Formal service completion certificate (e.g. for installation jobs)" },
  { key: "quotation",   label: "Quotation",              Icon: FileEdit,    iconBg: "bg-amber-50",  iconColor: "text-[#D97706]",  description: "Price estimate sent to the client before work begins" },
];

type Tab = "general" | "operations" | "documents" | "automations" | "branding";
const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "general",     label: "General",     Icon: Settings  },
  { id: "operations",  label: "Operations",  Icon: Layers    },
  { id: "documents",   label: "Documents",   Icon: FileText  },
  { id: "automations", label: "Automations", Icon: Zap       },
  { id: "branding",    label: "Branding",    Icon: Palette   },
];

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} role="switch" aria-checked={on}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:ring-offset-1
        ${on ? "bg-[#2563EB]" : "bg-[#E2E8F0]"}`}>
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out
        ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// ── Tag list ──────────────────────────────────────────────────────────────────
function TagList({ tags, onRemove, newValue, onNewChange, onAdd, placeholder, color = "blue" }: {
  tags: string[]; onRemove: (t: string) => void;
  newValue: string; onNewChange: (v: string) => void;
  onAdd: () => void; placeholder: string; color?: "blue" | "green";
}) {
  const pill = color === "green"
    ? "bg-green-50 text-green-700 border border-green-100"
    : "bg-blue-50 text-[#2563EB] border border-blue-100";
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2 min-h-[1.5rem]">
        {tags.map(t => (
          <span key={t} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${pill}`}>
            {t}
            <button onClick={() => onRemove(t)} className="ml-0.5 hover:text-[#DC2626] transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs text-[#94A3B8]">None configured.</span>}
      </div>
      <div className="flex gap-2">
        <input value={newValue} onChange={e => onNewChange(e.target.value)}
          placeholder={placeholder} className="ff-input flex-1 text-sm"
          onKeyDown={e => { if (e.key === "Enter" && newValue.trim()) onAdd(); }} />
        <button onClick={onAdd}
          className="ff-btn-primary flex items-center gap-1 px-3 py-2 text-sm shrink-0">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );
}

// ── Section & Field wrappers ──────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
        {subtitle && <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#475569] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function safeJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

// ── Card wrapper ──────────────────────────────────────────────────────────────
function SettingCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-5 space-y-4 ${className}`}>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsClient({ settings }: { settings: Record<string, string> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("general");

  // Industry
  const [industry, setIndustry]               = useState<IndustryKey>((settings.industry as IndustryKey) || "OTHER");
  const [workerTitle, setWorkerTitle]         = useState(settings.worker_title ?? "Technician");
  const [workerTitlePlural, setWorkerTitlePlural] = useState(settings.worker_title_plural ?? "Technicians");
  const [jobLabel, setJobLabel]               = useState(settings.job_label ?? "Job");
  const [jobLabelPlural, setJobLabelPlural]   = useState(settings.job_label_plural ?? "Jobs");

  // Company
  const [companyName, setCompanyName]           = useState(settings.company_name ?? "");
  const [companyPhone, setCompanyPhone]         = useState(settings.company_phone ?? "");
  const [supportEmail, setSupportEmail]         = useState(settings.support_email ?? "");
  const [businessLocation, setBusinessLocation] = useState(settings.business_location ?? "");

  // Financial
  const [currency, setCurrency]               = useState(settings.currency ?? "KES");
  const [timezone, setTimezone]               = useState(settings.timezone ?? "Africa/Nairobi");
  const [defaultWarranty, setDefaultWarranty] = useState(settings.default_warranty ?? "");

  // Automations
  const [briefingHour, setBriefingHour] = useState(settings.briefing_hour ?? "6");

  // Brand
  const [brandColor, setBrandColor] = useState(settings.brand_color ?? "#2563eb");

  // Documents
  const DEFAULT_DOCS = ["invoice", "job_card", "warranty"];
  const [enabledDocs, setEnabledDocs] = useState<string[]>(safeJson<string[]>(settings.enabled_documents, DEFAULT_DOCS));
  function toggleDoc(key: string) {
    setEnabledDocs(prev => prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key]);
  }

  // Lists
  const [jobTypes, setJobTypes]     = useState<string[]>(safeJson<string[]>(settings.job_types, []));
  const [zones, setZones]           = useState<string[]>(safeJson<string[]>(settings.zones, []));
  const [newJobType, setNewJobType] = useState("");
  const [newZone, setNewZone]       = useState("");

  const currentTemplate = INDUSTRY_TEMPLATES[industry] ?? INDUSTRY_TEMPLATES.OTHER;

  function applyTemplate(key: IndustryKey) {
    const t = INDUSTRY_TEMPLATES[key] ?? INDUSTRY_TEMPLATES.OTHER;
    setIndustry(key);
    setWorkerTitle(t.workerTitle);
    setWorkerTitlePlural(t.workerTitlePlural);
    setJobLabel(t.jobLabel);
    setJobLabelPlural(t.jobLabelPlural);
    setJobTypes(t.jobTypes);
    setDefaultWarranty(t.defaultWarranty ?? "");
    if (t.currencyHint) setCurrency(t.currencyHint);
  }

  async function handleSave() {
    startTransition(async () => {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          industry,
          worker_title: workerTitle,
          worker_title_plural: workerTitlePlural,
          job_label: jobLabel,
          job_label_plural: jobLabelPlural,
          company_name: companyName,
          company_phone: companyPhone,
          support_email: supportEmail,
          business_location: businessLocation,
          currency,
          currency_symbol: currency,
          default_warranty: defaultWarranty,
          timezone,
          briefing_hour: briefingHour,
          brand_color: brandColor,
          emoji: currentTemplate.emoji,
          job_types: JSON.stringify(jobTypes),
          zones: JSON.stringify(zones),
          enabled_documents: JSON.stringify(enabledDocs),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="ff-page-title">Workspace Settings</h1>
          <p className="ff-page-desc">Manage preferences, documents, branding, and automations.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => router.refresh()}
            className="ff-btn-secondary inline-flex items-center gap-2 text-sm px-3 py-2">
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
          <button onClick={handleSave} disabled={isPending}
            className="ff-btn-primary inline-flex items-center gap-2 text-sm px-4 py-2 disabled:opacity-50">
            {isPending ? (
              <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : saved ? (
              <Check className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            <span className="hidden sm:inline">{isPending ? "Saving…" : saved ? "Saved!" : "Save all"}</span>
          </button>
        </div>
      </div>

      {saved && (
        <div className="text-sm bg-green-50 border border-green-200 text-[#16A34A] px-4 py-2.5 rounded-[10px] flex items-center gap-2">
          <Check className="w-4 h-4" /> Settings saved successfully
        </div>
      )}

      {/* ── Tab bar + card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-[#E2E8F0] px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-0 min-w-max">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`ff-tab ${tab === id ? "ff-tab-active" : "ff-tab-inactive"}`}>
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="p-5">

          {/* ── General ── */}
          {tab === "general" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left */}
              <div className="space-y-5">
                {/* WhatsApp Senders banner */}
                <a href="/admin/settings/whatsapp"
                  className="block bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-[14px] p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-green-100 flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-green-900">WhatsApp Senders</h3>
                        <span className="text-[10px] uppercase tracking-wide font-bold bg-green-200 text-green-800 px-1.5 py-0.5 rounded-[4px]">Branding</span>
                      </div>
                      <p className="text-xs text-green-800/70 leading-relaxed">
                        Use FieldFlow&apos;s shared number for free, or connect a dedicated WhatsApp Business number with your brand name.
                      </p>
                      <span className="text-xs text-green-700 font-semibold mt-2 inline-block">Set up sender →</span>
                    </div>
                  </div>
                </a>

                {/* Vocabulary */}
                <SettingCard>
                  <Section title="Vocabulary / Terminology" subtitle="Words used in WhatsApp messages and across the platform.">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Worker (singular)">
                        <input value={workerTitle} onChange={e => setWorkerTitle(e.target.value)} className="ff-input text-sm" />
                      </Field>
                      <Field label="Worker (plural)">
                        <input value={workerTitlePlural} onChange={e => setWorkerTitlePlural(e.target.value)} className="ff-input text-sm" />
                      </Field>
                      <Field label="Job label (singular)">
                        <input value={jobLabel} onChange={e => setJobLabel(e.target.value)} className="ff-input text-sm" />
                      </Field>
                      <Field label="Job label (plural)">
                        <input value={jobLabelPlural} onChange={e => setJobLabelPlural(e.target.value)} className="ff-input text-sm" />
                      </Field>
                    </div>
                  </Section>
                </SettingCard>

                {/* Company */}
                <SettingCard>
                  <Section title="Company">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Company name">
                        <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="ff-input text-sm" />
                      </Field>
                      <Field label="Company phone">
                        <input value={companyPhone} onChange={e => setCompanyPhone(e.target.value)} placeholder="+254…" className="ff-input text-sm" />
                      </Field>
                      <Field label="Support email">
                        <input value={supportEmail} onChange={e => setSupportEmail(e.target.value)} type="email" placeholder="support@…" className="ff-input text-sm" />
                      </Field>
                      <Field label="Business location">
                        <input value={businessLocation} onChange={e => setBusinessLocation(e.target.value)} placeholder="Nairobi, Kenya" className="ff-input text-sm" />
                      </Field>
                    </div>
                  </Section>
                </SettingCard>

                {/* Financial */}
                <SettingCard>
                  <Section title="Financial & Regional">
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Currency">
                        <select value={currency} onChange={e => setCurrency(e.target.value)} className="ff-input text-sm">
                          {CURRENCY_OPTIONS.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
                        </select>
                      </Field>
                      <Field label="Timezone">
                        <select value={timezone} onChange={e => setTimezone(e.target.value)} className="ff-input text-sm">
                          {TIMEZONE_OPTIONS.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                        </select>
                      </Field>
                    </div>
                    <Field label="Default warranty text (optional)">
                      <textarea value={defaultWarranty} onChange={e => setDefaultWarranty(e.target.value)} rows={2}
                        placeholder="Warranty applies as per device, installation, and service terms."
                        className="ff-input text-sm resize-none" />
                    </Field>
                  </Section>
                </SettingCard>
              </div>

              {/* Right */}
              <div className="space-y-5">
                {/* Industry preset */}
                <SettingCard>
                  <Section title="Industry Preset" subtitle="Auto-fills labels, defaults, and job type recommendations.">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {INDUSTRY_LIST.map(t => {
                        const Icon = INDUSTRY_ICONS[t.key] ?? HelpCircle;
                        const active = industry === t.key;
                        return (
                          <button key={t.key} type="button" onClick={() => applyTemplate(t.key)}
                            className={`flex items-center gap-2 px-2.5 py-2.5 rounded-[10px] text-xs border transition-all text-left
                              ${active
                                ? "border-[#2563EB] bg-blue-50 text-[#2563EB] font-semibold"
                                : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2563EB]/30 hover:bg-blue-50/30"
                              }`}>
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-[#2563EB]" : "text-[#94A3B8]"}`} />
                            <span className="truncate">{t.displayName}</span>
                            {active && <span className="ml-auto w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                </SettingCard>

                {/* Job types */}
                <SettingCard>
                  <Section title={`${jobLabelPlural} You Offer`}>
                    <TagList
                      tags={jobTypes}
                      onRemove={t => setJobTypes(jobTypes.filter(j => j !== t))}
                      newValue={newJobType} onNewChange={setNewJobType}
                      onAdd={() => { if (newJobType.trim()) { setJobTypes([...jobTypes, newJobType.trim()]); setNewJobType(""); } }}
                      placeholder={`Add a ${jobLabel.toLowerCase()} type…`}
                      color="blue"
                    />
                  </Section>
                </SettingCard>

                {/* Zones */}
                <SettingCard>
                  <Section title="Service Zones">
                    <TagList
                      tags={zones}
                      onRemove={z => setZones(zones.filter(z2 => z2 !== z))}
                      newValue={newZone} onNewChange={setNewZone}
                      onAdd={() => { if (newZone.trim()) { setZones([...zones, newZone.trim()]); setNewZone(""); } }}
                      placeholder="Add a zone…"
                      color="green"
                    />
                  </Section>
                </SettingCard>

                {/* Automations */}
                <SettingCard>
                  <Section title="Automations">
                    <Field label={`Daily briefing hour (0–23, ${timezone})`}>
                      <input type="number" min={0} max={23} value={briefingHour}
                        onChange={e => setBriefingHour(e.target.value)} className="ff-input text-sm" />
                    </Field>
                    <p className="text-xs text-[#94A3B8]">
                      {workerTitlePlural} receive a WhatsApp briefing at this hour every morning.
                    </p>
                  </Section>
                </SettingCard>

                {/* Branding */}
                <SettingCard>
                  <Section title="Branding">
                    <div className="space-y-3">
                      <Field label="Brand color (used on invoices & PDFs)">
                        <div className="flex items-center gap-2">
                          <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                            className="h-9 w-9 border border-[#E2E8F0] rounded-[8px] cursor-pointer p-0.5" />
                          <input value={brandColor} onChange={e => setBrandColor(e.target.value)}
                            className="ff-input text-sm font-mono w-28" />
                          <div className="w-9 h-9 rounded-[8px] border border-[#E2E8F0] shrink-0" style={{ backgroundColor: brandColor }} />
                        </div>
                      </Field>
                      <Field label="Workspace logo">
                        <div className="flex items-center gap-3 p-3 border border-[#E2E8F0] rounded-[12px]">
                          <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 text-white font-extrabold text-sm"
                            style={{ backgroundColor: brandColor }}>F</div>
                          <div>
                            <button className="text-xs text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
                              Change logo
                            </button>
                            <p className="text-[10px] text-[#94A3B8] mt-0.5">PNG, JPG or SVG. Max 2MB.</p>
                          </div>
                        </div>
                      </Field>
                    </div>
                  </Section>
                </SettingCard>
              </div>
            </div>
          )}

          {/* ── Operations ── */}
          {tab === "operations" && (
            <div className="py-16 flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                <Layers className="w-6 h-6 text-[#94A3B8]" />
              </div>
              <p className="text-sm font-semibold text-[#475569]">Operations settings coming soon</p>
              <p className="text-xs text-[#94A3B8]">SLA rules, assignment logic, and workflow customisation.</p>
            </div>
          )}

          {/* ── Documents ── */}
          {tab === "documents" && (
            <div className="max-w-xl space-y-4">
              <Section title="Document Generation" subtitle="Choose which documents are generated and delivered for completed jobs.">
                <div className="space-y-2">
                  {DOCUMENT_OPTIONS.map(doc => {
                    const on = enabledDocs.includes(doc.key);
                    return (
                      <div key={doc.key}
                        className="flex items-center justify-between gap-3 py-3 px-4 rounded-[12px] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${doc.iconBg}`}>
                            <doc.Icon className={`w-4 h-4 ${doc.iconColor}`} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">{doc.label}</p>
                            <p className="text-xs text-[#94A3B8] mt-0.5">{doc.description}</p>
                          </div>
                        </div>
                        <Toggle on={on} onToggle={() => toggleDoc(doc.key)} />
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>
          )}

          {/* ── Automations ── */}
          {tab === "automations" && (
            <div className="max-w-md space-y-5">
              <Section title="Scheduled Automations" subtitle="Configure automated messages and tasks.">
                <SettingCard>
                  <Field label={`Daily briefing hour (0–23, ${timezone})`}>
                    <input type="number" min={0} max={23} value={briefingHour}
                      onChange={e => setBriefingHour(e.target.value)} className="ff-input text-sm" />
                  </Field>
                  <p className="text-xs text-[#94A3B8]">
                    {workerTitlePlural} receive WhatsApp briefing messages every morning at this hour.
                  </p>
                </SettingCard>
              </Section>
            </div>
          )}

          {/* ── Branding ── */}
          {tab === "branding" && (
            <div className="max-w-md space-y-5">
              <SettingCard>
                <Section title="Brand Color">
                  <div className="flex items-center gap-3">
                    <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                      className="h-10 w-16 border border-[#E2E8F0] rounded-[8px] cursor-pointer p-0.5" />
                    <input value={brandColor} onChange={e => setBrandColor(e.target.value)}
                      className="ff-input text-sm font-mono w-32" />
                    <div className="w-10 h-10 rounded-[10px] border border-[#E2E8F0]"
                      style={{ backgroundColor: brandColor }} />
                  </div>
                </Section>
              </SettingCard>
              <SettingCard>
                <Section title="Workspace Logo">
                  <div className="flex items-center gap-4 p-4 border-2 border-dashed border-[#E2E8F0] rounded-[12px]">
                    <div className="w-12 h-12 rounded-[12px] flex items-center justify-center shrink-0 text-white font-extrabold"
                      style={{ backgroundColor: brandColor }}>F</div>
                    <div>
                      <button className="text-sm text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
                        Upload new logo
                      </button>
                      <p className="text-xs text-[#94A3B8] mt-0.5">PNG, JPG or SVG. Max 2MB.</p>
                    </div>
                  </div>
                </Section>
              </SettingCard>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
