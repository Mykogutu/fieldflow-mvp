"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MapPin } from "lucide-react";
import { createUser, updateUser, deleteUser } from "@/app/actions/user-actions";

interface Worker { id: string; name: string; phone: string; email: string | null; baseZone: string | null; isActive: boolean }

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function WorkersClient({ workers, zones }: { workers: Worker[]; zones: string[] }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Worker | null>(null);
  const [feedback, setFeedback] = useState("");
  const [isPending, startTransition] = useTransition();

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

  async function handleDelete(id: string) {
    if (!confirm("Deactivate this worker?")) return;
    startTransition(async () => {
      await deleteUser(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Workers <span className="text-gray-400 text-lg font-normal">({workers.length})</span></h1>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Add Worker
        </button>
      </div>

      {feedback && <p className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">{feedback}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.map((w) => (
          <div key={w.id} className={`bg-white rounded-xl border p-5 space-y-2 ${w.isActive ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-gray-900">{w.name}</p>
                <p className="text-sm text-gray-500">{w.phone}</p>
                {w.email && <p className="text-xs text-gray-400">{w.email}</p>}
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${w.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                {w.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            {w.baseZone && (
              <p className="text-xs text-gray-400 flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" /> {w.baseZone}</p>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setEditing(w)} className="flex-1 text-xs border border-gray-200 rounded-lg py-1.5 hover:border-blue-400 text-gray-600">
                Edit
              </button>
              {w.isActive && (
                <button onClick={() => handleDelete(w.id)} className="flex-1 text-xs border border-red-200 text-red-500 rounded-lg py-1.5 hover:bg-red-50">
                  Deactivate
                </button>
              )}
            </div>
          </div>
        ))}
        {workers.length === 0 && (
          <p className="col-span-3 text-center text-gray-400 py-12">No workers yet. Add your first worker above.</p>
        )}
      </div>

      {showAdd && (
        <Modal title="Add Worker" onClose={() => setShowAdd(false)}>
          <WorkerForm zones={zones} isPending={isPending} onSubmit={handleCreate} onCancel={() => setShowAdd(false)} />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Worker" onClose={() => setEditing(null)}>
          <form onSubmit={handleUpdate} className="space-y-3">
            <input type="hidden" name="id" value={editing.id} />
            <Field label="Name" name="name" defaultValue={editing.name} />
            <Field label="Email" name="email" type="email" defaultValue={editing.email ?? ""} />
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Zone</label>
              <select name="baseZone" defaultValue={editing.baseZone ?? ""} className={inputCls}>
                <option value="">No zone</option>
                {zones.map((z) => <option key={z} value={z}>{z}</option>)}
              </select>
            </div>
            <Field label="New Password (leave blank to keep)" name="password" type="password" />
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={() => setEditing(null)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function WorkerForm({ zones, isPending, onSubmit, onCancel }: {
  zones: string[]; isPending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="role" value="TECHNICIAN" />
      <Field label="Full Name" name="name" required />
      <Field label="WhatsApp Phone" name="phone" placeholder="+254..." required />
      <Field label="Email (optional)" name="email" type="email" />
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Base Zone</label>
        <select name="baseZone" className={inputCls}>
          <option value="">No zone</option>
          {zones.map((z) => <option key={z} value={z}>{z}</option>)}
        </select>
      </div>
      <Field label="Password" name="password" type="password" required />
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm">Cancel</button>
        <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
          {isPending ? "Adding..." : "Add Worker"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, name, type = "text", placeholder, required, defaultValue }: {
  label: string; name: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string;
}) {
  const cls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} name={name} placeholder={placeholder} required={required} defaultValue={defaultValue} className={cls} />
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
