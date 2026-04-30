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
  FileText, Clipboard, ShieldCheck, Award, FileEdit,
  UserPlus, Crown, AlertTriangle, RefreshCw, CheckCircle2,
  type LucideIcon,
} from "lucide-react";
import { INDUSTRY_LIST, INDUSTRY_TEMPLATES, type IndustryKey } from "@/lib/industry-templates";
import { createUser } from "@/app/actions/user-actions";
import type { Role } from "@/types";

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

const DOCUMENT_OPTIONS: {
  key: string; label: string; Icon: LucideIcon;
  iconBg: string; iconColor: string; description: string;
}[] = [
  { key: "invoice", label: "Invoice", Icon: FileText, iconBg: "bg-[#EFF6FF]", iconColor: "text-[#2563EB]", description: "Payment request generated when a worker reports completion." },
  { key: "job_card", label: "Job Card", Icon: Clipboard, iconBg: "bg-[#F1F5F9]", iconColor: "text-[#64748B]", description: "Full job record with timeline, worker details, and client verification." },
  { key: "warranty", label: "Warranty Certificate", Icon: ShieldCheck, iconBg: "bg-[#EFF6FF]", iconColor: "text-[#2563EB]", description: "Warranty terms issued to the client after verification." },
  { key: "completion_certificate", label: "Completion Certificate", Icon: Award, iconBg: "bg-[#F0FDF4]", iconColor: "text-[#16A34A]", description: "Formal completion proof for installations or contracted work." },
  { key: "quotation", label: "Quotation", Icon: FileEdit, iconBg: "bg-[#FFFBEB]", iconColor: "text-[#D97706]", description: "Price estimate prepared before a job is approved." },
  { key: "service_report", label: "Service Report", Icon: FileText, iconBg: "bg-[#F5F3FF]", iconColor: "text-[#7C3AED]", description: "Operational report covering what was done on site." },
  { key: "installation_report", label: "Installation Report", Icon: Clipboard, iconBg: "bg-[#EEF2FF]", iconColor: "text-[#4F46E5]", description: "Installation details for solar, tracking, equipment, and similar jobs." },
  { key: "fuel_calibration_report", label: "Fuel Calibration Report", Icon: Gauge, iconBg: "bg-[#FFFBEB]", iconColor: "text-[#D97706]", description: "Calibration readings and verification for fuel monitoring jobs." },
  { key: "device_replacement_report", label: "Device Replacement Report", Icon: RefreshCw, iconBg: "bg-[#FFF7ED]", iconColor: "text-[#EA580C]", description: "Tracks removed and installed devices during replacement work." },
  { key: "client_confirmation_receipt", label: "Client Confirmation Receipt", Icon: CheckCircle2, iconBg: "bg-[#F0FDF4]", iconColor: "text-[#16A34A]", description: "Receipt showing OTP confirmation as the client signature." },
  { key: "delivery_note", label: "Delivery Note", Icon: Truck, iconBg: "bg-[#ECFEFF]", iconColor: "text-[#0891B2]", description: "Proof of delivered items, visits, or fleet service handovers." },
  { key: "compliance_certificate", label: "Compliance Certificate", Icon: ShieldCheck, iconBg: "bg-[#F1F5F9]", iconColor: "text-[#475569]", description: "Formal compliance proof for regulated service categories." },
];

const DOC_PREVIEW_TYPES: Record<string, string> = {
  invoice: "INVOICE",
  job_card: "JOB_CARD",
  warranty: "WARRANTY_CERTIFICATE",
  completion_certificate: "COMPLETION_CERTIFICATE",
  quotation: "QUOTATION",
  service_report: "SERVICE_REPORT",
  installation_report: "INSTALLATION_REPORT",
  fuel_calibration_report: "FUEL_CALIBRATION_REPORT",
  device_replacement_report: "DEVICE_REPLACEMENT_REPORT",
  client_confirmation_receipt: "CLIENT_CONFIRMATION_RECEIPT",
  delivery_note: "DELIVERY_NOTE",
  compliance_certificate: "COMPLIANCE_CERTIFICATE",
};

// ── Tab config ────────────────────────────────────────────────────────────────
type Tab = "general" | "company" | "operations" | "documents" | "automations" | "branding" | "whatsapp" | "users" | "billing" | "data";
const TABS: { id: Tab; label: string }[] = [
  { id: "general",     label: "General"        },
  { id: "company",     label: "Company"        },
  { id: "operations",  label: "Operations"     },
  { id: "documents",   label: "Documents"      },
  { id: "automations", label: "Automations"    },
  { id: "branding",    label: "Branding"       },
  { id: "whatsapp",    label: "WhatsApp"       },
  { id: "users",       label: "Users & Roles"  },
  { id: "billing",     label: "Billing"        },
  { id: "data",        label: "Data & Privacy" },
];

type TeamMember = {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  role: Role;
  isActive: boolean;
};

type DocumentConfig = {
  templateLabel?: string;
  generationTrigger?: string;
  deliveryChannels?: string[];
  footerText?: string;
  defaultTerms?: string;
  includeLogo?: boolean;
  useBrandColor?: boolean;
  includeOtpStamp?: boolean;
  autoSendAfterVerification?: boolean;
  storeInDashboard?: boolean;
};

type WhatsAppSummary = {
  connected: boolean;
  activeSenderCount: number;
  displayName: string;
  phoneNumber: string;
  status: string;
  source: string;
};

type DataAction = {
  action: "clear_job_history" | "reset_workspace" | "delete_workspace";
  title: string;
  description: string;
  confirmation: string;
  enabled: boolean;
};

type BillingSummary = {
  planName: string;
  planPrice: string;
  planStatus: string;
  workerLimit: number;
  jobLimit: number;
  pdfLimit: number;
  whatsappLimit: number;
  activeWorkerCount: number;
  jobsThisMonth: number;
  pdfsThisMonth: number;
  whatsappMessagesThisMonth: number;
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function safeJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";
}

function memberColor(index: number): string {
  const colors = [
    "bg-[#DBEAFE] text-[#1D4ED8]",
    "bg-[#DCFCE7] text-[#15803D]",
    "bg-[#FEF3C7] text-[#B45309]",
    "bg-[#FFE4E6] text-[#BE123C]",
    "bg-[#EDE9FE] text-[#6D28D9]",
  ];
  return colors[index % colors.length];
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
          className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB]/40 hover:text-[#2563EB] hover:bg-[#EFF6FF]/30 transition-colors">
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
      <button
        disabled
        className="shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] text-[#94A3B8] bg-[#F8FAFC] cursor-not-allowed whitespace-nowrap"
        title="This control is not active yet"
      >
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

function ControlledSelectRow({ icon: Icon, label, subtitle, options, value, onChange }: {
  icon: React.ElementType;
  label: string;
  subtitle: string;
  options: string[];
  value: string;
  onChange: (value: string) => void;
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
      <select value={value} onChange={e => onChange(e.target.value)}
        className="shrink-0 text-xs border border-[#E2E8F0] rounded-[6px] px-2.5 py-1.5 text-[#334155] bg-white focus:outline-none focus:ring-1 focus:ring-[#2563EB]">
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ControlledToggleRow({ icon: Icon, label, subtitle, on, onToggle }: {
  icon: React.ElementType;
  label: string;
  subtitle: string;
  on: boolean;
  onToggle: () => void;
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
      <Toggle on={on} onToggle={onToggle} />
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
    ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]"
    : "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]";
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

// ── Integration status badge ──────────────────────────────────────────────────
function StatusPill({ status }: { status: "connected" | "disconnected" | "optional" }) {
  if (status === "connected")    return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">Connected</span>;
  if (status === "disconnected") return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FFF1F2] text-[#DC2626] border border-[#FEE2E2]">Not connected</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]">Optional</span>;
}

function roleLabel(role: Role): string {
  if (role === "ADMIN") return "Admin";
  if (role === "MANAGER") return "Manager";
  if (role === "VIEWER") return "Viewer";
  return "Worker";
}

function rolePillClass(role: Role): string {
  if (role === "ADMIN") return "bg-[#EFF6FF] text-[#2563EB] border border-[#DBEAFE]";
  if (role === "MANAGER") return "bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]";
  if (role === "VIEWER") return "bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]";
  return "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]";
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function SettingsClient({
  settings,
  teamMembers,
  whatsappSummary,
  billingSummary,
}: {
  settings: Record<string, string>;
  teamMembers: TeamMember[];
  whatsappSummary: WhatsAppSummary;
  billingSummary: BillingSummary;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<Tab>("general");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);

  // ── General tab ───────────────────────────────────────────────────────────
  const [companyName, setCompanyName]     = useState(settings.company_name ?? "FieldFlow Demo");
  const [businessEmail, setBusinessEmail] = useState(settings.support_email ?? "info@fieldflow.app");
  const [phone, setPhone]                 = useState(settings.company_phone ?? "+254 700 000 000");
  const [address, setAddress]             = useState(settings.business_location ?? "Nairobi, Kenya");
  const [timezone, setTimezone]           = useState(settings.timezone ?? "Africa/Nairobi");
  const [currency, setCurrency]           = useState(settings.currency ?? "KES");
  const [dateFormat, setDateFormat]       = useState(settings.date_format ?? "DD/MM/YYYY");
  const [timeFormat, setTimeFormat]       = useState(settings.time_format ?? "12-hour");
  const [language, setLanguage]           = useState(settings.language ?? "English");
  const [defaultView, setDefaultView]     = useState(settings.default_view ?? "Grid");
  const [itemsPerPage, setItemsPerPage]   = useState(settings.items_per_page ?? "25");
  const [emailNotifications, setEmailNotifications] = useState(settings.email_notifications !== "false");
  const [pushNotifications, setPushNotifications]   = useState(settings.push_notifications === "true");

  // ── Company tab ───────────────────────────────────────────────────────────
  const [companyDesc, setCompanyDesc]             = useState(settings.company_description ?? "");
  const [companyWebsite, setCompanyWebsite]       = useState(settings.company_website ?? "");

  // ── Operations tab ────────────────────────────────────────────────────────
  const [industry, setIndustry]                   = useState<IndustryKey>((settings.industry as IndustryKey) || "OTHER");
  const [workerTitle, setWorkerTitle]             = useState(settings.worker_title ?? "Technician");
  const [workerTitlePlural, setWorkerTitlePlural] = useState(settings.worker_title_plural ?? "Technicians");
  const [jobLabel, setJobLabel]                   = useState(settings.job_label ?? "Job");
  const [jobLabelPlural, setJobLabelPlural]       = useState(settings.job_label_plural ?? "Jobs");
  const [assetLabel, setAssetLabel]               = useState(settings.asset_label ?? "Asset");
  const [assetLabelPlural, setAssetLabelPlural]   = useState(settings.asset_label_plural ?? "Assets");
  const [clientLabel, setClientLabel]             = useState(settings.client_label ?? "Client");
  const [clientLabelPlural, setClientLabelPlural] = useState(settings.client_label_plural ?? "Clients");
  const [jobTypes, setJobTypes]                   = useState<string[]>(safeJson<string[]>(settings.job_types, []));
  const [zones, setZones]                         = useState<string[]>(safeJson<string[]>(settings.zones, []));
  const [newJobType, setNewJobType]               = useState("");
  const [newZone, setNewZone]                     = useState("");
  const [defaultWarranty, setDefaultWarranty]     = useState(settings.default_warranty ?? "");

  // ── Branding tab ──────────────────────────────────────────────────────────
  const [brandColor, setBrandColor]               = useState(settings.brand_color ?? "#2563eb");
  const [pdfFooter, setPdfFooter]                 = useState(settings.pdf_footer ?? "");
  const [showLogoOnDocs, setShowLogoOnDocs]       = useState(settings.show_logo_on_docs !== "false");
  const [brandColorHeader, setBrandColorHeader]   = useState(settings.brand_color_header !== "false");
  const [showPoweredBy, setShowPoweredBy]         = useState(settings.show_powered_by !== "false");
  const [includeOtpStamp, setIncludeOtpStamp]     = useState(settings.include_otp_stamp !== "false");
  const [showCompanyNameInMessages, setShowCompanyNameInMessages] = useState(settings.show_company_name_in_messages !== "false");

  // ── Automations tab ───────────────────────────────────────────────────────
  const [briefingTime, setBriefingTime]           = useState(settings.briefing_time ?? "06:00");
  const [briefingEnabled, setBriefingEnabled]     = useState(settings.briefing_enabled !== "false");
  const [remindersEnabled, setRemindersEnabled]   = useState(settings.reminders_enabled !== "false");
  const [slaAlerts, setSlaAlerts]                 = useState(settings.sla_alerts !== "false");
  const [slaHours, setSlaHours]                   = useState(settings.sla_hours ?? "24");
  const [weeklyEarnings, setWeeklyEarnings]       = useState(settings.weekly_earnings !== "false");
  const [reviewRequests, setReviewRequests]       = useState(settings.review_requests !== "false");
  const [quoteFollowUps, setQuoteFollowUps]       = useState(settings.quote_follow_ups === "true");
  const [whatsappJobAssignments, setWhatsappJobAssignments] = useState(settings.whatsapp_job_assignment_notifications !== "false");
  const [whatsappOtpMessages, setWhatsappOtpMessages] = useState(settings.whatsapp_otp_completion_messages !== "false");
  const [whatsappDocumentDelivery, setWhatsappDocumentDelivery] = useState(settings.whatsapp_document_delivery !== "false");
  const [whatsappReassignmentAlerts, setWhatsappReassignmentAlerts] = useState(settings.whatsapp_reassignment_alerts !== "false");
  const [whatsappClientNotifications, setWhatsappClientNotifications] = useState(settings.whatsapp_client_notifications !== "false");
  const [whatsappQuotationSending, setWhatsappQuotationSending] = useState(settings.whatsapp_quotation_sending !== "false");
  const [whatsappTestPhone, setWhatsappTestPhone] = useState("");
  const [whatsappTestStatus, setWhatsappTestStatus] = useState("");
  const [isSendingWhatsappTest, setIsSendingWhatsappTest] = useState(false);

  // ── Data & privacy tab ───────────────────────────────────────────────────
  const [completedJobsRetention, setCompletedJobsRetention] = useState(settings.retention_completed_jobs ?? "2 years");
  const [invoiceRecordsRetention, setInvoiceRecordsRetention] = useState(settings.retention_invoice_records ?? "5 years");
  const [activityLogsRetention, setActivityLogsRetention] = useState(settings.retention_activity_logs ?? "90 days");
  const [analyticsUsage, setAnalyticsUsage] = useState(settings.analytics_usage !== "false");
  const [productUpdatesEmail, setProductUpdatesEmail] = useState(settings.product_updates_email !== "false");
  const [requireTwoFactor, setRequireTwoFactor] = useState(settings.require_two_factor === "true");
  const [dataAction, setDataAction] = useState<DataAction | null>(null);
  const [dataActionInput, setDataActionInput] = useState("");
  const [dataActionStatus, setDataActionStatus] = useState("");
  const [isRunningDataAction, setIsRunningDataAction] = useState(false);

  // ── Documents tab ─────────────────────────────────────────────────────────
  const DEFAULT_DOCS = ["invoice", "job_card", "warranty"];
  const [enabledDocs, setEnabledDocs] = useState<string[]>(safeJson<string[]>(settings.enabled_documents, DEFAULT_DOCS));
  const [previewDoc, setPreviewDoc] = useState(enabledDocs[0] ?? "invoice");
  const [docSendWhatsapp, setDocSendWhatsapp] = useState(settings.document_send_whatsapp !== "false");
  const [docSendEmail, setDocSendEmail] = useState(settings.document_send_email === "true");
  const [docStoreDashboard, setDocStoreDashboard] = useState(settings.document_store_dashboard !== "false");
  const [documentConfig, setDocumentConfig] = useState<Record<string, DocumentConfig>>(
    safeJson<Record<string, DocumentConfig>>(settings.document_type_config, {})
  );
  function toggleDoc(key: string) {
    setEnabledDocs(prev => {
      const next = prev.includes(key) ? prev.filter(d => d !== key) : [...prev, key];
      if (!next.includes(previewDoc)) setPreviewDoc(next[0] ?? key);
      return next;
    });
  }
  function docConfigFor(key: string, label: string): Required<DocumentConfig> {
    const config = documentConfig[key] ?? {};
    return {
      templateLabel: config.templateLabel ?? `${label} - Standard`,
      generationTrigger: config.generationTrigger ?? "After client verification",
      deliveryChannels: config.deliveryChannels ?? ["whatsapp", "dashboard"],
      footerText: config.footerText ?? "",
      defaultTerms: config.defaultTerms ?? "",
      includeLogo: config.includeLogo ?? true,
      useBrandColor: config.useBrandColor ?? true,
      includeOtpStamp: config.includeOtpStamp ?? ["job_card", "client_confirmation_receipt"].includes(key),
      autoSendAfterVerification: config.autoSendAfterVerification ?? ["invoice", "job_card", "warranty", "completion_certificate", "client_confirmation_receipt"].includes(key),
      storeInDashboard: config.storeInDashboard ?? true,
    };
  }
  function updateDocConfig(key: string, patch: Partial<DocumentConfig>) {
    setDocumentConfig(prev => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? {}),
        ...patch,
      },
    }));
  }

  async function sendWhatsappTest() {
    setWhatsappTestStatus("");
    setIsSendingWhatsappTest(true);
    try {
      const response = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: whatsappTestPhone }),
      });
      const data = await response.json().catch(() => ({}));
      setWhatsappTestStatus(response.ok ? "Test message sent." : data.error ?? "Unable to send test message.");
    } finally {
      setIsSendingWhatsappTest(false);
    }
  }

  async function runDataAction() {
    if (!dataAction || !dataAction.enabled) return;
    setDataActionStatus("");
    setIsRunningDataAction(true);
    try {
      const response = await fetch("/api/settings/data-actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: dataAction.action, confirmation: dataActionInput }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setDataActionStatus(data.error ?? "Unable to complete action.");
        return;
      }
      setDataActionStatus(data.message ?? "Action completed.");
      setDataAction(null);
      setDataActionInput("");
      router.refresh();
    } finally {
      setIsRunningDataAction(false);
    }
  }

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
    // Apply asset/client label hints per industry if available
    const assetHints: Partial<Record<IndustryKey, [string, string]>> = {
      TANK_SERVICES: ["Tank", "Tanks"],
      FUEL_TRACKER:  ["Vehicle", "Vehicles"],
      SOLAR:         ["Installation", "Installations"],
      LOGISTICS:     ["Vehicle", "Vehicles"],
    };
    const clientHints: Partial<Record<IndustryKey, [string, string]>> = {
      LOGISTICS:    ["Fleet Client", "Fleet Clients"],
      FUEL_TRACKER: ["Fleet Client", "Fleet Clients"],
    };
    if (assetHints[key]) { setAssetLabel(assetHints[key]![0]); setAssetLabelPlural(assetHints[key]![1]); }
    if (clientHints[key]) { setClientLabel(clientHints[key]![0]); setClientLabelPlural(clientHints[key]![1]); }
  }

  async function handleSave() {
    startTransition(async () => {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name:         companyName,
          company_description:  companyDesc,
          company_website:      companyWebsite,
          support_email:        businessEmail,
          company_phone:        phone,
          business_location:    address,
          timezone,
          currency,
          currency_symbol:      currency,
          date_format:          dateFormat,
          time_format:          timeFormat,
          language,
          default_view:         defaultView,
          items_per_page:       itemsPerPage,
          email_notifications:  String(emailNotifications),
          push_notifications:   String(pushNotifications),
          industry,
          worker_title:         workerTitle,
          worker_title_plural:  workerTitlePlural,
          job_label:            jobLabel,
          job_label_plural:     jobLabelPlural,
          asset_label:          assetLabel,
          asset_label_plural:   assetLabelPlural,
          client_label:         clientLabel,
          client_label_plural:  clientLabelPlural,
          brand_color:          brandColor,
          pdf_footer:           pdfFooter,
          show_logo_on_docs:    String(showLogoOnDocs),
          brand_color_header:   String(brandColorHeader),
          show_powered_by:      String(showPoweredBy),
          include_otp_stamp:    String(includeOtpStamp),
          show_company_name_in_messages: String(showCompanyNameInMessages),
          default_warranty:     defaultWarranty,
          job_types:            JSON.stringify(jobTypes),
          zones:                JSON.stringify(zones),
          enabled_documents:    JSON.stringify(enabledDocs),
          document_type_config: JSON.stringify(documentConfig),
          document_send_whatsapp: String(docSendWhatsapp),
          document_send_email:   String(docSendEmail),
          document_store_dashboard: String(docStoreDashboard),
          briefing_time:        briefingTime,
          briefing_enabled:     String(briefingEnabled),
          reminders_enabled:    String(remindersEnabled),
          sla_alerts:           String(slaAlerts),
          sla_hours:            slaHours,
          weekly_earnings:      String(weeklyEarnings),
          review_requests:      String(reviewRequests),
          quote_follow_ups:     String(quoteFollowUps),
          whatsapp_job_assignment_notifications: String(whatsappJobAssignments),
          whatsapp_otp_completion_messages: String(whatsappOtpMessages),
          whatsapp_document_delivery: String(whatsappDocumentDelivery),
          whatsapp_reassignment_alerts: String(whatsappReassignmentAlerts),
          whatsapp_client_notifications: String(whatsappClientNotifications),
          whatsapp_quotation_sending: String(whatsappQuotationSending),
          retention_completed_jobs: completedJobsRetention,
          retention_invoice_records: invoiceRecordsRetention,
          retention_activity_logs: activityLogsRetention,
          analytics_usage:      String(analyticsUsage),
          product_updates_email: String(productUpdatesEmail),
          require_two_factor:   String(requireTwoFactor),
          emoji: (INDUSTRY_TEMPLATES[industry] ?? INDUSTRY_TEMPLATES.OTHER).emoji,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    });
  }

  function inviteTeamMember(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUser(formData);
      if (result?.error) {
        setInviteFeedback({ type: "error", msg: result.error });
        return;
      }
      setInviteFeedback({ type: "ok", msg: "Team member added." });
      setShowInvite(false);
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
        <div className="text-sm bg-[#F0FDF4] border border-[#86EFAC] text-[#16A34A] px-4 py-2.5 rounded-[10px] flex items-center gap-2">
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

          {/* ════════════════════════════ GENERAL ════════════════════════════ */}
          {tab === "general" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
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

              <div className="space-y-5">
                <SectionCard title="Security Settings">
                  <SecurityRow icon={Lock}       label="Password"        subtitle="Password changes are not active in this build"      action="Not active" />
                  <SecurityRow icon={Smartphone} label="Two-Factor Auth" subtitle="2FA enforcement is saved in Data & Privacy"         action="Configure below" />
                  <SecurityRow icon={Eye}        label="Active Sessions" subtitle="Session management is planned for the auth layer"    action="Not active" />
                  <SecurityRow icon={Activity}   label="Login Activity"  subtitle="Audit log storage is planned with workspace events" action="Not active" />
                </SectionCard>
                <SectionCard title="Preferences">
                  <ControlledSelectRow icon={Languages} label="Language" subtitle="Saved for workspace-level localization" options={["English", "Swahili", "French"]} value={language} onChange={setLanguage} />
                  <ControlledToggleRow icon={Bell} label="Email Notifications" subtitle="Used by notification and document delivery preferences" on={emailNotifications} onToggle={() => setEmailNotifications(v => !v)} />
                  <ControlledToggleRow icon={BellOff} label="Push Notifications" subtitle="Saved for browser alert preferences" on={pushNotifications} onToggle={() => setPushNotifications(v => !v)} />
                  <ControlledSelectRow icon={LayoutGrid} label="Default View" subtitle="Used by list pages that support grid/list modes" options={["Grid", "List", "Compact"]} value={defaultView} onChange={setDefaultView} />
                  <ControlledSelectRow icon={List} label="Items Per Page" subtitle="Default table page size" options={["10", "25", "50", "100"]} value={itemsPerPage} onChange={setItemsPerPage} />
                </SectionCard>
              </div>

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
                  <div className="w-full mt-4 text-xs font-semibold py-2.5 rounded-[8px] border border-[#E2E8F0] text-[#94A3B8] bg-[#F8FAFC] text-center">
                    Storage manager not active yet
                  </div>
                </div>

                <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4">
                  <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Account Actions</h3>
                  <div className="space-y-2">
                    {[
                      { icon: Download, label: "Export Data", href: "/api/settings/export?scope=full", danger: false, note: "Download JSON" },
                      { icon: Upload, label: "Import Data", href: "", danger: false, note: "Not active" },
                      { icon: Trash2, label: "Delete Account", href: "", danger: true, note: "Use Data tab" },
                    ].map(({ icon: Icon, label, href, danger, note }) => (
                      href ? (
                      <a key={label} href={href}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[8px] border text-sm transition-colors
                          ${danger ? "border-[#FEE2E2] text-[#DC2626] hover:bg-[#FFF1F2]" : "border-[#E2E8F0] text-[#334155] hover:bg-[#F8FAFC] hover:border-[#CBD5E1]"}`}>
                        <div className="flex items-center gap-2"><Icon className="w-4 h-4" /><span className="font-medium">{label}</span></div>
                        <span className="text-[10px] font-semibold text-[#94A3B8]">{note}</span>
                      </a>
                      ) : (
                      <button key={label} type="button" disabled
                        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-[8px] border text-sm bg-[#F8FAFC] cursor-not-allowed
                          ${danger ? "border-[#FEE2E2] text-[#DC2626]/70" : "border-[#E2E8F0] text-[#94A3B8]"}`}>
                        <div className="flex items-center gap-2"><Icon className="w-4 h-4" /><span className="font-medium">{label}</span></div>
                        <span className="text-[10px] font-semibold text-[#94A3B8]">{note}</span>
                      </button>
                      )
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4 text-[#64748B]" />
                    <h3 className="text-sm font-semibold text-[#0F172A]">Need Help?</h3>
                  </div>
                  <p className="text-[11px] text-[#94A3B8] leading-relaxed mb-3">Browse our documentation or contact support for assistance.</p>
                  <a href="/help" className="w-full text-xs font-semibold py-2.5 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#334155] transition-colors flex items-center justify-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" /> Go to Help Center
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════ COMPANY ════════════════════════════ */}
          {tab === "company" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-5">
                <SectionCard title="Business Identity" subtitle="How your company appears to clients and on documents.">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Company Name</label>
                      <input value={companyName} onChange={e => setCompanyName(e.target.value)} className="ff-input text-sm" placeholder="e.g. Restore Services Ltd" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Short Description <span className="font-normal text-[#94A3B8]">(optional)</span></label>
                      <input value={companyDesc} onChange={e => setCompanyDesc(e.target.value)} className="ff-input text-sm" placeholder="e.g. Water tank repair and cleaning specialists" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Website <span className="font-normal text-[#94A3B8]">(optional)</span></label>
                      <input value={companyWebsite} onChange={e => setCompanyWebsite(e.target.value)} className="ff-input text-sm" placeholder="https://yourcompany.co.ke" />
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Contact Details" subtitle="Used in documents, WhatsApp messages, and client communications.">
                  <SettingRow icon={Mail}   label="Business Email"   value={businessEmail} onEdit={() => setEditing({ label: "Business Email",   value: businessEmail, onSave: setBusinessEmail })} />
                  <SettingRow icon={Phone}  label="Phone Number"     value={phone}         onEdit={() => setEditing({ label: "Phone Number",     value: phone,         onSave: setPhone         })} />
                  <SettingRow icon={MapPin} label="Business Address" value={address}       onEdit={() => setEditing({ label: "Business Address", value: address,       onSave: setAddress       })} />
                </SectionCard>
              </div>

              <div className="space-y-5">
                <SectionCard title="Industry" subtitle="Your selected industry preset.">
                  <div className="flex items-center gap-3 p-3 rounded-[12px] border border-[#E2E8F0] bg-[#EFF6FF]/40">
                    {(() => { const Icon = INDUSTRY_ICONS[industry] ?? HelpCircle; return <div className="w-9 h-9 rounded-[10px] bg-white border border-[#E2E8F0] flex items-center justify-center shrink-0"><Icon className="w-4 h-4 text-[#2563EB]" /></div>; })()}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]">{INDUSTRY_LIST.find(i => i.key === industry)?.displayName ?? "General Field Services"}</p>
                      <p className="text-xs text-[#64748B] mt-0.5">{workerTitle} · {jobLabel} · {assetLabel}</p>
                    </div>
                    <button onClick={() => setTab("operations")} className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors whitespace-nowrap">
                      Change →
                    </button>
                  </div>
                  <p className="text-xs text-[#94A3B8] mt-3">Change your industry in the <button onClick={() => setTab("operations")} className="text-[#2563EB] font-medium hover:underline">Operations</button> tab.</p>
                </SectionCard>

                <a href="/admin/settings/whatsapp"
                  className="block bg-gradient-to-r from-green-50 to-emerald-50 border border-[#86EFAC] rounded-[14px] p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-[10px] bg-[#DCFCE7] flex items-center justify-center shrink-0">
                      <MessageCircle className="w-5 h-5 text-[#16A34A]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-semibold text-green-900">WhatsApp Senders</h3>
                        <span className="text-[10px] uppercase tracking-wide font-bold bg-green-200 text-[#166534] px-1.5 py-0.5 rounded-[4px]">Connected</span>
                      </div>
                      <p className="text-xs text-[#166534]/70 leading-relaxed">Connect a dedicated WhatsApp Business number with your brand name.</p>
                      <span className="text-xs text-[#15803D] font-semibold mt-2 inline-block">Manage senders →</span>
                    </div>
                  </div>
                </a>

                <div className="bg-[#EFF6FF]/50 border border-[#DBEAFE] rounded-[12px] p-4">
                  <p className="text-xs font-semibold text-[#1D4ED8] mb-1">Need to configure your workspace?</p>
                  <p className="text-[11px] text-[#64748B] leading-relaxed">Set up terminology, job types, and service zones in <button onClick={() => setTab("operations")} className="text-[#2563EB] font-semibold hover:underline">Operations</button>. Configure branding in <button onClick={() => setTab("branding")} className="text-[#2563EB] font-semibold hover:underline">Branding</button>.</p>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════ OPERATIONS ══════════════════════════ */}
          {tab === "operations" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-5 order-2 lg:order-1">

                <SectionCard title="Vocabulary / Terminology" subtitle="Words used in WhatsApp messages, documents, and across the platform.">
                  <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">Rename things to match your industry. Changes apply to the UI and generated documents.</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Worker (singular)",    value: workerTitle,        onChange: setWorkerTitle,        placeholder: "e.g. Technician, Driver"     },
                      { label: "Worker (plural)",      value: workerTitlePlural,  onChange: setWorkerTitlePlural,  placeholder: "e.g. Technicians, Drivers"   },
                      { label: "Job (singular)",       value: jobLabel,           onChange: setJobLabel,           placeholder: "e.g. Job, Visit, Delivery"   },
                      { label: "Job (plural)",         value: jobLabelPlural,     onChange: setJobLabelPlural,     placeholder: "e.g. Jobs, Visits, Deliveries"},
                      { label: "Asset (singular)",     value: assetLabel,         onChange: setAssetLabel,         placeholder: "e.g. Asset, Tank, Vehicle"   },
                      { label: "Asset (plural)",       value: assetLabelPlural,   onChange: setAssetLabelPlural,   placeholder: "e.g. Assets, Tanks, Vehicles"},
                      { label: "Client (singular)",    value: clientLabel,        onChange: setClientLabel,        placeholder: "e.g. Client, Customer"       },
                      { label: "Client (plural)",      value: clientLabelPlural,  onChange: setClientLabelPlural,  placeholder: "e.g. Clients, Customers"     },
                    ].map(({ label, value, onChange, placeholder }) => (
                      <div key={label}>
                        <label className="block text-xs font-semibold text-[#475569] mb-1.5">{label}</label>
                        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="ff-input text-sm" />
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title={`${jobLabelPlural || "Jobs"} You Offer`} subtitle="Job types available when creating a new job.">
                  <TagList
                    tags={jobTypes} onRemove={t => setJobTypes(jobTypes.filter(j => j !== t))}
                    newValue={newJobType} onNewChange={setNewJobType}
                    onAdd={() => { if (newJobType.trim()) { setJobTypes([...jobTypes, newJobType.trim()]); setNewJobType(""); } }}
                    placeholder={`Add a ${(jobLabel || "job").toLowerCase()} type…`} color="blue" />
                </SectionCard>

                <SectionCard title="Service Zones" subtitle="Geographic areas where your team operates. Used for filtering and assignment.">
                  <TagList
                    tags={zones} onRemove={z => setZones(zones.filter(z2 => z2 !== z))}
                    newValue={newZone} onNewChange={setNewZone}
                    onAdd={() => { if (newZone.trim()) { setZones([...zones, newZone.trim()]); setNewZone(""); } }}
                    placeholder="Add a zone (e.g. Kilimani, Westlands)…" color="green" />
                </SectionCard>

              </div>

              <div className="contents lg:block lg:space-y-5 lg:order-2">
                <div className="order-1 lg:order-none">
                  <SectionCard title="Industry Preset" subtitle="Auto-fills labels, job types, and defaults for your industry. You can edit all values after selecting.">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {INDUSTRY_LIST.map(t => {
                        const Icon = INDUSTRY_ICONS[t.key] ?? HelpCircle;
                        const active = industry === t.key;
                        return (
                          <button key={t.key} type="button" onClick={() => applyTemplate(t.key)}
                            className={`flex items-center gap-2 px-2.5 py-2.5 rounded-[10px] text-xs border transition-all text-left
                              ${active ? "border-[#2563EB] bg-[#EFF6FF] text-[#2563EB] font-semibold" : "border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#2563EB]/30 hover:bg-[#EFF6FF]/30"}`}>
                            <Icon className={`w-3.5 h-3.5 shrink-0 ${active ? "text-[#2563EB]" : "text-[#94A3B8]"}`} />
                            <span className="truncate">{t.displayName}</span>
                            {active && <span className="ml-auto w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    {industry !== "OTHER" && (
                      <div className="mt-3 p-3 bg-[#EFF6FF]/60 border border-[#DBEAFE] rounded-[10px]">
                        <p className="text-xs text-[#1D4ED8] font-semibold mb-1">Preset applied: {INDUSTRY_LIST.find(i => i.key === industry)?.displayName}</p>
                        <p className="text-[11px] text-[#64748B]">Vocabulary, job types, and defaults have been filled in. You can edit any field above.</p>
                      </div>
                    )}
                  </SectionCard>
                </div>

                <div className="order-3 lg:order-none">
                  <SectionCard title="Default Warranty Text" subtitle="Added to warranty certificates unless overridden per job.">
                    <textarea value={defaultWarranty} onChange={e => setDefaultWarranty(e.target.value)}
                      rows={3} placeholder="e.g. 1 year workmanship warranty on qualifying repair jobs. Does not cover physical damage or misuse."
                      className="ff-input text-sm resize-none" />
                    <p className="text-[11px] text-[#94A3B8] mt-2">Also configurable in the Documents tab.</p>
                  </SectionCard>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════ DOCUMENTS ══════════════════════════ */}
          {tab === "documents" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-5">
                {/* Document toggles */}
                <SectionCard title="Document Generation" subtitle="Choose which documents are auto-generated and delivered for completed jobs.">
                  <div className="space-y-2 -mx-1">
                    {DOCUMENT_OPTIONS.map(doc => {
                      const on = enabledDocs.includes(doc.key);
                      const config = docConfigFor(doc.key, doc.label);
                      return (
                        <div key={doc.key}
                          className="rounded-[12px] border border-[#E2E8F0] hover:border-[#CBD5E1] transition-colors">
                          <div className="flex items-center justify-between gap-3 py-3 px-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center shrink-0 ${doc.iconBg}`}>
                                <doc.Icon className={`w-4 h-4 ${doc.iconColor}`} />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-[#0F172A]">{doc.label}</p>
                                <p className="text-xs text-[#94A3B8] mt-0.5 leading-snug">{doc.description}</p>
                              </div>
                            </div>
                            <Toggle on={on} onToggle={() => toggleDoc(doc.key)} />
                          </div>
                          {on && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-[#F1F5F9] bg-[#F8FAFC] px-4 py-3">
                              <div>
                                <label className="block text-[11px] font-semibold text-[#475569] mb-1.5">Default template label</label>
                                <input
                                  value={config.templateLabel}
                                  onChange={(e) => updateDocConfig(doc.key, { templateLabel: e.target.value })}
                                  className="ff-input text-xs bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#475569] mb-1.5">Generation trigger</label>
                                <select
                                  value={config.generationTrigger}
                                  onChange={(e) => updateDocConfig(doc.key, { generationTrigger: e.target.value })}
                                  className="ff-input text-xs bg-white"
                                >
                                  <option>After client verification</option>
                                  <option>After worker completion</option>
                                  <option>Manual only</option>
                                  <option>Before job approval</option>
                                </select>
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#475569] mb-1.5">Custom footer text</label>
                                <input
                                  value={config.footerText}
                                  onChange={(e) => updateDocConfig(doc.key, { footerText: e.target.value })}
                                  placeholder="Optional footer for this document"
                                  className="ff-input text-xs bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-semibold text-[#475569] mb-1.5">Delivery channels</label>
                                <select
                                  value={config.deliveryChannels.join(",")}
                                  onChange={(e) => updateDocConfig(doc.key, { deliveryChannels: e.target.value.split(",").filter(Boolean) })}
                                  className="ff-input text-xs bg-white"
                                >
                                  <option value="whatsapp,dashboard">WhatsApp + dashboard</option>
                                  <option value="dashboard">Dashboard only</option>
                                  <option value="email,dashboard">Email + dashboard</option>
                                  <option value="whatsapp,email,dashboard">WhatsApp + email + dashboard</option>
                                </select>
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-[11px] font-semibold text-[#475569] mb-1.5">Default terms</label>
                                <textarea
                                  rows={2}
                                  value={config.defaultTerms}
                                  onChange={(e) => updateDocConfig(doc.key, { defaultTerms: e.target.value })}
                                  placeholder="Optional terms shown on this document"
                                  className="ff-input text-xs bg-white resize-none"
                                />
                              </div>
                              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <label className="flex items-center gap-2 text-[11px] font-medium text-[#475569]">
                                  <input
                                    type="checkbox"
                                    checked={config.includeLogo}
                                    onChange={(e) => updateDocConfig(doc.key, { includeLogo: e.target.checked })}
                                    className="rounded border-[#CBD5E1]"
                                  />
                                  Include company logo
                                </label>
                                <label className="flex items-center gap-2 text-[11px] font-medium text-[#475569]">
                                  <input
                                    type="checkbox"
                                    checked={config.includeOtpStamp}
                                    onChange={(e) => updateDocConfig(doc.key, { includeOtpStamp: e.target.checked })}
                                    className="rounded border-[#CBD5E1]"
                                  />
                                  Include OTP stamp
                                </label>
                                <label className="flex items-center gap-2 text-[11px] font-medium text-[#475569]">
                                  <input
                                    type="checkbox"
                                    checked={config.autoSendAfterVerification}
                                    onChange={(e) => updateDocConfig(doc.key, { autoSendAfterVerification: e.target.checked })}
                                    className="rounded border-[#CBD5E1]"
                                  />
                                  Auto-send after verification
                                </label>
                                <label className="flex items-center gap-2 text-[11px] font-medium text-[#475569]">
                                  <input
                                    type="checkbox"
                                    checked={config.useBrandColor}
                                    onChange={(e) => updateDocConfig(doc.key, { useBrandColor: e.target.checked })}
                                    className="rounded border-[#CBD5E1]"
                                  />
                                  Use brand colour
                                </label>
                                <label className="flex items-center gap-2 text-[11px] font-medium text-[#475569]">
                                  <input
                                    type="checkbox"
                                    checked={config.storeInDashboard}
                                    onChange={(e) => updateDocConfig(doc.key, { storeInDashboard: e.target.checked })}
                                    className="rounded border-[#CBD5E1]"
                                  />
                                  Store in dashboard
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </SectionCard>

                {/* Delivery settings */}
                <SectionCard title="Document Delivery" subtitle="How documents are sent after job completion.">
                  <ControlledToggleRow icon={MessageCircle} label="Send via WhatsApp" subtitle="Deliver PDFs to clients through WhatsApp" on={docSendWhatsapp} onToggle={() => setDocSendWhatsapp(v => !v)} />
                  <ControlledToggleRow icon={Mail} label="Send via Email" subtitle="Also email documents to the client when email delivery is configured" on={docSendEmail} onToggle={() => setDocSendEmail(v => !v)} />
                  <ControlledToggleRow icon={FileText} label="Store in dashboard" subtitle="Keep all documents accessible in FieldFlow" on={docStoreDashboard} onToggle={() => setDocStoreDashboard(v => !v)} />
                </SectionCard>
              </div>

              <div className="space-y-5">
                <SectionCard title="Template Preview" subtitle="Open an A4 preview using your current company name, brand color, and footer.">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Enabled document</label>
                      <select
                        value={previewDoc}
                        onChange={(e) => setPreviewDoc(e.target.value)}
                        className="ff-input text-sm"
                      >
                        {DOCUMENT_OPTIONS.filter((doc) => enabledDocs.includes(doc.key)).map((doc) => (
                          <option key={doc.key} value={doc.key}>{doc.label}</option>
                        ))}
                      </select>
                      {enabledDocs.length === 0 && (
                        <p className="mt-2 text-xs text-[#DC2626]">Enable at least one document to preview a template.</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <a
                        href={`/api/documents/template-preview?type=${DOC_PREVIEW_TYPES[previewDoc] ?? previewDoc}`}
                        target="_blank"
                        rel="noreferrer"
                        className={`ff-btn-primary inline-flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm ${enabledDocs.length === 0 ? "pointer-events-none opacity-50" : ""}`}
                      >
                        <Eye className="w-4 h-4" />
                        Preview HTML
                      </a>
                      <a
                        href={`/api/documents/template-preview?type=${DOC_PREVIEW_TYPES[previewDoc] ?? previewDoc}&format=pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className={`ff-btn-secondary inline-flex w-full items-center justify-center gap-2 px-3 py-2.5 text-sm ${enabledDocs.length === 0 ? "pointer-events-none opacity-50" : ""}`}
                      >
                        <FileText className="w-4 h-4" />
                        Test PDF
                      </a>
                    </div>
                  </div>
                </SectionCard>

                {/* Warranty defaults */}
                <SectionCard title="Warranty Defaults" subtitle="Applied to new jobs unless overridden per job.">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Default warranty duration</label>
                      <select className="ff-input text-sm">
                        {["30 days", "60 days", "90 days", "6 months", "12 months", "24 months", "None"].map(o => (
                          <option key={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Warranty terms text</label>
                      <textarea value={defaultWarranty} onChange={e => setDefaultWarranty(e.target.value)}
                        rows={3} placeholder="Covers workmanship defects. Does not cover physical damage or misuse."
                        className="ff-input text-sm resize-none" />
                    </div>
                  </div>
                </SectionCard>

                {/* PDF branding */}
                <SectionCard title="PDF Appearance" subtitle="How your documents look when sent to clients.">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F1F5F9]">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">Company logo on PDFs</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Show your logo at the top of every document</p>
                      </div>
                      <Toggle on={showLogoOnDocs} onToggle={() => setShowLogoOnDocs(v => !v)} />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F1F5F9]">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">Brand color header</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Use your brand color in document headers</p>
                      </div>
                      <Toggle on={brandColorHeader} onToggle={() => setBrandColorHeader(v => !v)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">PDF footer text <span className="font-normal text-[#94A3B8]">(optional)</span></label>
                      <input value={pdfFooter} onChange={e => setPdfFooter(e.target.value)}
                        placeholder={`${companyName} · ${phone}`} className="ff-input text-sm" />
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {/* ════════════════════════════ AUTOMATIONS ════════════════════════ */}
          {tab === "automations" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-5">
                <SectionCard title="Daily Briefing" subtitle="Automatic morning WhatsApp summary sent to each worker with their scheduled jobs.">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">Enable Daily Briefing</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Workers receive their job schedule every morning</p>
                      </div>
                      <Toggle on={briefingEnabled} onToggle={() => setBriefingEnabled(v => !v)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Send time</label>
                      <input type="time" value={briefingTime} onChange={e => setBriefingTime(e.target.value)}
                        className="ff-input text-sm w-40" disabled={!briefingEnabled} />
                      <p className="text-[11px] text-[#94A3B8] mt-1">Uses your configured timezone ({timezone})</p>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Client Reminders" subtitle="Automatically remind clients about upcoming appointments.">
                  <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F1F5F9]">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">Appointment reminders</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">Send reminder 1 day before scheduled job</p>
                    </div>
                    <Toggle on={remindersEnabled} onToggle={() => setRemindersEnabled(v => !v)} />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F1F5F9]">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">Review requests</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">Ask clients to rate service after job is verified</p>
                    </div>
                    <Toggle on={reviewRequests} onToggle={() => setReviewRequests(v => !v)} />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">Quote follow-ups</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">Follow up on unanswered quotations after 24h</p>
                    </div>
                    <Toggle on={quoteFollowUps} onToggle={() => setQuoteFollowUps(v => !v)} />
                  </div>
                </SectionCard>

                <SectionCard title="Worker Summaries" subtitle="Automated summaries sent directly to workers.">
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">Weekly earnings recap</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">Workers receive their weekly earnings every Monday</p>
                    </div>
                    <Toggle on={weeklyEarnings} onToggle={() => setWeeklyEarnings(v => !v)} />
                  </div>
                </SectionCard>
              </div>

              <div className="space-y-5">
                <SectionCard title="SLA Alerts" subtitle="Get alerted when jobs exceed time thresholds.">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3 pb-3 border-b border-[#F1F5F9]">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">Enable SLA monitoring</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Flag overdue and stale jobs on the dashboard</p>
                      </div>
                      <Toggle on={slaAlerts} onToggle={() => setSlaAlerts(v => !v)} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Alert threshold (hours)</label>
                      <select value={slaHours} onChange={e => setSlaHours(e.target.value)}
                        className="ff-input text-sm" disabled={!slaAlerts}>
                        {["4", "8", "12", "24", "48", "72"].map(h => (
                          <option key={h} value={h}>{h} hours</option>
                        ))}
                      </select>
                      <p className="text-[11px] text-[#94A3B8] mt-1">Jobs older than this threshold will be flagged</p>
                    </div>
                  </div>
                </SectionCard>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-[8px] bg-[#EDE9FE] flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 text-[#7C3AED]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A] mb-1">Recurring Jobs</p>
                      <p className="text-[11px] text-[#64748B] leading-relaxed">Automatically schedule repeat visits — weekly, monthly, or quarterly. Available in the Growth plan.</p>
                      <button className="mt-2 text-xs font-semibold text-[#7C3AED] hover:text-[#6D28D9] transition-colors">Upgrade to enable →</button>
                    </div>
                  </div>
                </div>

                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[14px] p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-[8px] bg-[#FFFBEB] flex items-center justify-center shrink-0">
                      <Bell className="w-4 h-4 text-[#D97706]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A] mb-1">Re-engagement Messages</p>
                      <p className="text-[11px] text-[#64748B] leading-relaxed">Remind past clients about recurring services (e.g. annual tank cleaning). Available in the Growth plan.</p>
                      <button className="mt-2 text-xs font-semibold text-[#D97706] hover:text-[#B45309] transition-colors">Upgrade to enable →</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════ BRANDING ═══════════════════════════ */}
          {tab === "branding" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-5">
                <SectionCard title="Logo & Colors" subtitle="Appears on invoices, PDFs, certificates, and WhatsApp messages.">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Company Logo</label>
                      <div className="flex items-center gap-3 p-3.5 border border-[#E2E8F0] rounded-[12px] bg-[#F8FAFC]">
                        <div className="w-12 h-12 rounded-[10px] flex items-center justify-center shrink-0 text-white font-extrabold text-base"
                          style={{ backgroundColor: brandColor }}>
                          {companyName.charAt(0).toUpperCase() || "F"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0F172A]">{companyName}</p>
                          <p className="text-[11px] text-[#94A3B8]">No logo uploaded — showing initials</p>
                          <button className="mt-1.5 text-xs text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">Upload logo</button>
                        </div>
                        <div className="shrink-0">
                          <span className="text-[10px] text-[#94A3B8]">PNG, JPG or SVG</span>
                          <p className="text-[10px] text-[#94A3B8]">Max 2 MB</p>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Brand Color</label>
                      <div className="flex items-center gap-3">
                        <input type="color" value={brandColor} onChange={e => setBrandColor(e.target.value)}
                          className="h-9 w-9 border border-[#E2E8F0] rounded-[8px] cursor-pointer p-0.5 shrink-0" />
                        <input value={brandColor} onChange={e => setBrandColor(e.target.value)}
                          className="ff-input text-sm font-mono" style={{ maxWidth: "9rem" }} />
                        <div className="flex gap-1.5 ml-2">
                          {["#2563EB","#16A34A","#D97706","#DC2626","#7C3AED","#0F172A"].map(c => (
                            <button key={c} onClick={() => setBrandColor(c)}
                              className={`w-6 h-6 rounded-full border-2 transition-all ${brandColor === c ? "border-[#0F172A] scale-110" : "border-transparent"}`}
                              style={{ backgroundColor: c }} />
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="Document Appearance" subtitle="How your branding appears on generated PDFs.">
                  <div className="space-y-0">
                    <div className="flex items-center justify-between gap-3 py-3 border-b border-[#F1F5F9]">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">Show logo on documents</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Include your logo at the top of every PDF</p>
                      </div>
                      <Toggle on={showLogoOnDocs} onToggle={() => setShowLogoOnDocs(v => !v)} />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-3 border-b border-[#F1F5F9]">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">Brand color header</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Use your brand color in document headers</p>
                      </div>
                      <Toggle on={brandColorHeader} onToggle={() => setBrandColorHeader(v => !v)} />
                    </div>
                    <div className="flex items-center justify-between gap-3 py-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">Include OTP verification stamp</p>
                        <p className="text-[11px] text-[#94A3B8] mt-0.5">Show client signature block on job cards</p>
                      </div>
                      <Toggle on={includeOtpStamp} onToggle={() => setIncludeOtpStamp(v => !v)} />
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-[#F1F5F9]">
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5">PDF Footer Text <span className="font-normal text-[#94A3B8]">(optional)</span></label>
                    <input value={pdfFooter} onChange={e => setPdfFooter(e.target.value)}
                      placeholder={`${companyName} · ${phone}`}
                      className="ff-input text-sm" />
                    <p className="text-[11px] text-[#94A3B8] mt-1">Appears at the bottom of every generated document</p>
                  </div>
                </SectionCard>
              </div>

              <div className="space-y-5">
                <SectionCard title="Live Preview" subtitle="How your brand color appears on documents.">
                  <div className="border border-[#E2E8F0] rounded-[12px] overflow-hidden">
                    <div className="p-4 text-white text-center" style={{ backgroundColor: brandColor }}>
                      <div className="w-8 h-8 bg-white/20 rounded-[8px] flex items-center justify-center mx-auto mb-2">
                        <span className="text-white font-extrabold text-sm">{companyName.charAt(0).toUpperCase()}</span>
                      </div>
                      <p className="font-bold text-sm">{companyName}</p>
                      <p className="text-white/80 text-xs mt-0.5">INVOICE</p>
                    </div>
                    <div className="p-4 bg-white space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-[#64748B]">Invoice #</span>
                        <span className="font-semibold text-[#0F172A]">INV-0001</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#64748B]">Client</span>
                        <span className="font-semibold text-[#0F172A]">Mrs. Wanjiku</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-[#64748B]">Amount</span>
                        <span className="font-bold text-[#0F172A]">KES 8,000</span>
                      </div>
                      <div className="h-px bg-[#E2E8F0] my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: brandColor }}>PAID</span>
                        <span className="text-[10px] text-[#94A3B8]">{pdfFooter || `${companyName} · ${phone}`}</span>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                <SectionCard title="WhatsApp Message Signature" subtitle="Appended to outgoing WhatsApp messages where applicable.">
                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-3.5">
                    <p className="text-xs text-[#64748B] leading-relaxed font-mono whitespace-pre-line">{`Your service is complete.\nAmount: KES 8,000\nService Code: 847291\n\n— ${companyName}`}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">Show company name in messages</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">Append your name at the end of WhatsApp messages</p>
                    </div>
                    <Toggle on={showCompanyNameInMessages} onToggle={() => setShowCompanyNameInMessages(v => !v)} />
                  </div>
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">Powered by FieldFlow</p>
                      <p className="text-[11px] text-[#94A3B8] mt-0.5">Show FieldFlow branding in messages</p>
                    </div>
                    <Toggle on={showPoweredBy} onToggle={() => setShowPoweredBy(v => !v)} />
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {/* ════════════════════════════ WHATSAPP ═══════════════════════════ */}
          {tab === "whatsapp" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-5">
                <div className={`rounded-[16px] border p-5 ${
                  whatsappSummary.connected
                    ? "border-[#86EFAC] bg-[#F0FDF4]"
                    : "border-[#FECACA] bg-[#FEF2F2]"
                }`}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center shrink-0 ${
                      whatsappSummary.connected ? "bg-[#22C55E]" : "bg-[#EF4444]"
                    }`}>
                      {whatsappSummary.connected ? <MessageCircle className="w-5 h-5 text-white" /> : <AlertTriangle className="w-5 h-5 text-white" />}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${whatsappSummary.connected ? "text-green-900" : "text-red-900"}`}>WhatsApp Business</p>
                      <p className={`text-xs mt-0.5 ${whatsappSummary.connected ? "text-[#15803D]" : "text-[#DC2626]"}`}>
                        {whatsappSummary.connected ? `${whatsappSummary.displayName} · ${whatsappSummary.phoneNumber}` : "No active sender configured"}
                      </p>
                    </div>
                    <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      whatsappSummary.connected ? "bg-green-200 text-[#166534]" : "bg-red-100 text-[#DC2626]"
                    }`}>
                      {whatsappSummary.connected ? whatsappSummary.status : "Not connected"}
                    </span>
                  </div>
                  <p className={`text-xs leading-relaxed mb-4 ${whatsappSummary.connected ? "text-[#166534]/80" : "text-[#991B1B]"}`}>
                    {whatsappSummary.connected
                      ? `${whatsappSummary.source}. ${whatsappSummary.activeSenderCount} active workspace sender${whatsappSummary.activeSenderCount === 1 ? "" : "s"}.`
                      : "Add a sender or configure the environment fallback before WhatsApp messages can be sent."}
                  </p>
                  <a href="/admin/settings/whatsapp"
                    className="inline-flex items-center gap-2 text-sm font-semibold bg-green-600 text-white px-4 py-2.5 rounded-[10px] hover:bg-green-700 transition-colors">
                    <MessageCircle className="w-4 h-4" /> Manage WhatsApp Senders
                  </a>
                </div>

                <SectionCard title="Message Settings" subtitle="Configure how WhatsApp messages are sent.">
                  <ControlledToggleRow icon={Bell} label="Job assignment notifications" subtitle="Notify worker via WhatsApp when a job is assigned" on={whatsappJobAssignments} onToggle={() => setWhatsappJobAssignments(v => !v)} />
                  <ControlledToggleRow icon={CheckCircle2} label="OTP completion messages" subtitle="Send OTP to client when worker reports done" on={whatsappOtpMessages} onToggle={() => setWhatsappOtpMessages(v => !v)} />
                  <ControlledToggleRow icon={FileText} label="Document delivery" subtitle="Send PDFs to clients after job verification" on={whatsappDocumentDelivery} onToggle={() => setWhatsappDocumentDelivery(v => !v)} />
                  <ControlledToggleRow icon={RefreshCw} label="Reassignment alerts" subtitle="Notify worker when a job is reassigned to them" on={whatsappReassignmentAlerts} onToggle={() => setWhatsappReassignmentAlerts(v => !v)} />
                  <ControlledToggleRow icon={MessageCircle} label="Client notifications" subtitle="Send client appointment and postponement updates" on={whatsappClientNotifications} onToggle={() => setWhatsappClientNotifications(v => !v)} />
                  <ControlledToggleRow icon={FileEdit} label="Quotation sending" subtitle="Allow quotation links and quote follow-ups to be sent through WhatsApp" on={whatsappQuotationSending} onToggle={() => setWhatsappQuotationSending(v => !v)} />
                  <ControlledToggleRow icon={Clock} label="Daily briefing" subtitle="Morning job schedule sent to each worker" on={briefingEnabled} onToggle={() => setBriefingEnabled(v => !v)} />
                </SectionCard>
              </div>

              <div className="space-y-5">
                <SectionCard title="Message Templates" subtitle="WhatsApp-approved templates for outbound notifications.">
                  <div className="space-y-2">
                    {[
                      { label: "Job Assignment",          status: "approved", desc: "Sent when admin assigns a job to a worker"          },
                      { label: "Service Completion OTP",  status: "approved", desc: "Sent to client with OTP after worker reports done"  },
                      { label: "Job Verified",            status: "approved", desc: "Sent to worker confirming OTP was accepted"         },
                      { label: "Client Notification",     status: "approved", desc: "General client updates"                             },
                      { label: "Quotation",               status: "pending",  desc: "Sent to client with a price quote"                  },
                    ].map(({ label, status, desc }) => (
                      <div key={label} className="flex items-center justify-between gap-3 py-3 border-b border-[#F1F5F9] last:border-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5">{desc}</p>
                        </div>
                        <span className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full
                          ${status === "approved" ? "bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]" : "bg-[#FFFBEB] text-[#D97706] border border-[#FEF3C7]"}`}>
                          {status === "approved" ? "Approved" : "Pending"}
                        </span>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Test WhatsApp" subtitle="Send a test message to verify your connection.">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#475569] mb-1.5">Phone number</label>
                      <input value={whatsappTestPhone} onChange={e => setWhatsappTestPhone(e.target.value)} className="ff-input text-sm" placeholder="+254 7XX XXX XXX" />
                    </div>
                    <button
                      type="button"
                      onClick={sendWhatsappTest}
                      disabled={isSendingWhatsappTest || !whatsappSummary.connected || !whatsappTestPhone.trim()}
                      className="ff-btn-secondary w-full justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <MessageCircle className="w-4 h-4 text-[#16A34A]" /> {isSendingWhatsappTest ? "Sending..." : "Send test message"}
                    </button>
                    {whatsappTestStatus && (
                      <p className={`rounded-[8px] border px-3 py-2 text-xs ${
                        whatsappTestStatus.includes("sent")
                          ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
                          : "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                      }`}>
                        {whatsappTestStatus}
                      </p>
                    )}
                  </div>
                </SectionCard>
              </div>
            </div>
          )}

          {/* ════════════════════════════ USERS & ROLES ═══════════════════════ */}
          {tab === "users" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              {/* Team list */}
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-[#0F172A]">Team Members</h3>
                    <p className="text-xs text-[#94A3B8] mt-0.5">Admins manage settings, managers run operations, viewers can inspect, and workers use WhatsApp.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setInviteFeedback(null); setShowInvite(true); }}
                    className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-sm font-semibold text-[#2563EB] hover:bg-[#DBEAFE]"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Invite
                  </button>
                </div>

                {inviteFeedback && (
                  <div className={`rounded-[12px] border px-4 py-3 text-sm ${
                    inviteFeedback.type === "ok"
                      ? "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
                      : "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                  }`}>
                    {inviteFeedback.msg}
                  </div>
                )}

                <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
                  {/* Header */}
                  <div className="px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] grid grid-cols-[1fr_auto_auto] gap-4">
                    <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">Member</p>
                    <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide w-20 text-center">Role</p>
                    <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide w-16 text-right">Actions</p>
                  </div>
                  {/* Rows */}
                  {teamMembers.map((m, i) => (
                    <div key={m.id} className="px-5 py-3.5 border-b border-[#F8FAFC] last:border-0 grid grid-cols-[1fr_auto_auto] gap-4 items-center">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${memberColor(i)}`}>
                          {initialsFor(m.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[#0F172A] truncate">{m.name}</p>
                          <p className="text-[11px] text-[#94A3B8] truncate">{m.email || m.phone}</p>
                        </div>
                      </div>
                      <div className="w-20 flex justify-center">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${rolePillClass(m.role)}`}>
                          {roleLabel(m.role)}
                        </span>
                      </div>
                      <div className="w-16 flex justify-end">
                        <button
                          disabled
                          className="text-[11px] font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] text-[#94A3B8] bg-[#F8FAFC] cursor-not-allowed"
                        >
                          {m.isActive ? "Active" : "Inactive"}
                        </button>
                      </div>
                    </div>
                  ))}
                  {teamMembers.length === 0 && (
                    <div className="px-5 py-10 text-center">
                      <Users className="mx-auto h-6 w-6 text-[#94A3B8]" />
                      <p className="mt-2 text-sm font-semibold text-[#475569]">No team members yet</p>
                      <p className="mt-1 text-xs text-[#94A3B8]">New workspaces start without demo workers or sample users.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Role info */}
              <div className="space-y-4">
                <SectionCard title="Roles & Permissions">
                  <div className="space-y-3">
                    {[
                      { role: "Admin", icon: Crown, color: "text-[#2563EB]", bg: "bg-[#EFF6FF]", perms: ["Full dashboard access", "Create & manage jobs", "View invoices & reports", "Manage workers & settings"] },
                      { role: "Manager", icon: Users, color: "text-[#16A34A]", bg: "bg-[#F0FDF4]", perms: ["Create and update jobs", "Manage clients and assets", "View invoices and documents", "No billing or settings access"] },
                      { role: "Viewer", icon: Eye, color: "text-[#7C3AED]", bg: "bg-[#F5F3FF]", perms: ["Read-only dashboard access", "View jobs, clients, assets, invoices, and documents", "No edits or destructive actions"] },
                      { role: "Worker / Technician", icon: Wrench, color: "text-[#64748B]", bg: "bg-[#F1F5F9]", perms: ["WhatsApp interface only", "Accept & complete jobs", "View own job schedule", "Report completion via OTP"] },
                    ].map(({ role, icon: Icon, color, bg, perms }) => (
                      <div key={role} className="p-3.5 rounded-[12px] border border-[#E2E8F0]">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`w-7 h-7 rounded-[8px] ${bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`w-3.5 h-3.5 ${color}`} />
                          </div>
                          <p className="text-sm font-semibold text-[#0F172A]">{role}</p>
                        </div>
                        <ul className="space-y-1">
                          {perms.map(p => (
                            <li key={p} className="flex items-start gap-1.5 text-xs text-[#64748B]">
                              <Check className="w-3 h-3 text-[#16A34A] shrink-0 mt-0.5" />{p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-[12px] p-4">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-[#92400E]">Workers use WhatsApp</p>
                      <p className="text-[11px] text-[#92400E]/80 mt-0.5 leading-relaxed">
                        Workers don&apos;t need dashboard access. They manage all jobs through WhatsApp messages.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════ BILLING ════════════════════════════ */}
          {tab === "billing" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
              <div className="lg:col-span-2 space-y-5">
                {/* Current plan */}
                <div className="bg-gradient-to-br from-[#2563EB] to-[#7C3AED] rounded-[16px] p-5 text-white">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-blue-200 uppercase tracking-wide mb-1">Current Plan</p>
                      <p className="text-2xl font-bold">{billingSummary.planName}</p>
                      <p className="text-sm text-blue-200 mt-0.5">Up to {billingSummary.workerLimit} workers · {billingSummary.jobLimit} jobs/month</p>
                    </div>
                    <span className="text-[10px] font-bold bg-white/20 text-white px-2.5 py-1 rounded-full">{billingSummary.planStatus}</span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-white/20 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{billingSummary.planPrice}<span className="text-sm font-normal text-blue-200">{billingSummary.planPrice === "Free" ? "" : "/mo"}</span></p>
                      <p className="text-xs text-blue-200 mt-0.5">
                        {billingSummary.planPrice === "Free" ? "Free tier · no credit card required" : "Billing is tracked from workspace settings"}
                      </p>
                    </div>
                    <button disabled className="bg-white/80 text-[#2563EB] text-sm font-semibold px-4 py-2 rounded-[10px] cursor-not-allowed">
                      Billing upgrade not active
                    </button>
                  </div>
                </div>

                {/* Plans comparison */}
                <SectionCard title="Available Plans">
                  <div className="space-y-3">
                    {[
                      { name: "Starter",      price: "Free",    workers: "3 workers",    jobs: "100 jobs/mo",  active: true  },
                      { name: "Growth",       price: "$29/mo",  workers: "10 workers",   jobs: "500 jobs/mo",  active: false },
                      { name: "Professional", price: "$79/mo",  workers: "Unlimited",    jobs: "Unlimited",    active: false },
                      { name: "Enterprise",   price: "Custom",  workers: "Unlimited",    jobs: "Unlimited",    active: false },
                    ].map(plan => (
                      <div key={plan.name}
                        className={`flex items-center justify-between gap-4 p-4 rounded-[12px] border transition-colors
                          ${plan.active ? "border-[#2563EB] bg-[#EFF6FF]/40" : "border-[#E2E8F0] hover:border-[#CBD5E1]"}`}>
                        <div className="flex items-center gap-3">
                          {plan.active && <span className="w-2 h-2 rounded-full bg-[#2563EB] shrink-0" />}
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">{plan.name}</p>
                            <p className="text-[11px] text-[#94A3B8] mt-0.5">{plan.workers} · {plan.jobs}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-sm font-bold text-[#0F172A]">{plan.price}</p>
                          {!plan.active && (
                            <button disabled className="text-[11px] font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] text-[#94A3B8] bg-[#F8FAFC] cursor-not-allowed">
                              Not active
                            </button>
                          )}
                          {plan.active && <span className="text-[11px] font-semibold text-[#2563EB]">Current</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                {/* Billing history */}
                <SectionCard title="Billing History">
                  <div className="text-center py-8">
                    <CreditCard className="w-8 h-8 text-[#E2E8F0] mx-auto mb-3" />
                    <p className="text-sm font-semibold text-[#475569]">No billing history</p>
                    <p className="text-xs text-[#94A3B8] mt-1">You&apos;re on the free plan — no charges yet.</p>
                  </div>
                </SectionCard>
              </div>

              {/* Right panel */}
              <div className="space-y-4">
                <SectionCard title="Usage This Month">
                  <div className="space-y-3">
                    {[
                      { label: "Jobs created",  used: billingSummary.jobsThisMonth, total: billingSummary.jobLimit,  color: "bg-[#2563EB]" },
                      { label: "Workers",        used: billingSummary.activeWorkerCount, total: billingSummary.workerLimit, color: "bg-[#22C55E]" },
                      { label: "PDFs generated", used: billingSummary.pdfsThisMonth, total: billingSummary.pdfLimit,  color: "bg-[#8B5CF6]" },
                      { label: "WhatsApp msgs",  used: billingSummary.whatsappMessagesThisMonth, total: billingSummary.whatsappLimit,  color: "bg-[#F59E0B]" },
                    ].map(({ label, used, total, color }) => (
                      <div key={label}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-[#64748B]">{label}</span>
                          <span className="font-semibold text-[#334155]">{used} / {total}</span>
                        </div>
                        <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, total > 0 ? (used / total) * 100 : 0)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Payment Method">
                  <div className="text-center py-6">
                    <CreditCard className="w-7 h-7 text-[#E2E8F0] mx-auto mb-2" />
                    <p className="text-xs text-[#94A3B8]">No payment method added</p>
                    <button disabled className="mt-3 text-xs font-semibold text-[#94A3B8] cursor-not-allowed">
                      Payment setup not active
                    </button>
                  </div>
                </SectionCard>
              </div>
            </div>
          )}


          {/* ════════════════════════════ DATA & PRIVACY ══════════════════════ */}
          {tab === "data" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
              <div className="space-y-5">
                <SectionCard title="Export Your Data" subtitle="Download a complete copy of all your business data.">
                  <div className="space-y-2">
                    {[
                      { icon: FileText, label: "Jobs & Job Cards",   desc: "All jobs, timelines, photos, and OTP records" },
                      { icon: CreditCard, label: "Invoices & Expenses", desc: "Full financial history in CSV and PDF" },
                      { icon: Users,    label: "Clients & Workers",  desc: "Contact list and worker profiles" },
                      { icon: Database, label: "Full Data Export",   desc: "Everything in a single ZIP archive" },
                    ].map(({ icon: Icon, label, desc }) => (
                      <div key={label} className="flex items-center justify-between gap-3 py-3 border-b border-[#F1F5F9] last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-[8px] bg-[#F1F5F9] flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-[#64748B]" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#0F172A]">{label}</p>
                            <p className="text-[11px] text-[#94A3B8]">{desc}</p>
                          </div>
                        </div>
                        <a href={`/api/settings/export?scope=${encodeURIComponent(label)}`} className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#E2E8F0] text-[#64748B] hover:border-[#2563EB]/40 hover:text-[#2563EB] hover:bg-[#EFF6FF]/30 transition-colors">
                          <Download className="w-3 h-3" /> Export
                        </a>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Data Retention" subtitle="Control how long your data is kept.">
                  <ControlledSelectRow icon={FileText} label="Completed jobs" subtitle="Keep closed job records for" options={["1 year", "2 years", "5 years", "Forever"]} value={completedJobsRetention} onChange={setCompletedJobsRetention} />
                  <ControlledSelectRow icon={CreditCard} label="Invoice records" subtitle="Retain invoice history for" options={["3 years", "5 years", "7 years", "Forever"]} value={invoiceRecordsRetention} onChange={setInvoiceRecordsRetention} />
                  <ControlledSelectRow icon={Database} label="Activity logs" subtitle="System audit logs kept for" options={["30 days", "90 days", "1 year"]} value={activityLogsRetention} onChange={setActivityLogsRetention} />
                </SectionCard>
              </div>

              <div className="space-y-5">
                <SectionCard title="Privacy Settings" subtitle="Manage how data is used in your workspace.">
                  <ControlledToggleRow icon={Eye} label="Analytics & Usage" subtitle="Allow FieldFlow to improve the product using anonymised usage data" on={analyticsUsage} onToggle={() => setAnalyticsUsage(v => !v)} />
                  <ControlledToggleRow icon={Bell} label="Product updates by email" subtitle="Receive release notes and feature announcements" on={productUpdatesEmail} onToggle={() => setProductUpdatesEmail(v => !v)} />
                  <ControlledToggleRow icon={Shield} label="Two-factor auth required" subtitle="Saved for admin access policy enforcement" on={requireTwoFactor} onToggle={() => setRequireTwoFactor(v => !v)} />
                </SectionCard>
                {dataActionStatus && (
                  <div className={`rounded-[12px] border px-4 py-3 text-sm ${
                    dataActionStatus.includes("Unable") || dataActionStatus.includes("Type")
                      ? "border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]"
                      : "border-[#BBF7D0] bg-[#F0FDF4] text-[#15803D]"
                  }`}>
                    {dataActionStatus}
                  </div>
                )}

                {/* Danger zone */}
                <div className="bg-white rounded-[16px] border border-[#FECACA] overflow-hidden">
                  <div className="px-5 py-3.5 border-b border-[#FEE2E2] bg-[#FFF1F2]/50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                      <h3 className="text-sm font-semibold text-[#DC2626]">Danger Zone</h3>
                    </div>
                    <p className="text-xs text-[#EF4444]/80 mt-0.5">These actions are permanent and cannot be undone.</p>
                  </div>
                  <div className="px-5 py-4 space-y-3">
                    {[
                      { action: "clear_job_history", title: "Delete all job history", desc: "Permanently remove jobs, invoices, job cards, and job notifications", confirmation: "DELETE JOB HISTORY", enabled: true },
                      { action: "reset_workspace", title: "Reset workspace", desc: "Clear jobs, clients, assets, workers, invoices, expenses, notifications, and reopen onboarding", confirmation: "RESET WORKSPACE", enabled: true },
                      { action: "delete_workspace", title: "Delete workspace", desc: "Permanently delete your workspace and all associated data", confirmation: "DELETE WORKSPACE", enabled: false },
                    ].map(({ action, title, desc, confirmation, enabled }) => (
                      <div key={action} className="flex items-center justify-between gap-4 py-2.5 border-b border-red-50 last:border-0">
                        <div>
                          <p className="text-sm font-semibold text-[#0F172A]">{title}</p>
                          <p className="text-[11px] text-[#94A3B8] mt-0.5">{desc}</p>
                        </div>
                        <button
                          type="button"
                          disabled={!enabled}
                          onClick={() => {
                            setDataAction({
                              action: action as DataAction["action"],
                              title,
                              description: desc,
                              confirmation,
                              enabled,
                            });
                            setDataActionInput("");
                            setDataActionStatus("");
                          }}
                          className="shrink-0 text-[11px] font-semibold px-2.5 py-1.5 rounded-[6px] border border-[#FECACA] text-[#DC2626] bg-[#FFF1F2] hover:bg-[#FEE2E2] cursor-pointer disabled:text-[#DC2626]/60 disabled:cursor-not-allowed whitespace-nowrap"
                          title={enabled ? `Type ${confirmation} to confirm` : "Workspace deletion requires a separate support-assisted flow"}
                        >
                          {enabled ? "Confirm" : "Support only"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
              <div>
                <h3 className="font-semibold text-[#0F172A]">Invite Team Member</h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">Create an account with the correct dashboard role.</p>
              </div>
              <button onClick={() => setShowInvite(false)} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[#94A3B8]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={inviteTeamMember} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Full Name</label>
                  <input name="name" required className="ff-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Role</label>
                  <select name="role" defaultValue="MANAGER" className="ff-input text-sm">
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="VIEWER">Viewer</option>
                    <option value="TECHNICIAN">Worker</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Phone</label>
                  <input name="phone" required placeholder="+254..." className="ff-input text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Email</label>
                  <input name="email" type="email" placeholder="optional" className="ff-input text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Temporary Password</label>
                <input name="password" type="password" required minLength={6} className="ff-input text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#475569] mb-1.5">Base Zone</label>
                <input name="baseZone" placeholder="Optional, mainly for workers" className="ff-input text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowInvite(false)} className="ff-btn-secondary flex-1 justify-center text-sm">Cancel</button>
                <button type="submit" disabled={isPending} className="ff-btn-primary flex-1 justify-center text-sm disabled:opacity-50">
                  {isPending ? "Adding..." : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editing && (
        <EditModal label={editing.label} value={editing.value} onClose={() => setEditing(null)} onSave={editing.onSave} />
      )}

      {dataAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-[16px] border border-[#FECACA] bg-white shadow-2xl">
            <div className="border-b border-[#FEE2E2] bg-[#FFF1F2] px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#FEE2E2]">
                  <AlertTriangle className="h-4 w-4 text-[#DC2626]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#991B1B]">{dataAction.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-[#B91C1C]">{dataAction.description}</p>
                </div>
              </div>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm leading-6 text-[#475569]">
                Type <span className="font-mono font-bold text-[#0F172A]">{dataAction.confirmation}</span> to continue.
              </p>
              <input
                value={dataActionInput}
                onChange={(event) => setDataActionInput(event.target.value)}
                className="ff-input text-sm"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDataAction(null);
                    setDataActionInput("");
                  }}
                  className="ff-btn-secondary flex-1 justify-center text-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={runDataAction}
                  disabled={isRunningDataAction || dataActionInput !== dataAction.confirmation}
                  className="flex-1 justify-center rounded-[10px] border border-[#DC2626] bg-[#DC2626] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isRunningDataAction ? "Working..." : "Confirm action"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
