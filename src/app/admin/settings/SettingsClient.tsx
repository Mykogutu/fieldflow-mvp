"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function SettingsClient({ settings }: { settings: Record<string, string> }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [companyName, setCompanyName] = useState(settings.company_name ?? "");
  const [companyPhone, setCompanyPhone] = useState(settings.company_phone ?? "");
  const [briefingHour, setBriefingHour] = useState(settings.briefing_hour ?? "6");
  const [jobTypes, setJobTypes] = useState<string[]>(
    settings.job_types ? JSON.parse(settings.job_types) : []
  );
  const [zones, setZones] = useState<string[]>(
    settings.zones ? JSON.parse(settings.zones) : []
  );
  const [newJobType, setNewJobType] = useState("");
  const [newZone, setNewZone] = useState("");

  async function handleSave() {
    startTransition(async () => {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          company_phone: companyPhone,
          briefing_hour: briefingHour,
          job_types: JSON.stringify(jobTypes),
          zones: JSON.stringify(zones),
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {saved && <p className="text-sm bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg">Settings saved!</p>}

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Company</h2>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
          <input value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Company Phone</label>
          <input value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} className={inputCls} />
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Automations</h2>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Daily Briefing Hour (24h, Nairobi time)</label>
          <input type="number" min={0} max={23} value={briefingHour} onChange={(e) => setBriefingHour(e.target.value)} className={inputCls} />
          <p className="text-xs text-gray-400 mt-1">Workers receive WhatsApp briefings at this hour every morning.</p>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Job Types</h2>
        <div className="flex flex-wrap gap-2">
          {jobTypes.map((t) => (
            <span key={t} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded-full text-xs">
              {t}
              <button onClick={() => setJobTypes(jobTypes.filter((j) => j !== t))} className="text-blue-400 hover:text-red-500">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newJobType} onChange={(e) => setNewJobType(e.target.value)} placeholder="Add job type..." className={`${inputCls} flex-1`}
            onKeyDown={(e) => { if (e.key === "Enter" && newJobType.trim()) { setJobTypes([...jobTypes, newJobType.trim()]); setNewJobType(""); } }} />
          <button onClick={() => { if (newJobType.trim()) { setJobTypes([...jobTypes, newJobType.trim()]); setNewJobType(""); } }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">Add</button>
        </div>
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Service Zones</h2>
        <div className="flex flex-wrap gap-2">
          {zones.map((z) => (
            <span key={z} className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-full text-xs">
              {z}
              <button onClick={() => setZones(zones.filter((z2) => z2 !== z))} className="text-green-400 hover:text-red-500">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder="Add zone..." className={`${inputCls} flex-1`}
            onKeyDown={(e) => { if (e.key === "Enter" && newZone.trim()) { setZones([...zones, newZone.trim()]); setNewZone(""); } }} />
          <button onClick={() => { if (newZone.trim()) { setZones([...zones, newZone.trim()]); setNewZone(""); } }}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm">Add</button>
        </div>
      </section>

      <button
        onClick={handleSave}
        disabled={isPending}
        className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
      >
        {isPending ? "Saving..." : "Save All Settings"}
      </button>
    </div>
  );
}
