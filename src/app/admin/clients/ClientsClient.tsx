"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, Plus, MapPin, Phone, Building2, User, X, ChevronRight } from "lucide-react";
import { createClient, updateClient, deactivateClient } from "@/app/actions/client-actions";

interface Client {
  id: string; name: string; phone: string; email: string | null;
  company: string | null; location: string | null; type: string; isActive: boolean;
  createdAt: Date | string;
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ClientsClient({ clients, total }: { clients: Client[]; total: number }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "error"; msg: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const sp = new URLSearchParams();
    if (search) sp.set("search", search);
    router.push(`/admin/clients?${sp.toString()}`);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createClient(fd);
      if (res.error) { setFeedback({ type: "error", msg: res.error }); return; }
      setShowAdd(false);
      setFeedback({ type: "ok", msg: "Client added." });
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
      router.refresh();
    });
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this client?")) return;
    startTransition(async () => { await deactivateClient(id); router.refresh(); });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Clients</h1>
          <p className="text-xs text-slate-400 mt-0.5">{total} total clients</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, company..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button type="submit" className="px-4 py-2 bg-white border border-gray-200 text-slate-600 text-sm rounded-xl hover:border-blue-400 transition-colors">
          Search
        </button>
      </form>

      {feedback && (
        <div className={`flex items-center justify-between text-sm px-4 py-2.5 rounded-xl ${feedback.type === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {feedback.msg}
          <button onClick={() => setFeedback(null)}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Clients grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow group">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="min-w-0 flex-1">
                <Link href={`/admin/clients/${c.id}`} className="font-semibold text-slate-900 hover:text-blue-600 truncate block">
                  {c.name}
                </Link>
                {c.company && (
                  <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                    <Building2 className="w-3 h-3 shrink-0" />{c.company}
                  </p>
                )}
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${c.type === "COMPANY" ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"}`}>
                {c.type === "COMPANY" ? "Company" : "Individual"}
              </span>
            </div>

            <div className="space-y-1 text-xs text-slate-500">
              <p className="flex items-center gap-1.5"><Phone className="w-3 h-3 shrink-0 text-slate-400" />{c.phone}</p>
              {c.location && <p className="flex items-center gap-1.5 truncate"><MapPin className="w-3 h-3 shrink-0 text-slate-400" />{c.location}</p>}
            </div>

            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
              <Link
                href={`/admin/clients/${c.id}`}
                className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs text-blue-600 font-medium hover:text-blue-700"
              >
                View profile <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <button
                onClick={() => setEditing(c)}
                className="text-xs text-slate-400 hover:text-slate-700 border border-gray-200 rounded-lg px-2.5 py-1.5 transition-colors"
              >
                Edit
              </button>
            </div>
          </div>
        ))}
        {clients.length === 0 && (
          <div className="col-span-3 bg-white rounded-xl border border-gray-200 py-16 flex flex-col items-center gap-3">
            <User className="w-10 h-10 text-slate-200" />
            <p className="text-sm text-slate-400">No clients yet. Add your first client.</p>
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" /> Add Client
            </button>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add Client" onClose={() => setShowAdd(false)}>
          <ClientForm isPending={isPending} onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal title="Edit Client" onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate} className="space-y-3">
            <input type="hidden" name="id" value={editing.id} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Full Name" name="name" required defaultValue={editing.name} />
              <Field label="Phone" name="phone" required defaultValue={editing.phone} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" name="email" type="email" defaultValue={editing.email ?? ""} />
              <Field label="Company" name="company" defaultValue={editing.company ?? ""} />
            </div>
            <Field label="Location" name="location" defaultValue={editing.location ?? ""} />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Client Type</label>
              <select name="type" defaultValue={editing.type} className={inputCls}>
                <option value="INDIVIDUAL">Individual</option>
                <option value="COMPANY">Company</option>
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 border border-gray-200 text-slate-600 rounded-lg py-2 text-sm">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">
                {isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
            <div className="pt-2 border-t border-gray-100">
              <button type="button" onClick={() => { setEditing(null); handleDeactivate(editing.id); }} className="w-full text-xs text-red-500 hover:text-red-600">
                Deactivate client
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function ClientForm({ isPending, onSubmit, onCancel }: {
  isPending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Full Name" name="name" required />
        <Field label="Phone" name="phone" placeholder="+254..." required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Email (optional)" name="email" type="email" />
        <Field label="Company (optional)" name="company" />
      </div>
      <Field label="Location" name="location" placeholder="Nairobi, Karen..." />
      <Field label="Address / Notes (optional)" name="address" />
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Client Type</label>
        <select name="type" defaultValue="INDIVIDUAL" className={inputCls}>
          <option value="INDIVIDUAL">Individual</option>
          <option value="COMPANY">Company</option>
        </select>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-200 text-slate-600 rounded-lg py-2 text-sm">Cancel</button>
        <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-semibold disabled:opacity-50">
          {isPending ? "Adding..." : "Add Client"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, type = "text", placeholder, required, defaultValue }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} name={name} placeholder={placeholder} required={required} defaultValue={defaultValue}
        className={inputCls} />
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
