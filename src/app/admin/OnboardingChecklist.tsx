"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2, Circle, X } from "lucide-react";

export type OnboardingState = {
  hasCompanyName: boolean;
  hasIndustry: boolean;
  hasJobTypes: boolean;
  hasWorkers: boolean;
  hasClients: boolean;
  hasAssets: boolean;
  hasZones: boolean;
  hasDocumentConfig: boolean;
  hasFirstJob: boolean;
  hasCompletedJob: boolean;
};

const STEPS = [
  { key: "hasCompanyName",    label: "Set company details",     href: "/admin/settings",  hint: "Name, logo, contact info" },
  { key: "hasIndustry",       label: "Choose your industry",    href: "/admin/settings",  hint: "Configures your entire workspace" },
  { key: "hasJobTypes",       label: "Add job types",           href: "/admin/settings",  hint: "e.g. Tank Repair, Installation" },
  { key: "hasZones",          label: "Set service zones",       href: "/admin/settings",  hint: "Areas your team covers" },
  { key: "hasDocumentConfig", label: "Configure documents",     href: "/admin/settings",  hint: "Invoices, warranties, reports" },
  { key: "hasWorkers",        label: "Add your team",           href: "/admin/workers",   hint: "Field technicians who receive jobs" },
  { key: "hasClients",        label: "Add your first client",   href: "/admin/clients",   hint: "Client details and contact" },
  { key: "hasAssets",         label: "Add an asset",            href: "/admin/assets",    hint: "Tank, vehicle, device, etc." },
  { key: "hasFirstJob",       label: "Create your first job",   href: "/admin/jobs",      hint: "Assign a job to a worker" },
  { key: "hasCompletedJob",   label: "Complete a job",          href: "/admin/jobs",      hint: "Worker reports done, client OTPs" },
] as const;

export default function OnboardingChecklist({ state }: { state: OnboardingState }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const steps = STEPS.map(s => ({ ...s, done: state[s.key] }));
  const completedCount = steps.filter(s => s.done).length;
  if (completedCount === steps.length) return null;

  const pct = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="bg-white rounded-xl border border-blue-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-blue-50 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
            <Sparkles style={{ width: 18, height: 18 }} className="text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900 text-sm">Get started with FieldFlow</p>
            <p className="text-xs text-slate-400 mt-0.5">{completedCount} of {steps.length} steps complete</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-blue-600">{pct}%</span>
          </div>
          <button onClick={() => setDismissed(true)}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors" title="Dismiss checklist">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {steps.map(step => (
          <Link key={step.key} href={step.done ? "#" : step.href}
            className={`flex items-start gap-2 p-2.5 rounded-xl border transition-all text-left ${
              step.done
                ? "border-green-100 bg-green-50/50 cursor-default"
                : "border-gray-100 hover:border-blue-200 hover:bg-blue-50/30"}`}>
            {step.done
              ? <CheckCircle2 className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
              : <Circle className="w-3.5 h-3.5 text-slate-300 shrink-0 mt-0.5" />}
            <div className="min-w-0">
              <p className={`text-[11px] font-medium leading-tight ${step.done ? "text-green-700 line-through decoration-green-400" : "text-slate-700"}`}>
                {step.label}
              </p>
              {!step.done && <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{step.hint}</p>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
