"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Plus, X, Phone, Mail, Users,
  CheckCircle2, XCircle, MessageCircle, HardHat,
} from "lucide-react";
import { createUser, updateUser, deleteUser } from "@/app/actions/user-actions";

interface Worker {
  id: string; name: string; phone: string; email: string | null;
  baseZone: string | null; isActive: boolean;
}

function Field({ label, name, type = "text", placeholder, required, defaultValue }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#475569] mb-1.5">
        {label}{required && <span className="text-[#F87171] ml-0.5">*</span>}
      </label>
      <input type={type} name={name} placeholder={placeholder} required={required}
        defaultValue={defaultValue} className="ff-input text-sm" />
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
          <h2 className="font-bold text-[#0F172A]">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[#94A3B8]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function WorkerAvatar({ name }: { name: string }) {
  const initials = name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const colors = [
    "bg-[#DBEAFE] text-[#1D4ED8]", "bg-[#EDE9FE] text-[#6D28D9]",
    "bg-[#FEF3C7] text-[#B45309]", "bg-[#DCFCE7] text-[#15803D]",
    "bg-[#E0E7FF] text-[#4338CA]", "bg-[#FFE4E6] text-[#BE123C]",
  ];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

function WorkerCard({ w, onEdit, onDeactivate }: { w: Worker; onEdit: () => void; onDeactivate: () => void }) {
  return (
    <div className={`bg-white rounded-[16px] border shadow-card transition-all
      ${w.isActive ? "border-[#E2E8F0] hover:shadow-card-hover hover:border-[#2563EB]/20" : "border-[#E2E8F0] opacity-60"}`}>
      <div className="p-5">
        <div className="flex items-start gap-3 mb-4">
          <WorkerAvatar name={w.name} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-semibold text-[#0F172A] text-sm truncate">{w.name}</p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-[4px] shrink-0
                ${w.isActive ? "bg-[#F0FDF4] text-[#16A34A] border border-[#BBF7D0]" : "bg-[#F1F5F9] text-[#94A3B8] border border-[#E2E8F0]"}`}>
                {w.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
              <Phone className="w-3 h-3 text-[#94A3B8]" />
              {w.phone}
            </div>
            {w.email && (
              <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mt-0.5">
                <Mail className="w-3 h-3" />
                <span className="truncate">{w.email}</span>
              </div>
            )}
            {w.baseZone && (
              <div className="flex items-center gap-1.5 text-xs text-[#94A3B8] mt-0.5">
                <MapPin className="w-3 h-3 shrink-0" />{w.baseZone}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 pt-4 border-t border-[#F1F5F9]">
          <a href={`https://wa.me/${w.phone.replace("+", "")}`}
            target="_blank" rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-medium py-2 rounded-[8px] bg-[#F0FDF4] text-[#16A34A] hover:bg-[#DCFCE7] border border-[#86EFAC] transition-colors">
            <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
          </a>
          <button onClick={onEdit}
            className="flex-1 text-xs font-medium py-2 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:border-[#BFDBFE] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors">
            Edit
          </button>
          {w.isActive && (
            <button onClick={onDeactivate}
              className="text-xs font-medium py-2 px-3 rounded-[8px] border border-[#FECACA] text-[#DC2626] hover:bg-[#FFF1F2] transition-colors">
              <XCircle className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WorkersClient({ workers, zones }: { workers: Worker[]; zones: string[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeCount   = workers.filter(w => w.isActive).length;
  const inactiveCount = workers.filter(w => !w.isActive).length;

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createUser(fd);
      if (res.error) setFeedback(res.error);
      else { setShowAdd(false); setFeedback("Worker added!"); router.refresh(); }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", editing!.id);
    startTransition(async () => {
      const res = await updateUser(fd);
      if (res.error) setFeedback(res.error);
      else { setEditing(null); router.refresh(); }
    });
  }

  async function handleDeactivate(id: string) {
    if (!confirm("Deactivate this worker?")) return;
    startTransition(async () => { await deleteUser(id); router.refresh(); });
  }

  return (
    <div className="space-y-5">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ff-page-title">Workers</h1>
          <p className="ff-page-desc">{workers.length} total · {activeCount} active</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="ff-btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Add Worker
        </button>
      </div>

      {/* ── Summary metrics ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Workers", value: workers.length.toString(), icon: Users,       color: "text-[#2563EB]", bg: "bg-[#EFF6FF]" },
          { label: "Active",        value: activeCount.toString(),    icon: CheckCircle2, color: "text-[#16A34A]", bg: "bg-[#F0FDF4]" },
          { label: "Inactive",      value: inactiveCount.toString(),  icon: XCircle,     color: "text-[#94A3B8]", bg: "bg-[#F1F5F9]" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-3 sm:p-4 flex flex-col sm:flex-row items-center sm:items-center gap-1.5 sm:gap-3">
            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-[10px] ${bg} flex items-center justify-center shrink-0`}>
              <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${color}`} />
            </div>
            <div className="text-center sm:text-left min-w-0">
              <p className="text-[10px] sm:text-xs text-[#94A3B8] font-medium leading-tight">{label}</p>
              <p className={`text-lg font-bold leading-tight ${color}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className="flex items-center justify-between text-sm px-4 py-3 rounded-[10px] bg-[#F0FDF4] text-[#16A34A] border border-[#86EFAC]">
          {feedback}
          <button onClick={() => setFeedback("")}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Workers Grid ─────────────────────────────────────────────────── */}
      {workers.length === 0 ? (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card py-20 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
            <HardHat className="w-6 h-6 text-[#94A3B8]" />
          </div>
          <p className="text-sm font-semibold text-[#475569]">No workers yet</p>
          <button onClick={() => setShowAdd(true)} className="ff-btn-primary text-sm px-4 py-2 inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add Worker
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workers.map(w => (
            <WorkerCard key={w.id} w={w}
              onEdit={() => setEditing(w)}
              onDeactivate={() => handleDeactivate(w.id)} />
          ))}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <Modal title="Add Worker" onClose={() => setShowAdd(false)}>
          <form onSubmit={handleCreate} className="space-y-3">
            <input type="hidden" name="role" value="TECHNICIAN" />
            <Field label="Full Name" name="name" required />
            <Field label="WhatsApp Phone" name="phone" placeholder="+254…" required />
            <Field label="Email" name="email" type="email" placeholder="optional" />
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">Base Zone</label>
              <select name="baseZone" className="ff-input text-sm">
                <option value="">No zone</option>
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <Field label="Password" name="password" type="password" required />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setShowAdd(false)} className="ff-btn-secondary flex-1 text-sm">Cancel</button>
              <button type="submit" disabled={isPending} className="ff-btn-primary flex-1 text-sm disabled:opacity-50">
                {isPending ? "Adding…" : "Add Worker"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Modal */}
      {editing && (
        <Modal title="Edit Worker" onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate} className="space-y-3">
            <input type="hidden" name="id" value={editing.id} />
            <Field label="Name" name="name" defaultValue={editing.name} />
            <Field label="Email" name="email" type="email" defaultValue={editing.email ?? ""} />
            <div>
              <label className="block text-xs font-semibold text-[#475569] mb-1.5">Base Zone</label>
              <select name="baseZone" defaultValue={editing.baseZone ?? ""} className="ff-input text-sm">
                <option value="">No zone</option>
                {zones.map(z => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <Field label="New Password" name="password" type="password" placeholder="Leave blank to keep current" />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="ff-btn-secondary flex-1 text-sm">Cancel</button>
              <button type="submit" disabled={isPending} className="ff-btn-primary flex-1 text-sm disabled:opacity-50">
                {isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
