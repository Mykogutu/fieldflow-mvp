"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INDUSTRY_LIST, INDUSTRY_TEMPLATES, type IndustryKey } from "@/lib/industry-templates";
import {
  Settings, Layers, FileText, Zap, Palette, X, Plus, RotateCcw, Save, MessageCircle,
  Droplets, Gauge, Wrench, Wind, Sparkles, Bug, Sun, Plug, Truck, Shield,
  Hammer, Leaf, Car, Monitor, HelpCircle, type LucideIcon,
} from "lucide-react";

// ── Industry → lucide icon map ────────────────────────────────────────────────
const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  TANK_SERVICES:   Droplets,
  FUEL_TRACKER:    Gauge,
  PLUMBING:        Wrench,
  ELECTRICAL:      Zap,
  HVAC:            Wind,
  CLEANING:        Sparkles,
  PEST_CONTROL:    Bug,
  SOLAR:           Sun,
  APPLIANCE_REPAIR:Plug,
  LOGISTICS:       Truck,
  SECURITY:        Shield,
  HANDYMAN:        Hammer,
  LANDSCAPING:     Leaf,
  AUTO_REPAIR:     Car,
  IT_SUPPORT:      Monitor,
  OTHER:           HelpCircle,
};

// ── Design tokens ─────────────────────────────────────────────────────────────
const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-900 placeholder:text-slate-400";

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

const DOCUMENT_OPTIONS = [
  { key: "invoice",     label: "Invoice",                icon: "📄", description: "Auto-generated PDF sent to the client when a job is completed" },
  { key: "job_card",    label: "Job Card",               icon: "📋", description: "Full job record with timeline, worker details, and client verification" },
  { key: "warranty",    label: "Warranty Certificate",   icon: "🛡️", description: "Warranty document issued to the client after job verification" },
  { key: "certificate", label: "Completion Certificate", icon: "✅", description: "Formal service completion certificate (e.g. for installation jobs)" },
  { key: "quotation",   label: "Quotation",              icon: "📝", description: "Price estimate sent to the client before work begins" },
];

type Tab = "general" | "operations" | "documents" | "automations" | "branding";
const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "general",     label: "General",     Icon: Settings     },
  { id: "operations",  label: "Operations",  Icon: Layers       },
  { id: "documents",   label: "Documents",   Icon: FileText     },
  { id: "automations", label: "Automations", Icon: Zap          },
  { id: "branding",    label: "Branding",    Icon: Palette      },
];

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
        on ? "bg-blue-600" : "bg-gray-200"
      }`}
      role="switch"
      aria-checked={on}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${on ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

// ── Tag input list ────────────────────────────────────────────────────────────
function TagList({
  tags,
  onRemove,
  newValue,
  onNewChange,
  onAdd,
  placeholder,
  color = "blue",
}: {
  tags: string[];
  onRemove: (t: string) => void;
  newValue: string;
  onNewChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
  color?: "blue" | "green";
}) {
  const pill = color === "green"
    ? "bg-green-50 text-green-700 border border-green-100"
    : "bg-blue-50 text-blue-700 border border-blue-100";
  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span key={t} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${pill}`}>
            {t}
            <button onClick={() => onRemove(t)} className="ml-0.5 hover:text-red-500 transition-colors">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-xs text-slate-400">None configured.</span>}
      </div>
      <div className="flex gap-2">
        <input
          value={newValue}
          onChange={(e) => onNewChange(e.target.value)}
          placeholder={placeholder}
          className={`${inputCls} flex-1`}
          onKeyDown={(e) => { if (e.key === "Enter" && newValue.trim()) { onAdd(); } }}
        />
        <button
          onClick={onAdd}
          className="inline-flex items-center gap-1 bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Add
        </button>
      </div>
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
    </div>
  );
}

function safeJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SettingsClient({ settings }: { settings: Record<string, string> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("general");

  // Industry + vocabulary
  const [industry, setIndustry] = useState<IndustryKey>((settings.industry as IndustryKey) || "OTHER");
  const [workerTitle, setWorkerTitle] = useState(settings.worker_title ?? "Technician");
  const [workerTitlePlural, setWorkerTitlePlural] = useState(settings.worker_title_plural ?? "Technicians");
  const [jobLabel, setJobLabel] = useState(settings.job_label ?? "Job");
  const [jobLabelPlural, setJobLabelPlural] = useState(settings.job_label_plural ?? "Jobs");

  // Company
  const [companyName, setCompanyName]           = useState(settings.company_name ?? "");
  const [companyPhone, setCompanyPhone]         = useState(settings.company_phone ?? "");
  const [supportEmail, setSupportEmail]         = useState(settings.support_email ?? "");
  const [businessLocation, setBusinessLocation] = useState(settings.business_location ?? "");

  // Financial
  const [currency, setCurrency]             = useState(settings.currency ?? "KES");
  const [timezone, setTimezone]             = useState(settings.timezone ?? "Africa/Nairobi");
  const [defaultWarranty, setDefaultWarranty] = useState(settings.default_warranty ?? "");

  // Automations
  const [briefingHour, setBriefingHour] = useState(settings.briefing_hour ?? "6");

  // Brand
  const [brandColor, setBrandColor] = useState(settings.brand_color ?? "#2563eb");

  // Documents
  const DEFAULT_DOCS = ["invoice", "job_card", "warranty"];
  const [enabledDocs, setEnabledDocs] = useState<string[]>(safeJson<string[]>(settings.enabled_documents, DEFAULT_DOCS));
  function toggleDoc(key: string) {
    setEnabledDocs((prev) => prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]);
  }

  // Lists
  const [jobTypes, setJobTypes] = useState<string[]>(safeJson<string[]>(settings.job_types, []));
  const [zones, setZones]       = useState<string[]>(safeJson<string[]>(settings.zones, []));
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

  function resetChanges() {
    // Reset to last saved (just reload)
    router.refresh();
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
      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Workspace Settings</h1>
          <p className="text-xs text-slate-400 mt-0.5">Manage your workspace preferences, documents, branding, and automations.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={resetChanges}
            className="inline-flex items-center gap-2 bg-white border border-gray-200 text-slate-700 px-3.5 py-2 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset changes
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isPending ? "Saving..." : "Save all settings"}
          </button>
        </div>
      </div>

      {saved && (
        <p className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2.5 rounded-xl">
          ✓ Settings saved successfully
        </p>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ── General tab ── */}
      {tab === "general" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Left column */}
          <div className="space-y-5">
            {/* WhatsApp Senders */}
            <a
              href="/admin/settings/whatsapp"
              className="block bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-green-900">WhatsApp Senders</h3>
                    <span className="text-[10px] uppercase tracking-wide font-bold bg-green-200 text-green-800 px-1.5 py-0.5 rounded">Branding</span>
                  </div>
                  <p className="text-xs text-green-800/70 mt-1 leading-relaxed">
                    Use FieldFlow's shared number for free, or connect a dedicated WhatsApp Business number with your brand name and verified sender profile.
                  </p>
                  <span className="text-xs text-green-700 font-medium mt-2 inline-block">Set up sender →</span>
                </div>
              </div>
            </a>

            {/* Vocabulary */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <Section title="Vocabulary / Terminology" subtitle="Words used in WhatsApp messages and across the platform.">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Worker title (singular)">
                    <input value={workerTitle} onChange={(e) => setWorkerTitle(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Worker title (plural)">
                    <input value={workerTitlePlural} onChange={(e) => setWorkerTitlePlural(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Job label (singular)">
                    <input value={jobLabel} onChange={(e) => setJobLabel(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Job label (plural)">
                    <input value={jobLabelPlural} onChange={(e) => setJobLabelPlural(e.target.value)} className={inputCls} />
                  </Field>
                </div>
              </Section>
            </div>

            {/* Company */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <Section title="Company">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Company name">
                    <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
                  </Field>
                  <Field label="Company phone">
                    <input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} placeholder="+254..." className={inputCls} />
                  </Field>
                  <Field label="Support email">
                    <input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} type="email" placeholder="support@..." className={inputCls} />
                  </Field>
                  <Field label="Business location">
                    <input value={businessLocation} onChange={(e) => setBusinessLocation(e.target.value)} placeholder="Nairobi, Kenya" className={inputCls} />
                  </Field>
                </div>
              </Section>
            </div>

            {/* Financial & Regional */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <Section title="Financial & Regional">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Currency">
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
                      {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Timezone">
                    <select value={timezone} onChange={(e) => setTimezone(e.target.value)} className={inputCls}>
                      {TIMEZONE_OPTIONS.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Default warranty text (optional)">
                  <textarea value={defaultWarranty} onChange={(e) => setDefaultWarranty(e.target.value)} rows={2}
                    placeholder="Warranty applies as per device, installation, and service terms." className={inputCls} />
                </Field>
              </Section>
            </div>

            {/* Documents */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <Section title="Documents" subtitle="Choose which documents are generated and delivered for completed jobs.">
                <div className="space-y-2">
                  {DOCUMENT_OPTIONS.map((doc) => {
                    const on = enabledDocs.includes(doc.key);
                    return (
                      <div key={doc.key} className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base">{doc.icon}</span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800">{doc.label}</p>
                            <p className="text-[10px] text-slate-400 truncate">{doc.description}</p>
                          </div>
                        </div>
                        <Toggle on={on} onToggle={() => toggleDoc(doc.key)} />
                      </div>
                    );
                  })}
                </div>
              </Section>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Industry Preset */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <Section title="Industry Preset" subtitle="Presets help us auto-fill labels, defaults, and recommendations.">
                <div className="grid grid-cols-3 gap-2">
                  {INDUSTRY_LIST.map((t) => {
                    const Icon = INDUSTRY_ICONS[t.key] ?? HelpCircle;
                    const active = industry === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => applyTemplate(t.key)}
                        className={`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs border transition-all text-left ${
                          active
                            ? "border-blue-500 bg-blue-50 text-blue-700 font-semibold"
                            : "border-gray-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/50"
                        }`}
                      >
                        <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
                        <span className="truncate">{t.displayName}</span>
                        {active && <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </Section>
            </div>

            {/* Jobs You Offer */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <Section title={`${jobLabelPlural} You Offer`}>
                <TagList
                  tags={jobTypes}
                  onRemove={(t) => setJobTypes(jobTypes.filter((j) => j !== t))}
                  newValue={newJobType}
                  onNewChange={setNewJobType}
                  onAdd={() => { if (newJobType.trim()) { setJobTypes([...jobTypes, newJobType.trim()]); setNewJobType(""); } }}
                  placeholder={`Add a ${jobLabel.toLowerCase()} type...`}
                  color="blue"
                />
              </Section>
            </div>

            {/* Service Zones */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <Section title="Service Zones">
                <TagList
                  tags={zones}
                  onRemove={(z) => setZones(zones.filter((z2) => z2 !== z))}
                  newValue={newZone}
                  onNewChange={setNewZone}
                  onAdd={() => { if (newZone.trim()) { setZones([...zones, newZone.trim()]); setNewZone(""); } }}
                  placeholder="Add a zone..."
                  color="green"
                />
              </Section>
            </div>

            {/* Automations */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <Section title="Automations">
                <Field label={`Daily briefing hour (0-23, ${timezone})`}>
                  <input
                    type="number" min={0} max={23}
                    value={briefingHour}
                    onChange={(e) => setBriefingHour(e.target.value)}
                    className={inputCls}
                  />
                </Field>
                <p className="text-xs text-slate-400">
                  {workerTitlePlural} receive WhatsApp briefing messages every morning.
                </p>
              </Section>
            </div>

            {/* Branding */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <Section title="Branding">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-2">Brand color (used on invoices & PDFs)</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="h-10 w-10 border border-gray-200 rounded-lg cursor-pointer p-0.5"
                      />
                      <input
                        value={brandColor}
                        onChange={(e) => setBrandColor(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2.5 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-24"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-slate-600 mb-2">Workspace logo</p>
                    <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
                        <span className="text-white font-extrabold text-sm">F</span>
                      </div>
                      <button className="text-xs text-blue-600 font-medium hover:text-blue-700 transition-colors">
                        Change logo
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">PNG, JPG or SVG. Max 2MB.</p>
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </div>
      )}

      {/* ── Operations tab ── */}
      {tab === "operations" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-slate-400 text-center py-8">Operations settings coming soon.</p>
        </div>
      )}

      {/* ── Documents tab ── */}
      {tab === "documents" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-4">
          <Section title="Document Generation" subtitle="Choose which documents are generated and delivered for completed jobs.">
            <div className="space-y-2">
              {DOCUMENT_OPTIONS.map((doc) => {
                const on = enabledDocs.includes(doc.key);
                return (
                  <div key={doc.key} className="flex items-center justify-between gap-3 py-3 px-4 rounded-lg border border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">{doc.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-slate-800">{doc.label}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{doc.description}</p>
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

      {/* ── Automations tab ── */}
      {tab === "automations" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-4">
          <Section title="Scheduled Automations" subtitle="Configure automated messages and tasks.">
            <Field label={`Daily briefing hour (0-23, ${timezone})`}>
              <input type="number" min={0} max={23} value={briefingHour} onChange={(e) => setBriefingHour(e.target.value)} className={inputCls} />
            </Field>
            <p className="text-xs text-slate-400">{workerTitlePlural} receive WhatsApp briefing messages every morning at this hour.</p>
          </Section>
        </div>
      )}

      {/* ── Branding tab ── */}
      {tab === "branding" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-xl space-y-5">
          <Section title="Brand Color">
            <div className="flex items-center gap-3">
              <input type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="h-10 w-16 border border-gray-200 rounded-lg cursor-pointer p-0.5" />
              <input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 w-32" />
            </div>
          </Section>
          <Section title="Workspace Logo">
            <div className="flex items-center gap-4 p-4 border-2 border-dashed border-gray-200 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center">
                <span className="text-white font-extrabold">F</span>
              </div>
              <div>
                <button className="text-sm text-blue-600 font-medium hover:text-blue-700">Upload new logo</button>
                <p className="text-xs text-slate-400 mt-0.5">PNG, JPG or SVG. Max 2MB.</p>
              </div>
            </div>
          </Section>
        </div>
      )}
    </div>
  );
}
