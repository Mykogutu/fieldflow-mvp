"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, MapPin, Phone, Building2, User, X,
  ChevronRight, AlertCircle, MoreHorizontal, Mail,
  Briefcase, TrendingUp, Users, DollarSign,
} from "lucide-react";
import { createClient, updateClient, deactivateClient } from "@/app/actions/client-actions";
import { formatKES, formatDate } from "@/lib/utils";

interface Client {
  id: string; name: string; phone: string; email: string | null;
  company: string | null; location: string | null; type: string; isActive: boolean;
  createdAt: Date | string;
  jobCount: number;
  outstanding: number;
  lastJobDate: Date | null;
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
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-md max-h-[90dvh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] shrink-0">
          <h2 className="font-bold text-[#0F172A]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[#94A3B8] hover:text-[#475569] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ── Client Form ───────────────────────────────────────────────────────────────
function ClientForm({ isPending, onSubmit, onCancel, defaultValues }: {
  isPending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  defaultValues?: Partial<Client>;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name" name="name" required defaultValue={defaultValues?.name} />
        <Field label="Phone" name="phone" placeholder="+254…" required defaultValue={defaultValues?.phone} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email" name="email" type="email" placeholder="optional" defaultValue={defaultValues?.email ?? ""} />
        <Field label="Company" name="company" placeholder="optional" defaultValue={defaultValues?.company ?? ""} />
      </div>
      <Field label="Location" name="location" placeholder="Nairobi, Karen…" defaultValue={defaultValues?.location ?? ""} />
      {!defaultValues && <Field label="Notes" name="address" placeholder="Optional notes…" />}
      <div>
        <label className="block text-xs font-semibold text-[#475569] mb-1.5">Client Type</label>
        <select name="type" defaultValue={defaultValues?.type ?? "INDIVIDUAL"}
          className="ff-input text-sm">
          <option value="INDIVIDUAL">Individual</option>
          <option value="COMPANY">Company</option>
        </select>
      </div>
      <div className="flex gap-2 pt-3">
        <button type="button" onClick={onCancel} className="ff-btn-secondary flex-1 text-sm">Cancel</button>
        <button type="submit" disabled={isPending} className="ff-btn-primary flex-1 text-sm disabled:opacity-50">
          {isPending ? "Saving…" : defaultValues ? "Save Changes" : "Add Client"}
        </button>
      </div>
    </form>
  );
}

// ── Client Avatar ─────────────────────────────────────────────────────────────
function ClientAvatar({ name, size = "md" }: { name: string; size?: "sm" | "md" | "lg" }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
    "bg-green-100 text-green-700", "bg-amber-100 text-amber-700",
    "bg-indigo-100 text-indigo-700", "bg-pink-100 text-pink-700",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  const sz = size === "lg" ? "w-14 h-14 text-lg" : size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} rounded-full flex items-center justify-center font-bold shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

// ── Client Card ───────────────────────────────────────────────────────────────
function ClientCard({ c, onEdit }: { c: Client; onEdit: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card hover:shadow-card-hover hover:border-[#2563EB]/20 transition-all group">
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start gap-3 mb-4">
          <ClientAvatar name={c.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <Link href={`/admin/clients/${c.id}`}
                className="font-semibold text-[#0F172A] hover:text-[#2563EB] truncate text-sm transition-colors">
                {c.name}
              </Link>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] shrink-0
                ${c.type === "COMPANY" ? "bg-blue-50 text-blue-700 border border-blue-100" : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"}`}>
                {c.type === "COMPANY" ? "Co." : "Ind."}
              </span>
            </div>
            {c.company && (
              <p className="text-[11px] text-[#94A3B8] flex items-center gap-1 truncate">
                <Building2 className="w-3 h-3 shrink-0" />{c.company}
              </p>
            )}
          </div>
          {/* More menu */}
          <div className="relative shrink-0">
            <button onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-[#F8FAFC] text-[#94A3B8] hover:text-[#475569] transition-all">
              <MoreHorizontal className="w-4 h-4" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-[10px] border border-[#E2E8F0] shadow-card py-1 z-20 w-36">
                <Link href={`/admin/clients/${c.id}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC]">
                  <User className="w-3.5 h-3.5" /> View Profile
                </Link>
                <button onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC] w-full text-left">
                  <Briefcase className="w-3.5 h-3.5" /> Edit
                </button>
                <a href={`https://wa.me/${c.phone.replace("+", "")}`}
                  target="_blank" rel="noopener noreferrer"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC]">
                  <Phone className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Contact info */}
        <div className="space-y-1.5">
          <p className="text-xs text-[#64748B] flex items-center gap-2">
            <Phone className="w-3 h-3 text-[#94A3B8] shrink-0" />{c.phone}
          </p>
          {c.email && (
            <p className="text-xs text-[#64748B] flex items-center gap-2 truncate">
              <Mail className="w-3 h-3 text-[#94A3B8] shrink-0" />{c.email}
            </p>
          )}
          {c.location && (
            <p className="text-xs text-[#64748B] flex items-center gap-2 truncate">
              <MapPin className="w-3 h-3 text-[#94A3B8] shrink-0" />{c.location}
            </p>
          )}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-0 mt-4 pt-4 border-t border-[#F1F5F9]">
          <div className="text-center border-r border-[#F1F5F9]">
            <p className="text-[10px] text-[#94A3B8] mb-0.5">Jobs</p>
            <p className="text-sm font-bold text-[#0F172A]">{c.jobCount}</p>
          </div>
          <div className="text-center border-r border-[#F1F5F9]">
            <p className="text-[10px] text-[#94A3B8] mb-0.5">Balance</p>
            <p className={`text-sm font-bold ${c.outstanding > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
              {c.outstanding > 0 ? formatKES(c.outstanding) : "Clear"}
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-[#94A3B8] mb-0.5">Last Job</p>
            <p className="text-xs font-medium text-[#334155]">
              {c.lastJobDate ? formatDate(c.lastJobDate) : "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Footer action */}
      <div className="border-t border-[#F1F5F9] px-5 py-3 flex items-center justify-between bg-[#FAFBFC] rounded-b-[16px]">
        {c.outstanding > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-[#DC2626] font-medium">
            <AlertCircle className="w-3 h-3" /> Unpaid balance
          </span>
        )}
        {!c.isActive && (
          <span className="text-[10px] text-[#94A3B8]">Inactive</span>
        )}
        {c.outstanding === 0 && c.isActive && <span />}
        <Link href={`/admin/clients/${c.id}`}
          className="inline-flex items-center gap-1 text-xs text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
          View <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ClientsClient({ clients, total }: { clients: Client[]; total: number }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "company" | "individual" | "unpaid">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const companyCount    = clients.filter(c => c.type === "COMPANY").length;
  const individualCount = clients.filter(c => c.type === "INDIVIDUAL").length;
  const unpaidCount     = clients.filter(c => c.outstanding > 0).length;
  const totalRevenue    = clients.reduce((s, c) => s + (c.jobCount > 0 ? c.jobCount * 5000 : 0), 0); // rough proxy
  const totalOutstanding = clients.reduce((s, c) => s + c.outstanding, 0);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (activeFilter !== "all") sp.set("filter", activeFilter);
    router.push(`/admin/clients?${sp.toString()}`);
  }

  function handleFilter(f: typeof activeFilter) {
    setActiveFilter(f);
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    if (f !== "all") sp.set("filter", f);
    router.push(`/admin/clients?${sp.toString()}`);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createClient(fd);
      if (res.error) { setFeedback({ type: "error", msg: res.error }); return; }
      setShowAdd(false);
      setFeedback({ type: "ok", msg: "Client added successfully." });
      router.refresh();
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", editing!.id);
    startTransition(async () => {
      const res = await updateClient(fd);
      if (res.error) { setFeedback({ type: "error", msg: res.error }); return; }
      setEditing(null);
      setFeedback({ type: "ok", msg: "Client updated." });
      router.refresh();
    });
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this client?")) return;
    startTransition(async () => { await deactivateClient(id); router.refresh(); });
  }

  const tabs: { key: typeof activeFilter; label: string; count?: number }[] = [
    { key: "all", label: "All Clients", count: total },
    { key: "company", label: "Companies", count: companyCount },
    { key: "individual", label: "Individuals", count: individualCount },
    { key: "unpaid", label: "Unpaid", count: unpaidCount },
  ];

  return (
    <div className="space-y-5">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ff-page-title">Clients</h1>
          <p className="ff-page-desc">{total} total · {unpaidCount} with outstanding balance</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="ff-btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* ── Summary metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Clients", value: total.toString(), icon: Users, color: "text-[#2563EB]", bg: "bg-blue-50" },
          { label: "Companies", value: companyCount.toString(), icon: Building2, color: "text-[#7C3AED]", bg: "bg-purple-50" },
          { label: "Individuals", value: individualCount.toString(), icon: User, color: "text-[#0891B2]", bg: "bg-cyan-50" },
          { label: "Outstanding", value: totalOutstanding > 0 ? formatKES(totalOutstanding) : "Clear", icon: AlertCircle, color: totalOutstanding > 0 ? "text-[#DC2626]" : "text-[#16A34A]", bg: totalOutstanding > 0 ? "bg-red-50" : "bg-green-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4 flex items-center gap-3">
            <div className={`w-10 h-10 rounded-[10px] ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className="text-xs text-[#94A3B8] font-medium">{label}</p>
              <p className="text-lg font-bold text-[#0F172A] leading-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Search + Filter ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card">
        {/* Tab bar */}
        <div className="border-b border-[#E2E8F0] px-4 overflow-x-auto scrollbar-none">
          <div className="flex gap-0 min-w-max">
            {tabs.map(tab => (
              <button key={tab.key} onClick={() => handleFilter(tab.key)}
                className={`ff-tab ${activeFilter === tab.key ? "ff-tab-active" : "ff-tab-inactive"}`}>
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                    ${activeFilter === tab.key ? "bg-[#2563EB]/15 text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div className="p-4">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, company, location…"
                className="ff-input pl-9 text-sm" />
            </div>
            <button type="submit" className="ff-btn-secondary text-sm px-4">Search</button>
          </form>
        </div>
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`flex items-center justify-between text-sm px-4 py-3 rounded-[10px] ${
          feedback.type === "ok"
            ? "bg-green-50 text-green-700 border border-green-200"
            : "bg-red-50 text-red-700 border border-red-200"}`}>
          {feedback.msg}
          <button onClick={() => setFeedback(null)} className="p-1 rounded hover:bg-black/5">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Client Grid ──────────────────────────────────────────────────── */}
      {clients.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
            <Users className="w-6 h-6 text-[#94A3B8]" />
          </div>
          <p className="text-sm font-semibold text-[#475569]">No clients found</p>
          <p className="text-xs text-[#94A3B8]">Add your first client to get started</p>
          <button onClick={() => setShowAdd(true)} className="ff-btn-primary text-sm px-4 py-2 mt-1 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Client
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients.map(c => (
            <ClientCard key={c.id} c={c} onEdit={() => setEditing(c)} />
          ))}
        </div>
      )}

      {/* ── Add Modal ────────────────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="Add Client" onClose={() => setShowAdd(false)}>
          <ClientForm isPending={isPending} onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────────────── */}
      {editing && (
        <Modal title="Edit Client" onClose={() => setEditing(null)}>
          <ClientForm
            isPending={isPending}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
            defaultValues={editing}
          />
          <div className="pt-4 mt-2 border-t border-[#E2E8F0]">
            <button
              onClick={() => { setEditing(null); handleDeactivate(editing.id); }}
              className="w-full text-xs text-[#DC2626] hover:text-red-700 py-2 transition-colors">
              Deactivate client
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
