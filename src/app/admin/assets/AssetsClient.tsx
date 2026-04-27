"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, MapPin, Package, X, ChevronRight,
  Truck, Zap, Droplets, Shield, MoreHorizontal,
  Hash, Wrench, Filter,
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
  _count: { jobs: number };
}

const COMMON_ASSET_TYPES = [
  "Plastic Tank", "Steel Tank", "Underground Tank", "Vehicle",
  "Fuel Sensor", "Tracker Device", "Inverter", "Solar Panel", "Building", "Other",
];

// ── Asset type icon/color map ─────────────────────────────────────────────────
function assetMeta(type: string): { icon: React.ElementType; color: string; bg: string } {
  const t = type.toLowerCase();
  if (t.includes("tank"))    return { icon: Droplets, color: "text-blue-600",   bg: "bg-blue-50" };
  if (t.includes("vehicle")) return { icon: Truck,    color: "text-amber-600",  bg: "bg-amber-50" };
  if (t.includes("tracker") || t.includes("device") || t.includes("sensor"))
                             return { icon: Zap,      color: "text-purple-600", bg: "bg-purple-50" };
  if (t.includes("solar") || t.includes("inverter"))
                             return { icon: Zap,      color: "text-green-600",  bg: "bg-green-50" };
  return { icon: Package, color: "text-slate-600", bg: "bg-slate-100" };
}

function warrantyStatus(date: Date | string | null): { label: string; color: string; bg: string } | null {
  if (!date) return null;
  const expiry = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const days = Math.floor((expiry.getTime() - now.getTime()) / 86400000);
  if (days < 0)   return { label: "Expired", color: "text-[#DC2626]", bg: "bg-red-50" };
  if (days < 30)  return { label: `${days}d left`, color: "text-[#D97706]", bg: "bg-amber-50" };
  return { label: "Active", color: "text-[#16A34A]", bg: "bg-green-50" };
}

// ── Field helper ──────────────────────────────────────────────────────────────
function Field({ label, name, type = "text", placeholder, required, defaultValue }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#475569] mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
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
        <label className="block text-xs font-semibold text-[#475569] mb-1.5">Asset Type <span className="text-red-400">*</span></label>
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

// ── Asset Card ────────────────────────────────────────────────────────────────
function AssetCard({ a, onEdit, onDelete }: { a: AssetRow; onEdit: () => void; onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const meta    = assetMeta(a.assetType);
  const warrant = warrantyStatus(a.warrantyExpiryDate);

  return (
    <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card hover:shadow-card-hover hover:border-[#2563EB]/20 transition-all group">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 ${meta.bg}`}>
            <meta.icon className={`w-5 h-5 ${meta.color}`} />
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/admin/assets/${a.id}`}
              className="font-semibold text-[#0F172A] hover:text-[#2563EB] text-sm truncate block transition-colors">
              {a.name}
            </Link>
            <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] mt-0.5 ${meta.bg} ${meta.color}`}>
              {a.assetType}
            </span>
          </div>
          {/* More menu */}
          <div className="relative shrink-0">
            <button onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#F8FAFC] text-[#94A3B8] transition-all">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-[10px] border border-[#E2E8F0] shadow-card py-1 z-20 w-36">
                <Link href={`/admin/assets/${a.id}`} onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC]">
                  <Package className="w-3.5 h-3.5" /> View
                </Link>
                <button onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC] w-full text-left">
                  <Wrench className="w-3.5 h-3.5" /> Edit
                </button>
                <button onClick={() => { setMenuOpen(false); onDelete(); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#DC2626] hover:bg-red-50 w-full text-left">
                  <X className="w-3.5 h-3.5" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Client + location */}
        <div className="space-y-1.5 mb-4">
          <p className="text-xs text-[#64748B] font-medium truncate">{a.clientName}</p>
          {a.location && (
            <p className="text-xs text-[#94A3B8] flex items-center gap-1.5 truncate">
              <MapPin className="w-3 h-3 shrink-0" />{a.location}
            </p>
          )}
          {a.serialNumber && (
            <p className="text-xs text-[#94A3B8] flex items-center gap-1.5">
              <Hash className="w-3 h-3 shrink-0" />SN: {a.serialNumber}
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

      {/* Footer */}
      <div className="border-t border-[#F1F5F9] px-5 py-3 flex items-center justify-end bg-[#FAFBFC] rounded-b-[16px]">
        <Link href={`/admin/assets/${a.id}`}
          className="inline-flex items-center gap-1 text-xs text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
          View <ChevronRight className="w-3.5 h-3.5" />
        </Link>
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
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const allTypes = Array.from(new Set([...knownTypes, ...COMMON_ASSET_TYPES])).sort();

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
          { label: "Total Assets", value: assets.length.toString(), color: "text-[#2563EB]", bg: "bg-blue-50", icon: Package },
          { label: "Types", value: knownTypes.length.toString(), color: "text-[#7C3AED]", bg: "bg-purple-50", icon: Filter },
          { label: "Under Warranty", value: warrantyActiveCount.toString(), color: "text-[#16A34A]", bg: "bg-green-50", icon: Shield },
          { label: "Warranty Expired", value: warrantyExpiredCount.toString(), color: warrantyExpiredCount > 0 ? "text-[#DC2626]" : "text-[#94A3B8]", bg: warrantyExpiredCount > 0 ? "bg-red-50" : "bg-[#F1F5F9]", icon: Shield },
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
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="flex items-center justify-between text-sm px-4 py-3 rounded-[10px] bg-green-50 text-green-700 border border-green-200">
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
