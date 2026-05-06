"use client";
import { useState } from "react";
import Link from "next/link";
import { Sparkles, CheckCircle2, Circle, X, ChevronDown } from "lucide-react";

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
  { key: "hasCompanyName",    label: "Set company details",     href: "/admin/settings?tab=general",    hint: "Name, logo, contact info" },
  { key: "hasIndustry",       label: "Choose your industry",    href: "/admin/settings?tab=operations", hint: "Configures your workspace" },
  { key: "hasJobTypes",       label: "Add job types",           href: "/admin/settings?tab=operations", hint: "e.g. Tank Repair, Installation" },
  { key: "hasZones",          label: "Set service zones",       href: "/admin/settings?tab=operations", hint: "Areas your team covers" },
  { key: "hasDocumentConfig", label: "Configure documents",     href: "/admin/settings?tab=documents",  hint: "Invoices, warranties, reports" },
  { key: "hasWorkers",        label: "Add your team",           href: "/admin/workers",                 hint: "Field technicians" },
  { key: "hasClients",        label: "Add your first client",   href: "/admin/clients",                 hint: "Client details and contact" },
  { key: "hasAssets",         label: "Add an asset",            href: "/admin/assets",                  hint: "Tank, vehicle, device, etc." },
  { key: "hasFirstJob",       label: "Create your first job",   href: "/admin/jobs",                    hint: "Assign a job to a worker" },
  { key: "hasCompletedJob",   label: "Complete a job",          href: "/admin/jobs",                    hint: "Worker reports done, client service code" },
] as const;

export default function OnboardingChecklist({ state }: { state: OnboardingState }) {
  const steps = STEPS.map(s => ({ ...s, done: state[s.key] }));
  const completedCount = steps.filter(s => s.done).length;
  const pct = Math.round((completedCount / steps.length) * 100);

  // Auto-collapse at 80%+; user can re-expand
  const [collapsed, setCollapsed] = useState(pct >= 80);
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || completedCount === steps.length) return null;

  return (
    <div className="bg-white rounded-[16px] border border-[#BFDBFE] shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 sm:px-5 sm:py-3.5 flex items-start sm:items-center justify-between gap-3">
        <button
          onClick={() => setCollapsed(v => !v)}
          className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 min-w-0 text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-[10px] bg-[#DBEAFE] flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-[#0F172A] text-sm leading-tight">Get started with FieldFlow</p>
              <p className="text-xs text-[#94A3B8] mt-1 sm:mt-0.5">{completedCount} of {steps.length} steps complete</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto sm:shrink-0">
            <div className="flex items-center gap-2 flex-1 sm:flex-none min-w-0">
              <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden flex-1 sm:w-24">
                <div
                  className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-[#16A34A]" : "bg-[#2563EB]"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className={`text-xs font-bold w-9 text-right ${pct >= 80 ? "text-[#16A34A]" : "text-[#2563EB]"}`}>{pct}%</span>
            </div>
            <ChevronDown className={`w-4 h-4 text-[#94A3B8] transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </div>
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="p-1.5 rounded-[8px] text-[#94A3B8] hover:text-[#64748B] hover:bg-[#F1F5F9] transition-colors shrink-0"
          title="Dismiss checklist"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Steps grid — hidden when collapsed */}
      {!collapsed && (
        <div className="px-5 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 border-t border-[#F1F5F9] pt-3">
          {steps.map(step => (
            <Link key={step.key} href={step.done ? "#" : step.href}
              className={`flex items-start gap-2 p-2.5 rounded-[10px] border transition-all text-left ${
                step.done
                  ? "border-[#BBF7D0] bg-[#F0FDF4] cursor-default"
                  : "border-[#E2E8F0] hover:border-[#BFDBFE] hover:bg-[#EFF6FF]"
              }`}>
              {step.done
                ? <CheckCircle2 className="w-3.5 h-3.5 text-[#16A34A] shrink-0 mt-0.5" />
                : <Circle className="w-3.5 h-3.5 text-[#CBD5E1] shrink-0 mt-0.5" />}
              <div className="min-w-0">
                <p className={`text-[11px] font-medium leading-tight ${
                  step.done ? "text-[#16A34A] line-through decoration-[#86EFAC]" : "text-[#334155]"
                }`}>
                  {step.label}
                </p>
                {!step.done && <p className="text-[10px] text-[#94A3B8] mt-0.5 leading-tight">{step.hint}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
