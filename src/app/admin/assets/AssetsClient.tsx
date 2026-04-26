"use client";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createAsset, updateAsset, deleteAsset } from "@/app/actions/asset-actions";

interface AssetRow {
  id: string;
  name: string;
  assetType: string;
  identifier: string | null;
  serialNumber: string | null;
  registrationNumber: string | null;
  clientName: string;
  clientPhone: string | null;
  location: string | null;
  zone: string | null;
  installationDate: Date | string | null;
  warrantyExpiryDate: Date | string | null;
  lastServiceDate: Date | string | null;
  notes: string | null;
  _count: { jobs: number };
}

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const COMMON_ASSET_TYPES = [
  "Plastic Tank",
  "Steel Tank",
  "Underground Tank",
  "Vehicle",
  "Fuel Sensor",
  "Tracker Device",
  "Inverter",
  "Solar Panel",
  "Building",
  "Other",
];

export default function AssetsClient({
  assets,
  knownTypes,
  zones,
  currentSearch,
  currentType,
}: {
  assets: AssetRow[];
  knownTypes: string[];
  zones: string[];
  currentSearch?: string;
  currentType?: string;
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
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/admin/assets?${next.toString()}`);
  }

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createAsset(fd);
      if (res.error) setFeedback(res.error);
      else {
        setShowAdd(false);
        setFeedback("Asset added.");
        router.refresh();
      }
    });
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.set("id", editing!.id);
    startTransition(async () => {
      const res = await updateAsset(fd);
      if (res.error) setFeedback(res.error);
      else {
        setEditing(null);
        router.refresh();
      }
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          Assets <span className="text-gray-400 text-lg font-normal">({assets.length})</span>
        </h1>
        <button
          onClick={() => setShowAdd(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          + Add Asset
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
          <input
            defaultValue={currentSearch ?? ""}
            placeholder="Name, client, phone, serial…"
            onKeyDown={(e) => {
              if (e.key === "Enter") updateFilter("search", e.currentTarget.value);
            }}
            className={inputCls}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
          <select
            value={currentType ?? ""}
            onChange={(e) => updateFilter("type", e.target.value)}
            className={inputCls}
          >
            <option value="">All types</option>
            {knownTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        {(currentSearch || currentType) && (
          <button
            onClick={() => router.push("/admin/assets")}
            className="text-xs text-gray-500 hover:text-gray-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {feedback && (
        <p className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">
          {feedback}
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {assets.map((a) => (
          <div
            key={a.id}
            className="bg-white rounded-xl border border-gray-200 p-5 space-y-2 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/admin/assets/${a.id}`}
                  className="font-semibold text-gray-900 hover:text-blue-600 block truncate"
                >
                  {a.name}
                </Link>
                <p className="text-xs text-gray-500 truncate">{a.clientName}</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full bg-blue-50 text-blue-700 whitespace-nowrap">
                {a.assetType}
              </span>
            </div>

            <div className="space-y-1 text-xs text-gray-500">
              {a.location && <p className="flex items-center gap-1 truncate">📍 {a.location}</p>}
              {a.serialNumber && <p>SN: {a.serialNumber}</p>}
              {a.registrationNumber && <p>Reg: {a.registrationNumber}</p>}
              {a.identifier && <p>ID: {a.identifier}</p>}
            </div>

            <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-50">
              <span className="text-gray-400">
                {a._count.jobs} job{a._count.jobs === 1 ? "" : "s"}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditing(a)}
                  className="text-gray-500 hover:text-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(a.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}

        {assets.length === 0 && (
          <p className="col-span-3 text-center text-gray-400 py-12">
            {currentSearch || currentType
              ? "No assets match your filters."
              : "No assets yet. Add your first asset above."}
          </p>
        )}
      </div>

      {showAdd && (
        <Modal title="Add Asset" onClose={() => setShowAdd(false)}>
          <AssetForm
            zones={zones}
            allTypes={allTypes}
            isPending={isPending}
            onSubmit={handleCreate}
            onCancel={() => setShowAdd(false)}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit Asset" onClose={() => setEditing(null)}>
          <AssetForm
            zones={zones}
            allTypes={allTypes}
            isPending={isPending}
            initial={editing}
            onSubmit={handleUpdate}
            onCancel={() => setEditing(null)}
          />
        </Modal>
      )}
    </div>
  );
}

function AssetForm({
  zones,
  allTypes,
  isPending,
  initial,
  onSubmit,
  onCancel,
}: {
  zones: string[];
  allTypes: string[];
  isPending: boolean;
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
    <form onSubmit={onSubmit} className="space-y-3 max-h-[70vh] overflow-y-auto pr-1">
      <Field label="Asset Name" name="name" required defaultValue={initial?.name} placeholder="e.g. Mrs. Wanjiku's 5000L tank" />

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Asset Type</label>
        <input
          name="assetType"
          required
          list="asset-types"
          defaultValue={initial?.assetType}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Plastic Tank, Vehicle, Inverter…"
        />
        <datalist id="asset-types">
          {allTypes.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Client Name" name="clientName" required defaultValue={initial?.clientName} />
        <Field label="Client Phone" name="clientPhone" placeholder="+254…" defaultValue={initial?.clientPhone ?? ""} />
      </div>

      <Field label="Location" name="location" defaultValue={initial?.location ?? ""} />

      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">Zone</label>
        <select name="zone" defaultValue={initial?.zone ?? ""} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">No zone</option>
          {zones.map((z) => (
            <option key={z} value={z}>
              {z}
            </option>
          ))}
        </select>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700 py-1">
          Identifiers (optional)
        </summary>
        <div className="space-y-3 pt-2">
          <Field label="Free-form Identifier" name="identifier" defaultValue={initial?.identifier ?? ""} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Serial Number" name="serialNumber" defaultValue={initial?.serialNumber ?? ""} />
            <Field label="Registration Number" name="registrationNumber" defaultValue={initial?.registrationNumber ?? ""} />
          </div>
        </div>
      </details>

      <details className="text-sm">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700 py-1">
          Dates & Notes (optional)
        </summary>
        <div className="space-y-3 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Installation Date" name="installationDate" type="date" defaultValue={dateValue(initial?.installationDate)} />
            <Field label="Warranty Expiry" name="warrantyExpiryDate" type="date" defaultValue={dateValue(initial?.warrantyExpiryDate)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              name="notes"
              defaultValue={initial?.notes ?? ""}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </details>

      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50"
        >
          {isPending ? "Saving…" : initial ? "Save Changes" : "Add Asset"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
