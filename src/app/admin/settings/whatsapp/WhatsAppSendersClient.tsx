"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSender, deleteSender, setDefaultSender,
} from "@/app/actions/sender-actions";
import type { WhatsAppSender, BrandingTier } from "@prisma/client";
import {
  MessageCircle, Plus, X, Check, Trash2, Star, AlertTriangle,
  Shield, Zap, Phone, ChevronLeft,
} from "lucide-react";
import Link from "next/link";

// ── Tier definitions ──────────────────────────────────────────────────────────
const TIERS: { key: BrandingTier; title: string; blurb: string; badge: string; badgeBg: string; badgeText: string }[] = [
  {
    key: "SHARED",
    title: "Shared FieldFlow Number",
    blurb: "Use FieldFlow’s number. Your brand name appears in every message body. Includes a “Powered by FieldFlow” footer.",
    badge: "Free / Starter",
    badgeBg: "bg-[#F1F5F9]", badgeText: "text-[#64748B]",
  },
  {
    key: "MANAGED",
    title: "Dedicated Branded Number",
    blurb: "We provision a unique WhatsApp Business number with your verified name + logo, operated under FieldFlow's BSP.",
    badge: "Pro · $79/mo",
    badgeBg: "bg-blue-50", badgeText: "text-[#2563EB]",
  },
  {
    key: "BYO_WABA",
    title: "Connect Your Own WhatsApp Business",
    blurb: "90-second Meta login. You own the number forever. Best for established businesses with an existing WABA.",
    badge: "Business · $299+/mo",
    badgeBg: "bg-purple-50", badgeText: "text-[#7C3AED]",
  },
];

// ── Status badge ──────────────────────────────────────────────────────────────
function SenderStatusBadge({ status, verified }: { status: string; verified: boolean }) {
  const config: Record<string, { bg: string; text: string }> = {
    ACTIVE:    { bg: "bg-green-50",  text: "text-[#16A34A]"  },
    PENDING:   { bg: "bg-amber-50",  text: "text-[#D97706]"  },
    REJECTED:  { bg: "bg-red-50",    text: "text-[#DC2626]"  },
    SUSPENDED: { bg: "bg-red-50",    text: "text-[#DC2626]"  },
  };
  const { bg, text } = config[status] ?? { bg: "bg-[#F1F5F9]", text: "text-[#64748B]" };
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${bg} ${text}`}>
      {status === "ACTIVE" && <Check className="w-3 h-3" />}
      {status}
      {verified && <span className="ml-0.5 text-[10px]">✓</span>}
    </span>
  );
}

// ── Tier badge ────────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: BrandingTier }) {
  const config: Record<BrandingTier, { label: string; bg: string; text: string }> = {
    SHARED:   { label: "Shared",   bg: "bg-[#F1F5F9]", text: "text-[#64748B]" },
    MANAGED:  { label: "Managed",  bg: "bg-blue-50",   text: "text-[#2563EB]" },
    BYO_WABA: { label: "BYO WABA", bg: "bg-purple-50", text: "text-[#7C3AED]" },
  };
  const { label, bg, text } = config[tier];
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px] ${bg} ${text}`}>
      {label}
    </span>
  );
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-[#475569] mb-1.5">{label}</label>
      {children}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WhatsAppSendersClient({ senders }: { senders: WhatsAppSender[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selectedTier, setSelectedTier] = useState<BrandingTier>("SHARED");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    phoneNumber: "", displayName: "",
    twilioAccountSid: "", twilioAuthToken: "",
    wabaId: "", profilePhotoUrl: "",
    isDefault: senders.length === 0,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createSender({ ...form, brandingTier: selectedTier });
        setShowForm(false);
        setForm({ phoneNumber: "", displayName: "", twilioAccountSid: "", twilioAuthToken: "", wabaId: "", profilePhotoUrl: "", isDefault: false });
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to add sender");
      }
    });
  }

  return (
    <div className="space-y-5 max-w-4xl">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3">
        <Link href="/admin/settings"
          className="mt-0.5 p-1.5 rounded-[8px] border border-[#E2E8F0] text-[#64748B] hover:bg-[#F8FAFC] transition-colors shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="ff-page-title">WhatsApp Senders</h1>
          <p className="ff-page-desc">
            One codebase, many branded WhatsApp numbers. The webhook routes inbound messages based on the number they were sent to.
          </p>
        </div>
      </div>

      {/* ── Tier picker ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map(tier => {
          const active = selectedTier === tier.key;
          const TierIcon = tier.key === "SHARED" ? MessageCircle : tier.key === "MANAGED" ? Shield : Zap;
          return (
            <button key={tier.key} type="button"
              onClick={() => { setSelectedTier(tier.key); setShowForm(true); }}
              className={`text-left rounded-[16px] border p-4 transition-all
                ${active
                  ? "border-[#2563EB] bg-blue-50 shadow-[0_0_0_3px_rgba(37,99,235,0.15)]"
                  : "border-[#E2E8F0] bg-white hover:border-[#CBD5E1] hover:shadow-card"
                }`}>
              <div className="flex items-start justify-between mb-3">
                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0
                  ${active ? "bg-[#2563EB]" : "bg-[#F1F5F9]"}`}>
                  <TierIcon className={`w-4 h-4 ${active ? "text-white" : "text-[#94A3B8]"}`} />
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-[4px] ${tier.badgeBg} ${tier.badgeText}`}>
                  {tier.badge}
                </span>
              </div>
              <h3 className={`text-sm font-semibold mb-1 ${active ? "text-[#0F172A]" : "text-[#334155]"}`}>{tier.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{tier.blurb}</p>
            </button>
          );
        })}
      </div>

      {/* ── Active senders table ─────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-green-600" />
            <h2 className="font-semibold text-sm text-[#0F172A]">Active Senders</h2>
            <span className="text-xs text-[#94A3B8]">({senders.length})</span>
          </div>
          <button onClick={() => setShowForm(v => !v)}
            className="ff-btn-primary flex items-center gap-1.5 text-sm px-3 py-1.5">
            <Plus className="w-3.5 h-3.5" /> Add Sender
          </button>
        </div>

        {senders.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-[#94A3B8]" />
            </div>
            <p className="text-sm font-semibold text-[#475569]">No senders yet</p>
            <p className="text-xs text-[#94A3B8] max-w-xs">
              Pick a tier above to add your first one, or rely on the env-var fallback default number.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Number</th>
                  <th>Display Name</th>
                  <th>Tier</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {senders.map(s => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-[7px] bg-green-50 flex items-center justify-center shrink-0">
                          <Phone className="w-3.5 h-3.5 text-green-600" />
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#0F172A]">{s.phoneNumber}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-[#334155]">{s.displayName}</span>
                        {s.isDefault && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-[#2563EB] px-1.5 py-0.5 rounded-[4px]">
                            <Star className="w-2.5 h-2.5" /> Default
                          </span>
                        )}
                      </div>
                    </td>
                    <td><TierBadge tier={s.brandingTier} /></td>
                    <td><SenderStatusBadge status={s.status} verified={s.isVerified} /></td>
                    <td>
                      <div className="flex items-center justify-end gap-1.5">
                        {!s.isDefault && (
                          <button
                            onClick={() => startTransition(async () => { await setDefaultSender(s.id); router.refresh(); })}
                            disabled={isPending}
                            className="text-[11px] font-semibold text-[#2563EB] hover:text-[#1D4ED8] border border-blue-200 hover:bg-blue-50 px-3 py-1.5 rounded-[6px] transition-colors disabled:opacity-50">
                            Set Default
                          </button>
                        )}
                        <button
                          onClick={() => { if (!confirm(`Delete sender ${s.phoneNumber}?`)) return; startTransition(async () => { await deleteSender(s.id); router.refresh(); }); }}
                          disabled={isPending}
                          className="p-1.5 rounded-[6px] border border-[#E2E8F0] text-[#94A3B8] hover:border-red-300 hover:text-[#DC2626] hover:bg-red-50 transition-colors disabled:opacity-50">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add form ────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0]">
            <div>
              <h2 className="font-bold text-[#0F172A]">
                Add {selectedTier === "SHARED" ? "Shared" : selectedTier === "MANAGED" ? "Managed" : "BYO WABA"} Sender
              </h2>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                {selectedTier === "BYO_WABA"
                  ? "Embedded Signup is the production path — this manual form is for testing."
                  : "Provide the Twilio subaccount credentials for this number."}
              </p>
            </div>
            <button onClick={() => setShowForm(false)}
              className="p-1.5 rounded-[8px] hover:bg-[#F8FAFC] text-[#94A3B8] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="WhatsApp Number (E.164)">
                <input className="ff-input text-sm" placeholder="+254712345678"
                  value={form.phoneNumber} onChange={e => setForm({ ...form, phoneNumber: e.target.value })} required />
              </Field>
              <Field label="Display Name">
                <input className="ff-input text-sm" placeholder="AquaTech Plumbing"
                  value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} required />
              </Field>
              <Field label="Twilio Account SID">
                <input className="ff-input text-sm" placeholder="AC…"
                  value={form.twilioAccountSid} onChange={e => setForm({ ...form, twilioAccountSid: e.target.value })} required />
              </Field>
              <Field label="Twilio Auth Token">
                <input className="ff-input text-sm" type="password" placeholder="••••••••"
                  value={form.twilioAuthToken} onChange={e => setForm({ ...form, twilioAuthToken: e.target.value })} required />
              </Field>

              {selectedTier !== "SHARED" && (
                <>
                  <Field label="WABA ID (optional)">
                    <input className="ff-input text-sm" placeholder="123456789012345"
                      value={form.wabaId} onChange={e => setForm({ ...form, wabaId: e.target.value })} />
                  </Field>
                  <Field label="Profile Photo URL (optional)">
                    <input className="ff-input text-sm" placeholder="https://…/logo.png"
                      value={form.profilePhotoUrl} onChange={e => setForm({ ...form, profilePhotoUrl: e.target.value })} />
                  </Field>
                </>
              )}
            </div>

            <label className="flex items-center gap-2.5 mt-4 cursor-pointer">
              <input type="checkbox" checked={form.isDefault}
                onChange={e => setForm({ ...form, isDefault: e.target.checked })}
                className="w-4 h-4 rounded border-[#E2E8F0] text-[#2563EB] focus:ring-[#2563EB]" />
              <span className="text-sm text-[#475569]">
                Make this the default sender (used for outbound-only flows like daily briefings)
              </span>
            </label>

            <div className="flex items-center gap-3 mt-5">
              <button type="submit" disabled={isPending}
                className="ff-btn-primary flex items-center gap-2 text-sm px-4 py-2.5 disabled:opacity-50">
                {isPending ? (
                  <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
                {isPending ? "Saving…" : "Add Sender"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="ff-btn-secondary text-sm px-4 py-2.5">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Architecture note ────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 text-xs text-[#64748B] bg-[#F8FAFC] border border-[#E2E8F0] rounded-[12px] p-4 leading-relaxed">
        <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#475569]">How routing works: </span>
          When a worker sends a WhatsApp, the webhook reads the inbound <code className="font-mono bg-[#E2E8F0] px-1 rounded text-[#334155]">To</code> field,
          looks it up in this table, and replies using that sender&apos;s credentials. Workspaces are
          isolated by sender — no cross-tenant message leakage is possible.
          See <code className="font-mono bg-[#E2E8F0] px-1 rounded text-[#334155]">MVP-STRATEGY.md §17</code> for the full architecture.
        </div>
      </div>
    </div>
  );
}
