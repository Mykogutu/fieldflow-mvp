"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Mail, Phone, MapPin, Globe, DollarSign, Calendar, Clock,
  Shield, Smartphone, Eye, LayoutGrid, List, Lock, Activity,
  Languages, Bell, BellOff, Save, Edit2, ExternalLink,
  HelpCircle, Users, CreditCard, Plug, Database, Trash2,
  Download, Upload, Check, ChevronRight, X, Plus,
  Droplets, Gauge, Wrench, Zap, Wind, Sparkles, Bug, Sun,
  Truck, Hammer, Leaf, Car, Monitor, MessageCircle,
  type LucideIcon,
} from "lucide-react";
import { INDUSTRY_LIST, INDUSTRY_TEMPLATES, type IndustryKey } from "@/lib/industry-templates";

// ── Constants ─────────────────────────────────────────────────────────────────
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

// ── Tab config ────────────────────────────────────────────────────────────────
type Tab = "general" | "company" | "users" | "billing" | "integrations" | "data";
const TABS: { id: Tab; label: string }[] = [
  { id: "general",      label: "General"       },
  { id: "company",      label: "Company"       },
  { id: "users",        label: "Users & Roles" },
  { id: "billing",      label: "Billing"       },
  { id: "integrations", label: "Integrations"  },
  { id: "data",         label: "Data & Privacy"},
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

// ── Toggle ────────────────────────────────────────────────────────────────────
function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} role="switch" aria-checked={on}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200
        ${on ? "bg-[#2563EB]" : "bg-[#E2E8F0]"}`}>
      <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition duration-200 ease-in-out
        ${on ? "translate-x-4" : "translate-x-0"}`} />
    </button>
  );
}

// ── Setting Row ───────────────────────────────────────────────────────────────
function SettingRow({ icon: Icon, label, value, onEdit }: {
  icon: React.ElementType; label: string; value: string; onEdit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-[#F1F5F9] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-[8px] bg-[#F1F5F9] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#64748B]" />
        </div>
        <div className="min-w-0">
          <p className="text-[11px] text-[#94A3B8] font-medium">{label}</p>
          <p className="text-sm font-semibold text-[#0F172A] truncate">{value || "—"}</p>
        </div>
      </div>
      {onEdit && (
        <button onClick={onEdit}
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB]/40 hover:text-[#2563EB] hover:bg-blue-50/30 transition-colors">
          <Edit2 className="w-3 h-3" /> Edit
        </button>
      )}
    </div>
  );
}

// ── Security Row ──────────────────────────────────────────────────────────────
function SecurityRow({ icon: Icon, label, subtitle, action }: {
  icon: React.ElementType; label: string; subtitle: string; action: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-[#F1F5F9] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-[8px] bg-[#F1F5F9] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#64748B]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
          <p className="text-[11px] text-[#94A3B8]">{subtitle}</p>
        </div>
      </div>
      <button className="shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB]/40 hover:text-[#2563EB] hover:bg-blue-50/30 transition-colors whitespace-nowrap">
        {action}
      </button>
    </div>
  );
}

// ── Toggle Row ─────────────────────────────────────────────────────────────────
function ToggleRow({ icon: Icon, label, subtitle, defaultOn }: {
  icon: React.ElementType; label: string; subtitle: string; defaultOn: boolean;
}) {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-[#F1F5F9] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-[8px] bg-[#F1F5F9] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#64748B]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
          <p className="text-[11px] text-[#94A3B8]">{subtitle}</p>
        </div>
      </div>
      <Toggle on={on} onToggle={() => setOn(v => !v)} />
    </div>
  );
}

// ── Select Row ─────────────────────────────────────────────────────────────────
function SelectRow({ icon: Icon, label, subtitle, options, defaultValue }: {
  icon: React.ElementType; label: string; subtitle: string; options: string[]; defaultValue: string;
}) {
  const [val, setVal] = useState(defaultValue);
  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-[#F1F5F9] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-[8px] bg-[#F1F5F9] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[#64748B]" />
        </div>
        <div>
          <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
          <p className="text-[11px] text-[#94A3B8]">{subtitle}</p>
        </div>
      </div>
      <select value={val} onChange={e => setVal(e.target.value)}
        className="shrink-0 text-xs border border-[#E2E8F0] rounded-[6px] px-2.5 py-1.5 text-[#334155] bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
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
          onKeyDown={e => { if (e.key === "Enter" && newValue.trim()) { e.preventDefault(); onAdd(); } }} />
        <button onClick={onAdd} disabled={!newValue.trim()}
          className="ff-btn-primary flex items-center gap-1 px-3 py-2 text-sm shrink-0 disabled:opacity-40">
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, className = "" }: {
  title: string; subtitle?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-[#F1F5F9]">
        <h3 className="text-sm font-semibold text-[#0F172A]">{title}</h3>
        {subtitle && <p className="text-xs text-[#94A3B8] mt-0.5">{subtitle}</p>}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ── Donut chart ───────────────────────────────────────────────────────────────
function StorageDonut({ used, total }: { used: number; total: number }) {
  const pct = used / total;
  const r = 40;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          <circle cx="50" cy="50" r={r} fill="none" stroke="#F1F5F9" strokeWidth="12" />
          <circle cx="50" cy="50" r={r} fill="none" stroke="#2563EB" strokeWidth="12"
            strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-[#0F172A]">{used.toFixed(1)}</span>
          <span className="text-[10px] text-[#94A3B8]">GB</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-xs font-semibold text-[#334155]">{used} GB / {total} GB used</p>
        <p className="text-[11px] text-[#94A3B8] mt-0.5">{Math.round(pct * 100)}% of storage used</p>
      </div>
    </div>
  );
}

// ── Coming soon ───────────────────────────────────────────────────────────────
function ComingSoon({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="py-20 flex flex-col items-center gap-3 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
        <Icon className="w-6 h-6 text-[#94A3B8]" />
      </div>
      <p className="text-sm font-semibold text-[#475569]">{title}</p>
      <p className="text-xs text-[#94A3B8]">{desc}</p>
    </div>
  );
}

// ── Edit modal ────────────────────────────────────────────────────────────────
function EditModal({ label, value, onClose, onSave }: {
  label: string; value: string; onClose: () => void; onSave: (v: string) => void;
}) {
  const [val, setVal] = useState(value);
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-sm">
        <div className="px-5 py-4 border-b border-[#E2E8F0]">
          <h3 className="font-semibold text-[#0F172A]">Edit {label}</h3>
        </div>
        <div className="p-5 space-y-4">
          <input value={val} onChange={e => setVal(e.target.value)}
            className="ff-input text-sm" autoFocus
            onKeyDown={e => { if (e.key === "Enter") { onSave(val); onClose(); } if (e.key === "Escape") onClose(); }} />
          <div className="flex gap-2">
            <button onClick={onClose} className="ff-btn-secondary flex-1 justify-center text-sm">Cancel</button>
            <button onClick={() => { onSave(val); onClose(); }} className="ff-btn-primary flex-1 justify-center text-sm">Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsClient({ settings }: { settings: Record<string, string> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("general");

  // ── General tab state ─────────────────────────────────────────────────────
  const [companyName, setCompanyName]     = useState(settings.company_name ?? "FieldFlow Demo");
  const [businessEmail, setBusinessEmail] = useState(settings.support_email ?? "info@fieldflow.app");
  const [phone, setPhone]                 = useState(settings.company_phone ?? "+254 700 000 000");
  const [address, setAddress]             = useState(settings.business_location ?? "Nairobi, Kenya");
  const [timezone, setTimezone]           = useState(settings.timezone ?? "Africa/Nairobi");
  const [currency, setCurrency]           = useState(settings.currency ?? "KES");
  const [dateFormat, setDateFormat]       = useState(settings.date_format ?? "DD/MM/YYYY");
  const [timeFormat, setTimeFormat]       = useState(settings.time_format ?? "12-hour");

  // ── Company tab state ─────────────────────────────────────────────────────
  const [industry, setIndustry]                   = useState<IndustryKey>((settings.industry as IndustryKey) || "OTHER");
  const [workerTitle, setWorkerTitle]             = useState(settings.worker_title ?? "Technician");
  const [workerTitlePlural, setWorkerTitlePlural] = useState(settings.worker_title_plural ?? "Technicians");
  const [jobLabel, setJobLabel]                   = useState(settings.job_label ?? "Job");
  const [jobLabelPlural, setJobLabelPlural]       = useState(settings.job_label_plural ?? "Jobs");
  const [brandColor, setBrandColor]               = useState(settings.brand_color ?? "#2563eb");
  const [jobTypes, setJobTypes]                   = useState<string[]>(safeJson<string[]>(settings.job_types, []));
  const [zones, setZones]                         = useState<string[]>(safeJson<string[]>(settings.zones, []));
  const [newJobType, setNewJobType]               = useState("");
  const [newZone, setNewZone]                     = useState("");
  const [defaultWarranty, setDefaultWarranty]     = useState(settings.default_warranty ?? "");

  // ── Edit modal ────────────────────────────────────────────────────────────
  const [editing, setEditing] = useState<{ label: string; value: string; onSave: (v: string) => void } | null>(null);

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
          // General
          company_name:      companyName,
          support_email:     businessEmail,
          company_phone:     phone,
          business_location: address,
          timezone,
          currency,
          currency_symbol:   currency,
          date_format:       dateFormat,
          time_format:       timeFormat,
          // Company
          industry,
          worker_title:        workerTitle,
          worker_title_plural: workerTitlePlural,
          job_label:           jobLabel,
          job_label_plural:    jobLabelPlural,
          brand_color:         brandColor,
          default_warranty:    defaultWarranty,
          job_types:           JSON.stringify(jobTypes),
          zones:               JSON.stringify(zones),
          emoji: (INDUSTRY_TEMPLATES[industry] ?? INDUSTRY_TEMPLATES.OTHER).emoji,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="ff-page-title">Settings</h1>
          <p className="ff-page-desc">Manage your workspace preferences and configuration.</p>
        </div>
        <button onClick={handleSave} disabled={isPending}
          className="ff-btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5 disabled:opacity-50 shrink-0">
          {isPending
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {isPending ? "Saving…" : saved ? "Saved!" : "Save Changes"}
        </button>
      </div>

      {saved && (
        <div className="text-sm bg-green-50 border border-green-200 text-[#16A34A] px-4 py-2.5 rounded-[10px] flex items-center gap-2">
          <Check className="w-4 h-4" /> Settings saved successfully
        </div>
      )}

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
        <div className="border-b border-[#E2E8F0] px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-0 min-w-max">
            {TABS.map(({ id, label }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`ff-tab rounded-none border-0 border-b-2 py-3.5 px-4 text-sm transition-colors
                  ${tab === id
                    ? "border-[#2563EB] text-[#2563EB] font-semibold"
                    : "border-transparent text-[#64748B] hover:text-[#334155]"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-5">

          {/* ════════════════════════════════════════════════════════════
              GENERAL TAB — 3-column layout
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "general" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">

              {/* Column 1: General Settings rows */}
              <SectionCard title="General Settings">
                <SettingRow icon={Building2}  label="Company Name"     value={companyName}   onEdit={() => setEditing({ label: "Company Name",     value: companyName,   onSave: setCompanyName   })} />
                <SettingRow icon={Mail}       label="Business Email"   value={businessEmail} onEdit={() => setEditing({ label: "Business Email",   value: businessEmail, onSave: setBusinessEmail })} />
                <SettingRow icon={Phone}      label="Phone Number"     value={phone}         onEdit={() => setEditing({ label: "Phone Number",     value: phone,         onSave: setPhone         })} />
                <SettingRow icon={MapPin}     label="Business Address" value={address}       onEdit={() => setEditing({ label: "Business Address", value: address,       onSave: setAddress       })} />
                <SettingRow icon={Globe}      label="Time Zone"        value={timezone}      onEdit={() => setEditing({ label: "Time Zone",        value: timezone,      onSave: setTimezone      })} />
                <SettingRow icon={DollarSign} label="Currency"         value={currency}      onEdit={() => setEditing({ label: "Currency",         value: currency,      onSave: setCurrency      })} />
                <SettingRow icon={Calendar}   label="Date Format"      value={dateFormat}    onEdit={() => setEditing({ label: "Date Format",      value: dateFormat,    onSave: setDateFormat    })} />
                <SettingRow icon={Clock}      label="Time Format"      value={timeFormat}    onEdit={() => setEditing({ label: "Time Format",      value: timeFormat,    onSave: setTimeFormat    })} />
              </SectionCard>

              {/* Column 2: Security + Preferences */}
              <div className="space-y-5">
                <SectionCard title="Security Settings">
                  <SecurityRow icon={Lock}       label="Password"        subtitle="Last changed 30 days ago"      action="Change" />
                  <SecurityRow icon={Smartphone} label="Two-Factor Auth" subtitle="Disabled — add extra security"  action="Enable" />
                  <SecurityRow icon={Eye}        label="Active Sessions" subtitle="2 active sessions"              action="Manage" />
                  <SecurityRow icon={Activity}   label="Login Activity"  subtitle="View recent logins"             action="View"   />
                </SectionCard>
                <SectionCard title="Preferences">
                  <SelectRow icon={Languages}  label="Language"            subtitle="Interface language"  options={["English", "Swahili", "French"]}  defaultValue="English" />
                  <ToggleRow icon={Bell}        label="Email Notifications" subtitle="Receive email alerts" defaultOn={true}  />
                  <ToggleRow icon={BellOff}     label="Push Notifications"  subtitle="Browser push alerts"  defaultOn={false} />
                  <SelectRow icon={LayoutGrid}  label="Default View"        subtitle="Dashboard layout"    options={["Grid", "List", "Compact"]}       defaultValue="Grid"    />
                  <SelectRow icon={List}        label="Items Per Page"      subtitle="Table pagination"    options={["10", "25", "50", "100"]}         defaultValue="25"      />
                </SectionCard>
              </div>

              {/* Column 3: Storage + Account Actions + Help */}
              <div className="space-y-4">
                <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-4">Storage Usage</h3>
                  <StorageDonut used={2.4} total={10} />
                  <div className="mt-4 space-y-1.5">
                    {[
                      { label: "PDFs & Documents", size: "1.8 GB", color: "bg-[#2563EB]" },
                      { label: "Photos",            size: "0.6 GB", color: "bg-blue-200"  },
                      { label: "Available",         size: "7.6 GB", color: "bg-[#F1F5F9] border border-[#E2E8F0]", muted: true },
                    ].map(({ label, size, color, muted }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                          <span className="text-[#64748B]">{label}</span>
                        </div>
                        <span className={`font-semibold ${muted ? "text-[#94A3B8]" : "text-[#334155]"}`}>{size}</span>
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-4 text-xs font-semibold py-2.5 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155] transition-colors">
                    Manage Storage
                  </button>
                </div>

                <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Account Actions</h3>
                  <div className="space-y-2">
                    {[
                      { icon: Download, label: "Export Data",     danger: false },
                      { icon: Upload,   label: "Import Data",     danger: false },
                      { icon: Trash2,   label: "Delete Account",  danger: true  },
                    ].map(({ icon: Icon, label, danger }) => (
                      <button key={label}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[8px] border text-sm transition-colors
                          ${danger
                            ? "border-red-100 text-[#DC2626] hover:bg-red-50"
                            : "border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"}`}>
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="font-medium">{label}</span>
                        </div>
                        <ChevronRight className={`w-4 h-4 ${danger ? "text-[#DC2626]/60" : "text-[#94A3B8]"}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-[#64748B]" />
                    <h3 className="text-sm font-semibold text-[#0F172A]">Need Help?</h3>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed mb-3">
                    Browse our documentation or contact support for assistance.
                  </p>
                  <button className="w-full text-xs font-semibold py-2.5 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155] transition-colors flex items-center justify-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />
                    Go to Help Center
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════
              COMPANY TAB — WhatsApp banner + Vocabulary + Industry +
                            Jobs + Zones + Branding
          ═══════════════════════════════════════════════════════════════ */}
          {tab === "company" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

              {/* ── Left column ── */}
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
                <SectionCard title="Vocabulary / Terminology" subtitle="Words used in WhatsApp messages and across the platform.">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Worker (singular)", value: workerTitle,       onChange: setWorkerTitle       },
                      { label: "Worker (plural)",   value: workerTitlePlural, onChange: setWorkerTitlePlural },
                      { label: "Job label (singular)", value: jobLabel,       onChange: setJobLabel          },
                      { label: "Job label (plural)",   value: jobLabelPlural, onChange: setJobLabelPlural    },
                    ].map(({ label, value, onChange }) => (
                      <div key={label}>
                        <label className="block text-xs font-semibold text-[#475569] mb-1.5">{label}</label>
                        <input value={value} onChange={e => onChange(e.target.value)} className="ff-input text-sm" />
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* Jobs You Offer */}
                <SectionCard title={`${jobLabelPlural || "Jobs"} You Offer`} subtitle="Job types available when creating a new job.">
                  <TagList
                    tags={jobTypes}
                    onRemove={t => setJobTypes(jobTypes.filter(j => j !== t))}
                    newValue={newJobType}
                    onNewChange={setNewJobType}
                    onAdd={() => { if (newJobType.trim()) { setJobTypes([...jobTypes, newJobType.trim()]); setNewJobType(""); } }}
                    placeholder={`Add a ${(jobLabel || "job").toLowerCase()} type…`}
                    color="blue"
                  />
                </SectionCard>

                {/* Service Zones */}
                <SectionCard title="Service Zones" subtitle="Geographic areas where your team operates.">
                  <TagList
                    tags={zones}
                    onRemove={z => setZones(zones.filter(z2 => z2 !== z))}
                    newValue={newZone}
                    onNewChange={setNewZone}
                    onAdd={() => { if (newZone.trim()) { setZones([...zones, newZone.trim()]); setNewZone(""); } }}
                    placeholder="Add a zone…"
                    color="green"
                  />
                </SectionCard>
              </div>

              {/* ── Right column ── */}
              <div className="space-y-5">

                {/* Industry Preset */}
                <SectionCard title="Industry Preset" subtitle="Auto-fills labels, job types, and defaults for your industry.">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {INDUSTRY_LIST.map(t => {
                      const Icon = INDUSTRY_ICONS[t.key] ?? HelpCircle;
                      const active = industry === t.key;
                      return (
                        <button key={t.key} type="button" onClick={() => applyTemplate(t.key)}
                          className={`flex items-center gap-2 px-2.5 py-2.5 rounded-[10px] text-xs border transition-all text-left
                            ${active
                              ? "border-[#2563EB] bg-blue-50 text-[#2563EB] font-semibold"
                              : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2563EB]/30 hover:bg-blue-50/30"}`}>
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-[#2563EB]" : "text-[#94A3B8]"}`} />
                          <span className="truncate">{t.displayName}</span>
                          {active && <span className="ml-auto w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </SectionCard>

                {/* Branding */}
                <SectionCard title="Branding" subtitle="Brand color used on invoices, PDFs, and documents.">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Brand Color</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                          className="h-9 w-9 border border-[#E2E8F0] rounded-[8px] cursor-pointer p-0.5 shrink-0" />
                        <input value={brandColor} onChange={e => setBrandColor(e.target.value)}
                          className="ff-input text-sm font-mono w-28" />
                        <div className="w-9 h-9 rounded-[8px] border border-[#E2E8F0] shrink-0" style={{ backgroundColor: brandColor }} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Workspace Logo</label>
                      <div className="flex items-center gap-3 p-3 border border-[#E2E8F0] rounded-[12px]">
                        <div className="w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 text-white font-extrabold text-sm"
                          style={{ backgroundColor: brandColor }}>
                          {companyName.charAt(0).toUpperCase() || "F"}
                        </div>
                        <div>
                          <button className="text-xs text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
                            Change logo
                          </button>
                          <p className="text-[10px] text-[#94A3B8] mt-0.5">PNG, JPG or SVG. Max 2MB.</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">
                        Default Warranty Text <span className="font-normal text-[#94A3B8]">(optional)</span>
                      </label>
                      <textarea value={defaultWarranty} onChange={e => setDefaultWarranty(e.target.value)}
                        rows={2} placeholder="Warranty applies as per device, installation, and service terms."
                        className="ff-input text-sm resize-none" />
                    </div>
                  </div>
                </SectionCard>

              </div>
            </div>
          )}

          {/* ── OTHER TABS ── */}
          {tab === "users"        && <ComingSoon icon={Users}      title="Users & Roles"  desc="Team members, permission levels, and role management."          />}
          {tab === "billing"      && <ComingSoon icon={CreditCard} title="Billing"         desc="Subscription plan, payment method, and invoices."               />}
          {tab === "integrations" && <ComingSoon icon={Plug}       title="Integrations"    desc="Connect Twilio, Google AI, M-Pesa, and third-party tools."      />}
          {tab === "data"         && <ComingSoon icon={Database}   title="Data & Privacy"  desc="Data export, retention policies, and GDPR settings."            />}

        </div>
      </div>

      {/* Edit modal */}
      {editing && (
        <EditModal
          label={editing.label}
          value={editing.value}
          onClose={() => setEditing(null)}
          onSave={editing.onSave}
        />
      )}
    </div>
  );
}
