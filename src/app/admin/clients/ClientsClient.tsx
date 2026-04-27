"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search, Plus, MapPin, Phone, Building2, User, X,
  ChevronRight, AlertCircle, MoreHorizontal, Mail,
  Briefcase, Users, UserCheck, UserPlus, FileText, Bell,
  DollarSign,
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
      <label className="block text-xs font-semibold text-[#475569] mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
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
        <select name="type" defaultValue={defaultValues?.type ?? "INDIVIDUAL"} className="ff-input text-sm">
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

// ── Client Row (table) ────────────────────────────────────────────────────────
function ClientRow({ c, onEdit }: { c: Client; onEdit: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <tr className="group hover:bg-[#FAFBFD] transition-colors">
      {/* Client */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <ClientAvatar name={c.name} size="sm" />
          <div className="min-w-0">
            <Link href={`/admin/clients/${c.id}`}
              className="text-[13px] font-semibold text-[#0F172A] hover:text-[#2563EB] truncate block transition-colors">
              {c.name}
            </Link>
            <p className="text-xs text-[#94A3B8] truncate">{c.phone}</p>
          </div>
        </div>
      </td>
      {/* Type */}
      <td className="py-3 px-4">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-[4px] ${
          c.type === "COMPANY"
            ? "bg-blue-50 text-blue-700 border border-blue-100"
            : "bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]"
        }`}>
          {c.type === "COMPANY" ? "Company" : "Individual"}
        </span>
      </td>
      {/* Location */}
      <td className="py-3 px-4">
        <p className="text-[13px] text-[#334155] truncate">{c.location ?? <span className="text-[#94A3B8]">—</span>}</p>
      </td>
      {/* Jobs */}
      <td className="py-3 px-4">
        <p className="text-[13px] font-semibold text-[#0F172A]">{c.jobCount}</p>
      </td>
      {/* Outstanding Balance */}
      <td className="py-3 px-4">
        {c.outstanding > 0 ? (
          <div>
            <p className="text-[13px] font-bold text-[#DC2626]">{formatKES(c.outstanding)}</p>
            <p className="text-[11px] text-[#DC2626]/80">Unpaid</p>
          </div>
        ) : (
          <div>
            <p className="text-[13px] font-semibold text-[#16A34A]">Clear</p>
            <p className="text-[11px] text-[#94A3B8]">KES 0</p>
          </div>
        )}
      </td>
      {/* Last Job */}
      <td className="py-3 px-4">
        <p className="text-[13px] text-[#334155] truncate">
          {c.lastJobDate ? formatDate(c.lastJobDate) : <span className="text-[#94A3B8]">—</span>}
        </p>
      </td>
      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 justify-end">
          <Link href={`/admin/clients/${c.id}`}
            className="ff-btn-secondary text-xs px-2.5 py-1.5 whitespace-nowrap">
            View Profile
          </Link>
          <div className="relative">
            <button onClick={() => setMenuOpen(v => !v)}
              className="p-1.5 rounded-[8px] border border-[#E2E8F0] hover:bg-[#F8FAFC] text-[#94A3B8] hover:text-[#475569] transition-colors">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-[10px] border border-[#E2E8F0] shadow-card py-1 z-20 w-40">
                <button onClick={() => { setMenuOpen(false); onEdit(); }}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC] w-full text-left">
                  <Briefcase className="w-3.5 h-3.5" /> Edit Client
                </button>
                {c.email && (
                  <a href={`mailto:${c.email}`} onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC]">
                    <Mail className="w-3.5 h-3.5" /> Send Email
                  </a>
                )}
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
      </td>
    </tr>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function ClientsClient({ clients, total }: { clients: Client[]; total: number }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "unpaid" | "company" | "individual">("all");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeCount      = clients.filter(c => c.isActive).length;
  const newThisMonth     = clients.filter(c => new Date(c.createdAt) >= startOfMonth).length;
  const totalOutstanding = clients.reduce((s, c) => s + c.outstanding, 0);
  const unpaidClients    = clients.filter(c => c.outstanding > 0);

  const filteredClients = clients.filter(c => {
    if (activeFilter === "active")     return c.isActive;
    if (activeFilter === "unpaid")     return c.outstanding > 0;
    if (activeFilter === "company")    return c.type === "COMPANY";
    if (activeFilter === "individual") return c.type === "INDIVIDUAL";
    return true;
  });

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

  return (
    <div className="space-y-5">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ff-page-title">Clients</h1>
          <p className="ff-page-desc">Manage client profiles, balances, and service history.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="ff-btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* ── 4 Metric cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "Total Clients",       value: total,                                           sub: "All time registered clients", Icon: Users,     iconBg: "bg-blue-50",   iconColor: "text-[#2563EB]", href: "/admin/clients"                  },
          { label: "Active Clients",      value: activeCount,                                     sub: "Currently active clients",    Icon: UserCheck, iconBg: "bg-green-50",  iconColor: "text-[#16A34A]", href: "/admin/clients?filter=active"    },
          { label: "Outstanding Balance", value: totalOutstanding > 0 ? formatKES(totalOutstanding) : "Clear", sub: `Across ${unpaidClients.length} client${unpaidClients.length !== 1 ? "s" : ""}`, Icon: DollarSign, iconBg: totalOutstanding > 0 ? "bg-red-50" : "bg-green-50", iconColor: totalOutstanding > 0 ? "text-[#DC2626]" : "text-[#16A34A]", href: "/admin/clients?filter=unpaid" },
          { label: "New This Month",      value: newThisMonth,                                    sub: "New clients this month",      Icon: UserPlus,  iconBg: "bg-purple-50", iconColor: "text-[#7C3AED]", href: "/admin/clients"                  },
        ].map(m => (
          <Link key={m.label} href={m.href}
            className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-5 flex items-center gap-4 hover:border-[#2563EB]/30 hover:shadow-card-hover transition-all group">
            <div className={`w-11 h-11 rounded-[12px] flex items-center justify-center shrink-0 ${m.iconBg}`}>
              <m.Icon className={`w-5 h-5 ${m.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#64748B] truncate">{m.label}</p>
              <p className="text-xl font-bold text-[#0F172A] leading-tight truncate">{m.value}</p>
              <p className="text-[11px] text-[#94A3B8] mt-0.5 truncate">{m.sub}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-[#94A3B8] shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        ))}
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

      {/* ── Main body: table + right panel ──────────────────────────────── */}
      <div className="flex gap-5 items-start">

        {/* ── Left: Search + Table ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0 space-y-3">

          {/* Search + filter row */}
          <div className="flex items-center gap-3 flex-wrap">
            <form onSubmit={handleSearch} className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, phone, company, location..."
                className="ff-input pl-9 text-sm w-full" />
            </form>
            {/* Segment filter */}
            <div className="flex items-center gap-1 bg-[#F1F5F9] rounded-[10px] p-1">
              {(["all", "active", "unpaid", "company", "individual"] as const).map(f => (
                <button key={f} onClick={() => handleFilter(f)}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold transition-all capitalize ${
                    activeFilter === f
                      ? "bg-white text-[#0F172A] shadow-sm"
                      : "text-[#64748B] hover:text-[#334155]"
                  }`}>
                  {f === "all" ? "All" : f === "active" ? "Active" : f === "unpaid" ? "Unpaid" : f === "company" ? "Companies" : "Individuals"}
                </button>
              ))}
            </div>
          </div>

          {/* Table card */}
          <div className="ff-card overflow-hidden">
            {/* Table header */}
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
              <p className="text-sm font-semibold text-[#0F172A]">All Clients</p>
              <p className="text-xs text-[#94A3B8]">
                {filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} · Sorted by last activity
              </p>
            </div>

            {filteredClients.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#94A3B8]" />
                </div>
                <p className="text-sm font-semibold text-[#475569]">No clients found</p>
                <p className="text-xs text-[#94A3B8]">Try a different filter or add a new client</p>
                <button onClick={() => setShowAdd(true)}
                  className="ff-btn-primary text-sm px-4 py-2 mt-1 inline-flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Client
                </button>
              </div>
            ) : (
              <table className="w-full table-fixed ff-table">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[13%]" />
                  <col className="w-[17%]" />
                  <col className="w-[7%]" />
                  <col className="w-[18%]" />
                  <col className="w-[13%]" />
                  <col className="w-[8%]" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Type</th>
                    <th>Location</th>
                    <th>Jobs</th>
                    <th>Outstanding Balance</th>
                    <th>Last Job</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map(c => (
                    <ClientRow key={c.id} c={c} onEdit={() => setEditing(c)} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Right panel ─────────────────────────────────────────────── */}
        <div className="hidden xl:flex flex-col gap-4 w-72 shrink-0">

          {/* Clients needing follow up */}
          <div className="ff-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-[#0F172A]">Clients needing follow up</h3>
                {unpaidClients.length > 0 && (
                  <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">
                    {unpaidClients.length}
                  </span>
                )}
              </div>
              <Link href="/admin/clients?filter=unpaid"
                className="text-xs text-[#2563EB] font-medium hover:text-[#1D4ED8] transition-colors">
                View all
              </Link>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {unpaidClients.length === 0 ? (
                <div className="px-4 py-6 text-center">
                  <p className="text-xs text-[#94A3B8]">All clients are up to date 🎉</p>
                </div>
              ) : (
                unpaidClients.slice(0, 3).map(c => (
                  <div key={c.id} className="px-4 py-3 flex items-start gap-3">
                    <ClientAvatar name={c.name} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-semibold text-[#0F172A] truncate leading-tight">{c.name}</p>
                        <span className="text-[10px] font-bold text-[#DC2626] bg-red-50 px-1.5 py-0.5 rounded shrink-0 leading-tight">
                          UNPAID
                        </span>
                      </div>
                      <p className="text-[11px] text-[#64748B] mt-0.5 truncate">
                        Payment overdue · {formatKES(c.outstanding)}
                      </p>
                    </div>
                    <Link href={`/admin/clients/${c.id}`}
                      className="text-xs text-[#2563EB] font-semibold shrink-0 hover:text-[#1D4ED8] transition-colors mt-0.5">
                      View
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick actions */}
          <div className="ff-card overflow-hidden">
            <div className="px-4 py-3.5 border-b border-[#E2E8F0]">
              <h3 className="text-sm font-semibold text-[#0F172A]">Quick actions</h3>
            </div>
            <div className="divide-y divide-[#F1F5F9]">
              {([
                { label: "Add Client",              Icon: UserPlus,  href: null as string | null,       onClick: () => setShowAdd(true) },
                { label: "Create Job for Client",   Icon: Briefcase, href: "/admin/jobs/new",           onClick: null as (() => void) | null },
                { label: "Send Payment Reminder",   Icon: Bell,      href: "/admin/invoices?status=OVERDUE", onClick: null as (() => void) | null },
                { label: "View Unpaid Invoices",    Icon: FileText,  href: "/admin/invoices?status=PENDING", onClick: null as (() => void) | null },
              ]).map((action, i) => {
                const inner = (
                  <>
                    <div className="w-7 h-7 rounded-[8px] bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                      <action.Icon className="w-3.5 h-3.5 text-[#64748B]" />
                    </div>
                    <span className="text-xs font-medium text-[#334155] group-hover:text-[#2563EB] transition-colors flex-1 text-left">
                      {action.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  </>
                );
                const cls = "w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F8FAFC] transition-colors group";
                return action.href
                  ? <Link key={i} href={action.href} className={cls}>{inner}</Link>
                  : <button key={i} onClick={action.onClick ?? undefined} className={cls}>{inner}</button>;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Add Modal ───────────────────────────────────────────────────── */}
      {showAdd && (
        <Modal title="Add Client" onClose={() => setShowAdd(false)}>
          <ClientForm isPending={isPending} onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {/* ── Edit Modal ──────────────────────────────────────────────────── */}
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
