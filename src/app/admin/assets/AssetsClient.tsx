"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, MapPin, Package, X, ChevronRight,
  Truck, Zap, Droplets, Shield, MoreHorizontal,
  Hash, Wrench, Filter, Sun, Building2, Cpu,
  HardDrive, Container, Gauge, LayoutGrid, List,
} from "lucide-react";
import { createAsset, updateAsset, deleteAsset } from "@/app/actions/asset-actions";
import { formatDate } from "@/lib/utils";

interface AssetRow {
  id: string; name: string; assetType: string;
  identifier: string | null; serialNumber: string | null;
  registrationNumber: string | null;
  clientName: string; clientPhone: string | null;
  location: string | null; zone: string | null;
  installationDate: Date | string | null;
  warrantyExpiryDate: Date | string | null;
  lastServiceDate: Date | string | null;
  notes: string | null;
  imageUrl: string | null;
  _count: { jobs: number };
}

const COMMON_ASSET_TYPES = [
  "Plastic Tank", "Steel Tank", "Underground Tank", "Vehicle",
  "Fuel Sensor", "Tracker Device", "Inverter", "Solar Panel", "Building", "Other",
];

// ── Asset type icon/color map ─────────────────────────────────────────────────
function assetMeta(type: string): { icon: React.ElementType; color: string; bg: string } {
  const t = type.toLowerCase();
  if (t.includes("plastic tank") || t.includes("water tank") || t.includes("tank"))
    return { icon: Container,  color: "text-[#2563EB]",   bg: "bg-[#EFF6FF]"   };
  if (t.includes("underground"))
    return { icon: Droplets,   color: "text-[#0891B2]",   bg: "bg-[#ECFEFF]"   };
  if (t.includes("vehicle") || t.includes("car") || t.includes("truck"))
    return { icon: Truck,      color: "text-[#D97706]",  bg: "bg-[#FFFBEB]"  };
  if (t.includes("tracker") || t.includes("gps"))
    return { icon: Gauge,      color: "text-[#9333EA]", bg: "bg-[#F5F3FF]" };
  if (t.includes("sensor") || t.includes("fuel sensor"))
    return { icon: Gauge,      color: "text-[#EA580C]", bg: "bg-[#FFF7ED]" };
  if (t.includes("device") || t.includes("sim"))
    return { icon: Cpu,        color: "text-[#4F46E5]", bg: "bg-[#EEF2FF]" };
  if (t.includes("solar") || t.includes("panel"))
    return { icon: Sun,        color: "text-[#CA8A04]", bg: "bg-[#FEFCE8]" };
  if (t.includes("inverter") || t.includes("battery"))
    return { icon: Zap,        color: "text-[#16A34A]",  bg: "bg-[#F0FDF4]"  };
  if (t.includes("building") || t.includes("site") || t.includes("office"))
    return { icon: Building2,  color: "text-[#475569]",  bg: "bg-[#F1F5F9]" };
  if (t.includes("equipment") || t.includes("tool") || t.includes("pump"))
    return { icon: Wrench,     color: "text-[#475569]",  bg: "bg-[#F1F5F9]" };
  if (t.includes("server") || t.includes("computer") || t.includes("it"))
    return { icon: HardDrive,  color: "text-[#3B82F6]",   bg: "bg-[#EFF6FF]"   };
  return { icon: Package, color: "text-[#64748B]", bg: "bg-[#F1F5F9]" };
}

function warrantyStatus(date: Date | string | null): { label: string; color: string; bg: string } | null {
  if (!date) return null;
  const expiry = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const days = Math.floor((expiry.getTime() - now.getTime()) / 86400000);
  if (days < 0)   return { label: "Expired", color: "text-[#DC2626]", bg: "bg-[#FFF1F2]" };
  if (days < 30)  return { label: `${days}d left`, color: "text-[#D97706]", bg: "bg-[#FFFBEB]" };
  return { label: "Active", color: "text-[#16A34A]", bg: "bg-[#F0FDF4]" };
}

// ── Field helper ──────────────────────────────────────────────────────────────
function Field({ label, name, type = "text", placeholder, required, defaultValue }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#475569] mb-1.5">{label}{required && <span className="text-[#F87171] ml-0.5">*</span>}</label>
      <input type={type} name={name} placeholder={placeholder} required={required} defaultValue={defaultValue}
        className="ff-input text-sm" />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-md flex flex-col max-h-[90dvh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] shrink-0">
          <h2 className="font-bold text-[#0F172A]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[#94A3B8]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Asset Form ────────────────────────────────────────────────────────────────
function AssetForm({ zones, allTypes, isPending, initial, onSubmit, onCancel }: {
  zones: string[]; allTypes: string[]; isPending: boolean;
  initial?: AssetRow;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  function dateValue(v: Date | string | null | undefined): string {
    if (!v) return "";
    const d = typeof v === "string" ? new Date(v) : v;
    return d.toISOString().slice(0, 10);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <Field label="Asset Name" name="name" required defaultValue={initial?.name} placeholder="e.g. Mrs. Wanjiku's 5000L tank" />

      <div>
        <label className="block text-xs font-semibold text-[#475569] mb-1.5">Asset Type <span className="text-[#F87171]">*</span></label>
        <input name="assetType" required list="asset-types" defaultValue={initial?.assetType}
          className="ff-input text-sm" placeholder="Plastic Tank, Vehicle, Inverter…" />
        <datalist id="asset-types">{allTypes.map(t => <option key={t} value={t} />)}</datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Client Name" name="clientName" required defaultValue={initial?.clientName} />
        <Field label="Client Phone" name="clientPhone" placeholder="+254…" defaultValue={initial?.clientPhone ?? ""} />
      </div>

      <Field label="Location" name="location" defaultValue={initial?.location ?? ""} />

      <div>
        <label className="block text-xs font-semibold text-[#475569] mb-1.5">Zone</label>
        <select name="zone" defaultValue={initial?.zone ?? ""} className="ff-input text-sm">
          <option value="">No zone</option>
          {zones.map(z => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>

      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-[#64748B] hover:text-[#334155] py-1 select-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span> Identifiers (optional)
        </summary>
        <div className="space-y-3 pt-2 pl-3 border-l-2 border-[#E2E8F0] ml-1">
          <Field label="Free-form Identifier" name="identifier" defaultValue={initial?.identifier ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serial Number" name="serialNumber" defaultValue={initial?.serialNumber ?? ""} />
            <Field label="Registration No." name="registrationNumber" defaultValue={initial?.registrationNumber ?? ""} />
          </div>
        </div>
      </details>

      <details className="group">
        <summary className="cursor-pointer text-xs font-semibold text-[#64748B] hover:text-[#334155] py-1 select-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span> Dates & Notes (optional)
        </summary>
        <div className="space-y-3 pt-2 pl-3 border-l-2 border-[#E2E8F0] ml-1">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Installation Date" name="installationDate" type="date" defaultValue={dateValue(initial?.installationDate)} />
            <Field label="Warranty Expiry" name="warrantyExpiryDate" type="date" defaultValue={dateValue(initial?.warrantyExpiryDate)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">Notes</label>
            <textarea name="notes" defaultValue={initial?.notes ?? ""} rows={3}
              className="ff-input text-sm resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#475569] mb-1.5">
              Asset Image URL <span className="font-normal text-[#94A3B8]">(optional)</span>
            </label>
            <input type="url" name="imageUrl" defaultValue={initial?.imageUrl ?? ""}
              placeholder="https://…" className="ff-input text-sm" />
            <p className="text-[11px] text-[#94A3B8] mt-1">Paste a direct image link. Leave blank to use the auto-generated icon.</p>
          </div>
        </div>
      </details>

      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="ff-btn-secondary flex-1 text-sm">Cancel</button>
        <button type="submit" disabled={isPending} className="ff-btn-primary flex-1 text-sm disabled:opacity-50">
          {isPending ? "Saving…" : initial ? "Save Changes" : "Add Asset"}
        </button>
      </div>
    </form>
  );
}

// ── Asset thumbnail (image or icon placeholder) ───────────────────────────────
function AssetThumbnail({ asset }: { asset: AssetRow }) {
  const meta = assetMeta(asset.assetType);
  if (asset.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={asset.imageUrl}
        alt={asset.name}
        className="h-28 w-full object-cover rounded-t-[16px] sm:h-32"
      />
    );
  }
  return (
    <div className={`h-28 w-full flex items-center justify-center rounded-t-[16px] sm:h-32 ${meta.bg}`}>
      <meta.icon className={`w-9 h-9 ${meta.color} opacity-70`} />
    </div>
  );
}

// ── Asset Card ────────────────────────────────────────────────────────────────
function AssetCard({ a, onEdit, onDelete }: { a: AssetRow; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta    = assetMeta(a.assetType);
  const warrant = warrantyStatus(a.warrantyExpiryDate);

  return (
    <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card hover:shadow-card-hover hover:border-[#2563EB]/20 transition-all group flex flex-col">

      {/* Optional image / placeholder — click goes to detail */}
      <Link href={`/admin/assets/${a.id}`} className="block relative overflow-hidden rounded-t-[16px]">
        <AssetThumbnail asset={a} />
        {/* More menu overlay */}
        <div className="absolute top-2 right-2">
          <button
            onClick={e => { e.preventDefault(); setMenuOpen(v => !v); }}
            className="p-1.5 rounded-[8px] bg-white/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-white text-[#64748B] shadow-sm transition-all">
            <MoreHorizontal className="w-3.5 h-3.5" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-[10px] border border-[#E2E8F0] shadow-card py-1 z-20 w-36">
              <Link href={`/admin/assets/${a.id}`} onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC]">
                <Package className="w-3.5 h-3.5" /> View Asset
              </Link>
              <button onClick={() => { setMenuOpen(false); onEdit(); }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC] w-full text-left">
                <Wrench className="w-3.5 h-3.5" /> Edit
              </button>
              <button onClick={() => { setMenuOpen(false); onDelete(); }}
                className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#DC2626] hover:bg-[#FFF1F2] w-full text-left">
                <X className="w-3.5 h-3.5" /> Delete
              </button>
            </div>
          )}
        </div>
      </Link>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Name + type badge */}
        <div className="mb-3">
          <Link href={`/admin/assets/${a.id}`}
            className="font-semibold text-[#0F172A] hover:text-[#2563EB] text-sm leading-snug block transition-colors line-clamp-1">
            {a.name}
          </Link>
          <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] mt-1 ${meta.bg} ${meta.color}`}>
            {a.assetType}
          </span>
        </div>

        {/* Client + location */}
        <div className="space-y-1 mb-3 flex-1">
          <p className="text-xs text-[#64748B] font-medium truncate">{a.clientName}</p>
          {a.location && (
            <p className="text-xs text-[#94A3B8] flex items-center gap-1.5 truncate">
              <MapPin className="w-3 h-3 shrink-0" />{a.location}
            </p>
          )}
          {(a.serialNumber ?? a.registrationNumber) && (
            <p className="text-xs text-[#94A3B8] flex items-center gap-1.5 truncate">
              <Hash className="w-3 h-3 shrink-0" />{a.serialNumber ?? a.registrationNumber}
            </p>
          )}
        </div>

        {/* Warranty badge */}
        {warrant && (
          <div className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-[4px] mb-3 ${warrant.bg} ${warrant.color}`}>
            <Shield className="w-3 h-3" /> {warrant.label}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-0 pt-3 border-t border-[#F1F5F9]">
          <div className="text-center border-r border-[#F1F5F9]">
            <p className="text-[10px] text-[#94A3B8]">Jobs</p>
            <p className="text-sm font-bold text-[#0F172A]">{a._count.jobs}</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#94A3B8]">Last Service</p>
            <p className="text-xs font-medium text-[#334155]">
              {a.lastServiceDate ? formatDate(a.lastServiceDate) : "—"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetRowView({ a, onEdit, onDelete }: { a: AssetRow; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta = assetMeta(a.assetType);
  const warrant = warrantyStatus(a.warrantyExpiryDate);
  const Icon = meta.icon;

  return (
    <div className="flex items-center gap-3 border-b border-[#F1F5F9] px-4 py-3.5 last:border-0 hover:bg-[#F8FAFC] transition-colors">
      <Link href={`/admin/assets/${a.id}`} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] ${meta.bg}`}>
        {a.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.imageUrl} alt={a.name} className="h-11 w-11 rounded-[10px] object-cover" />
        ) : (
          <Icon className={`h-5 w-5 ${meta.color}`} />
        )}
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/admin/assets/${a.id}`} className="truncate text-sm font-semibold text-[#0F172A] hover:text-[#2563EB]">
            {a.name}
          </Link>
          <span className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${meta.bg} ${meta.color}`}>{a.assetType}</span>
          {warrant && (
            <span className={`rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold ${warrant.bg} ${warrant.color}`}>{warrant.label}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#94A3B8]">
          <span className="font-medium text-[#64748B]">{a.clientName}</span>
          {a.location && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{a.location}</span>}
          {(a.serialNumber ?? a.registrationNumber ?? a.identifier) && (
            <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" />{a.serialNumber ?? a.registrationNumber ?? a.identifier}</span>
          )}
          <span>{a._count.jobs} job{a._count.jobs === 1 ? "" : "s"}</span>
          <span>Last service: {a.lastServiceDate ? formatDate(a.lastServiceDate) : "—"}</span>
        </div>
      </div>
      <Link href={`/admin/assets/${a.id}`} className="hidden sm:inline-flex min-h-9 items-center rounded-[8px] border border-[#DBEAFE] bg-[#EFF6FF] px-3 py-2 text-xs font-semibold text-[#2563EB] hover:bg-[#DBEAFE]">
        View Asset
      </Link>
      <div className="relative">
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="inline-flex min-h-9 min-w-9 items-center justify-center rounded-[8px] border border-[#E2E8F0] p-2 text-[#94A3B8] hover:bg-[#F8FAFC] hover:text-[#475569]"
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </button>
        {menuOpen && (
          <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-[10px] border border-[#E2E8F0] bg-white py-1 shadow-card">
            <button onClick={() => { setMenuOpen(false); onEdit(); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[#334155] hover:bg-[#F8FAFC]">
              <Wrench className="h-3.5 w-3.5" /> Edit
            </button>
            <button onClick={() => { setMenuOpen(false); onDelete(); }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[#DC2626] hover:bg-[#FFF1F2]">
              <X className="h-3.5 w-3.5" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function AssetsClient({ assets, knownTypes, zones, currentSearch, currentType }: {
  assets: AssetRow[]; knownTypes: string[]; zones: string[];
  currentSearch?: string; currentType?: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<AssetRow | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "rows">("grid");
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const allTypes = Array.from(new Set([...knownTypes, ...COMMON_ASSET_TYPES])).sort();

  useEffect(() => {
    const editId = params.get("edit");
    if (!editId) return;
    const target = assets.find((asset) => asset.id === editId);
    if (target) setEditing(target);
  }, [assets, params]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    router.push(`/admin/assets?${next.toString()}`);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createAsset(fd);
      if (res.error) setFeedback(res.error);
      else { setShowAdd(false); setFeedback("Asset added."); router.refresh(); }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", editing!.id);
    startTransition(async () => {
      const res = await updateAsset(fd);
      if (res.error) setFeedback(res.error);
      else { setEditing(null); router.refresh(); }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this asset? This can't be undone.")) return;
    startTransition(async () => {
      const res = await deleteAsset(id);
      if (res.error) setFeedback(res.error);
      else router.refresh();
    });
  }

  // Summary stats
  const warrantyExpiredCount = assets.filter(a => {
    if (!a.warrantyExpiryDate) return false;
    return new Date(a.warrantyExpiryDate) < new Date();
  }).length;
  const warrantyActiveCount = assets.filter(a => {
    if (!a.warrantyExpiryDate) return false;
    return new Date(a.warrantyExpiryDate) >= new Date();
  }).length;

  return (
    <div className="space-y-5">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ff-page-title">Assets</h1>
          <p className="ff-page-desc">{assets.length} total · {warrantyActiveCount} under warranty</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="ff-btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      {/* ── Summary metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Assets", value: assets.length.toString(), color: "text-[#2563EB]", bg: "bg-[#EFF6FF]", icon: Package },
          { label: "Types", value: knownTypes.length.toString(), color: "text-[#7C3AED]", bg: "bg-[#F5F3FF]", icon: Filter },
          { label: "Under Warranty", value: warrantyActiveCount.toString(), color: "text-[#16A34A]", bg: "bg-[#F0FDF4]", icon: Shield },
          { label: "Warranty Expired", value: warrantyExpiredCount.toString(), color: warrantyExpiredCount > 0 ? "text-[#DC2626]" : "text-[#94A3B8]", bg: warrantyExpiredCount > 0 ? "bg-[#FFF1F2]" : "bg-[#F1F5F9]", icon: Shield },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[10px] ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] font-medium">{label}</p>
              <p className={`text-lg font-bold leading-tight ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
            <input defaultValue={currentSearch ?? ""} placeholder="Search by name, client, serial…"
              onKeyDown={e => { if (e.key === "Enter") updateFilter("search", e.currentTarget.value); }}
              className="ff-input pl-9 text-sm" />
          </div>
          <div className="min-w-[160px]">
            <select value={currentType ?? ""} onChange={e => updateFilter("type", e.target.value)}
              className="ff-input text-sm">
              <option value="">All types</option>
              {knownTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(currentSearch || currentType) && (
            <button onClick={() => router.push("/admin/assets")}
              className="text-xs text-[#64748B] hover:text-[#334155] underline underline-offset-2">
              Clear filters
            </button>
          )}
          <div className="ml-auto flex items-center gap-1 rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors ${viewMode === "grid" ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B] hover:text-[#334155]"}`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Grid
            </button>
            <button
              type="button"
              onClick={() => setViewMode("rows")}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-[8px] px-3 py-2 text-xs font-semibold transition-colors ${viewMode === "rows" ? "bg-white text-[#2563EB] shadow-sm" : "text-[#64748B] hover:text-[#334155]"}`}
            >
              <List className="h-3.5 w-3.5" /> Rows
            </button>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="flex items-center justify-between text-sm px-4 py-3 rounded-[10px] bg-[#F0FDF4] text-[#15803D] border border-[#86EFAC]">
          {feedback}
          <button onClick={() => setFeedback("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Asset Grid ───────────────────────────────────────────────────── */}
      {assets.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
            <Package className="w-6 h-6 text-[#94A3B8]" />
          </div>
          <p className="text-sm font-semibold text-[#475569]">
            {currentSearch || currentType ? "No assets match your filters" : "No assets yet"}
          </p>
          {!currentSearch && !currentType && (
            <button onClick={() => setShowAdd(true)} className="ff-btn-primary text-sm px-4 py-2 mt-1 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Asset
            </button>
          )}
        </div>
      ) : viewMode === "rows" ? (
        <div className="overflow-hidden rounded-[16px] border border-[#E2E8F0] bg-white shadow-card">
          {assets.map(a => (
            <AssetRowView key={a.id} a={a} onEdit={() => setEditing(a)} onDelete={() => handleDelete(a.id)} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {assets.map(a => (
            <AssetCard key={a.id} a={a} onEdit={() => setEditing(a)} onDelete={() => handleDelete(a.id)} />
          ))}
        </div>
      )}

      {showAdd && (
        <Modal title="Add Asset" onClose={() => setShowAdd(false)}>
          <AssetForm zones={zones} allTypes={allTypes} isPending={isPending}
            onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}
      {editing && (
        <Modal title="Edit Asset" onClose={() => setEditing(null)}>
          <AssetForm zones={zones} allTypes={allTypes} isPending={isPending}
            initial={editing} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}
