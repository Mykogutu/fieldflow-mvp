"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { INDUSTRY_LIST, INDUSTRY_TEMPLATES, type IndustryKey } from "@/lib/industry-templates";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

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

const DOCUMENT_OPTIONS = [
  {
    key: "invoice",
    label: "Invoice",
    description: "Auto-generated PDF sent to the client when a job is completed",
  },
  {
    key: "job_card",
    label: "Job Card",
    description: "Full job record with timeline, worker details, and client verification",
  },
  {
    key: "warranty",
    label: "Warranty Certificate",
    description: "Warranty document issued to the client after job verification",
  },
  {
    key: "certificate",
    label: "Completion Certificate",
    description: "Formal service completion certificate (e.g. for installation jobs)",
  },
  {
    key: "quotation",
    label: "Quotation",
    description: "Price estimate sent to the client before work begins",
  },
];

export default function SettingsClient({ settings }: { settings: Record<string, string> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Industry + vocabulary
  const [industry, setIndustry] = useState<IndustryKey>(
    (settings.industry as IndustryKey) || "OTHER"
  );
  const [workerTitle, setWorkerTitle] = useState(settings.worker_title ?? "Technician");
  const [workerTitlePlural, setWorkerTitlePlural] = useState(
    settings.worker_title_plural ?? "Technicians"
  );
  const [jobLabel, setJobLabel] = useState(settings.job_label ?? "Job");
  const [jobLabelPlural, setJobLabelPlural] = useState(settings.job_label_plural ?? "Jobs");

  // Company
  const [companyName, setCompanyName] = useState(settings.company_name ?? "");
  const [companyPhone, setCompanyPhone] = useState(settings.company_phone ?? "");

  // Financial
  const [currency, setCurrency] = useState(settings.currency ?? "KES");
  const [defaultWarranty, setDefaultWarranty] = useState(settings.default_warranty ?? "");

  // Operations
  const [timezone, setTimezone] = useState(settings.timezone ?? "Africa/Nairobi");
  const [briefingHour, setBriefingHour] = useState(settings.briefing_hour ?? "6");

  // Brand
  const [brandColor, setBrandColor] = useState(settings.brand_color ?? "#2563eb");

  // Documents
  const DEFAULT_DOCS = ["invoice", "job_card", "warranty"];
  const [enabledDocs, setEnabledDocs] = useState<string[]>(
    safeJson<string[]>(settings.enabled_documents, DEFAULT_DOCS)
  );
  function toggleDoc(key: string) {
    setEnabledDocs((prev) =>
      prev.includes(key) ? prev.filter((d) => d !== key) : [...prev, key]
    );
  }

  // Lists
  const [jobTypes, setJobTypes] = useState<string[]>(
    safeJson<string[]>(settings.job_types, [])
  );
  const [zones, setZones] = useState<string[]>(safeJson<string[]>(settings.zones, []));
  const [newJobType, setNewJobType] = useState("");
  const [newZone, setNewZone] = useState("");

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
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workspace Settings</h1>
        <span
          className="inline-flex items-center gap-2 text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ backgroundColor: `${brandColor}1a`, color: brandColor }}
        >
          {currentTemplate.emoji} {currentTemplate.displayName}
        </span>
      </div>

      {saved && (
        <p className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">
          Settings saved
        </p>
      )}

      {/* MVP-STRATEGY §17 — Branded WhatsApp upsell card */}
      <a
        href="/admin/settings/whatsapp"
        className="block bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 hover:shadow-sm transition"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-green-900 flex items-center gap-2">
              💬 WhatsApp Senders
              <span className="text-[10px] uppercase tracking-wide bg-green-200 text-green-800 px-1.5 py-0.5 rounded">
                Branding
              </span>
            </h2>
            <p className="text-xs text-green-800/80 mt-1 leading-relaxed">
              Use FieldFlow's number for free, or get a dedicated WhatsApp
              Business number with your logo and verified name. Set up your
              tier and manage senders →
            </p>
          </div>
          <span className="text-green-700 text-2xl">→</span>
        </div>
      </a>

      {/* Industry Template */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Industry</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Picking an industry auto-fills the fields below. You can still edit anything.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {INDUSTRY_LIST.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => applyTemplate(t.key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm border transition-colors text-left ${
                industry === t.key
                  ? "border-blue-500 bg-blue-50 text-blue-700"
                  : "border-gray-200 bg-white text-gray-700 hover:border-blue-300"
              }`}
            >
              <span className="text-lg">{t.emoji}</span>
              <span className="font-medium truncate">{t.displayName}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Vocabulary */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Vocabulary</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Words used in WhatsApp messages and on the dashboard.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Worker title (singular)">
            <input
              value={workerTitle}
              onChange={(e) => setWorkerTitle(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Worker title (plural)">
            <input
              value={workerTitlePlural}
              onChange={(e) => setWorkerTitlePlural(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Job label (singular)">
            <input
              value={jobLabel}
              onChange={(e) => setJobLabel(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Job label (plural)">
            <input
              value={jobLabelPlural}
              onChange={(e) => setJobLabelPlural(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* Company */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Company</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Company name">
            <input
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={inputCls}
            />
          </Field>
          <Field label="Company phone">
            <input
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              className={inputCls}
            />
          </Field>
        </div>
      </section>

      {/* Financial */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Financial</h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Currency">
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className={inputCls}
            >
              {CURRENCY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Timezone">
            <input
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              placeholder="Africa/Nairobi"
              className={inputCls}
            />
          </Field>
        </div>
        <Field label="Default warranty text (optional — shown on warranty PDFs)">
          <textarea
            value={defaultWarranty}
            onChange={(e) => setDefaultWarranty(e.target.value)}
            rows={2}
            placeholder="30-day workmanship warranty on all repairs."
            className={inputCls}
          />
        </Field>
      </section>

      {/* Job Types */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">{jobLabelPlural} You Offer</h2>
        <div className="flex flex-wrap gap-2">
          {jobTypes.map((t) => (
            <span
              key={t}
              className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs"
            >
              {t}
              <button
                onClick={() => setJobTypes(jobTypes.filter((j) => j !== t))}
                className="text-blue-400 hover:text-red-500"
              >
                ✕
              </button>
            </span>
          ))}
          {jobTypes.length === 0 && (
            <span className="text-xs text-gray-400">No {jobLabelPlural.toLowerCase()} configured yet.</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newJobType}
            onChange={(e) => setNewJobType(e.target.value)}
            placeholder={`Add a ${jobLabel.toLowerCase()} type...`}
            className={`${inputCls} flex-1`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newJobType.trim()) {
                setJobTypes([...jobTypes, newJobType.trim()]);
                setNewJobType("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newJobType.trim()) {
                setJobTypes([...jobTypes, newJobType.trim()]);
                setNewJobType("");
              }
            }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            Add
          </button>
        </div>
      </section>

      {/* Zones */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Service Zones</h2>
        <div className="flex flex-wrap gap-2">
          {zones.map((z) => (
            <span
              key={z}
              className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs"
            >
              {z}
              <button
                onClick={() => setZones(zones.filter((z2) => z2 !== z))}
                className="text-green-400 hover:text-red-500"
              >
                ✕
              </button>
            </span>
          ))}
          {zones.length === 0 && (
            <span className="text-xs text-gray-400">No zones configured.</span>
          )}
        </div>
        <div className="flex gap-2">
          <input
            value={newZone}
            onChange={(e) => setNewZone(e.target.value)}
            placeholder="Add a zone..."
            className={`${inputCls} flex-1`}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newZone.trim()) {
                setZones([...zones, newZone.trim()]);
                setNewZone("");
              }
            }}
          />
          <button
            onClick={() => {
              if (newZone.trim()) {
                setZones([...zones, newZone.trim()]);
                setNewZone("");
              }
            }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm"
          >
            Add
          </button>
        </div>
      </section>

      {/* Documents */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900">Documents</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose which documents are generated and delivered for completed jobs.
          </p>
        </div>
        <div className="space-y-3">
          {DOCUMENT_OPTIONS.map((doc) => {
            const on = enabledDocs.includes(doc.key);
            return (
              <div
                key={doc.key}
                className="flex items-start justify-between gap-4 py-3 px-4 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-800">{doc.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{doc.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleDoc(doc.key)}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                    on ? "bg-blue-600" : "bg-gray-200"
                  }`}
                  role="switch"
                  aria-checked={on}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      on ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {/* Automations */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Automations</h2>
        <Field label={`Daily briefing hour (0-23, in ${timezone})`}>
          <input
            type="number"
            min={0}
            max={23}
            value={briefingHour}
            onChange={(e) => setBriefingHour(e.target.value)}
            className={inputCls}
          />
          <p className="text-xs text-gray-400 mt-1">
            {workerTitlePlural} receive WhatsApp briefings at this hour every morning.
          </p>
        </Field>
      </section>

      {/* Brand */}
      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Branding</h2>
        <Field label="Brand color (used on invoices & PDFs)">
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className="h-10 w-16 border border-gray-200 rounded-lg cursor-pointer"
            />
            <input
              value={brandColor}
              onChange={(e) => setBrandColor(e.target.value)}
              className={`${inputCls} max-w-[140px] font-mono text-xs`}
            />
          </div>
        </Field>
      </section>

      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending ? "Saving..." : "Save All Settings"}
        </button>
        <span className="text-xs text-gray-400">
          Changes apply to WhatsApp messages and PDFs immediately.
        </span>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      {children}
    </div>
  );
}

function safeJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
