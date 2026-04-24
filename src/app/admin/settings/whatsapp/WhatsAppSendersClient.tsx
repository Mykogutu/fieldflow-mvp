"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createSender,
  deleteSender,
  setDefaultSender,
} from "@/app/actions/sender-actions";
import type { WhatsAppSender, BrandingTier } from "@prisma/client";

const inputCls =
  "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

const TIERS: Array<{
  key: BrandingTier;
  title: string;
  blurb: string;
  badge: string;
}> = [
  {
    key: "SHARED",
    title: "Shared FieldFlow Number",
    blurb:
      "Use FieldFlow's number. Your brand name appears in every message body. Includes a “Powered by FieldFlow” footer.",
    badge: "Free / Starter",
  },
  {
    key: "MANAGED",
    title: "Dedicated Branded Number",
    blurb:
      "We provision a unique WhatsApp Business number with your verified name + logo, operated under FieldFlow's BSP.",
    badge: "Pro · $79/mo",
  },
  {
    key: "BYO_WABA",
    title: "Connect Your Own WhatsApp Business",
    blurb:
      "90-second Meta login. You own the number forever. Best for established businesses with an existing WABA.",
    badge: "Business · $299+/mo",
  },
];

export default function WhatsAppSendersClient({
  senders,
}: {
  senders: WhatsAppSender[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [selectedTier, setSelectedTier] = useState<BrandingTier>("SHARED");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    phoneNumber: "",
    displayName: "",
    twilioAccountSid: "",
    twilioAuthToken: "",
    wabaId: "",
    profilePhotoUrl: "",
    isDefault: senders.length === 0,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      try {
        await createSender({ ...form, brandingTier: selectedTier });
        setShowForm(false);
        setForm({
          phoneNumber: "",
          displayName: "",
          twilioAccountSid: "",
          twilioAuthToken: "",
          wabaId: "",
          profilePhotoUrl: "",
          isDefault: false,
        });
        router.refresh();
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to add sender");
      }
    });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">WhatsApp Senders</h1>
        <p className="text-sm text-gray-600 mt-1">
          One codebase, many branded WhatsApp numbers. Add a sender for each
          workspace, region, or service line. The webhook automatically routes
          inbound messages based on the number they were sent to.
        </p>
      </header>

      {/* Tier ladder */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {TIERS.map((tier) => {
          const active = selectedTier === tier.key;
          return (
            <button
              key={tier.key}
              type="button"
              onClick={() => {
                setSelectedTier(tier.key);
                setShowForm(true);
              }}
              className={`text-left rounded-xl border p-4 transition ${
                active
                  ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm">{tier.title}</h3>
                <span className="text-[10px] uppercase tracking-wide bg-gray-100 px-2 py-1 rounded">
                  {tier.badge}
                </span>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed">{tier.blurb}</p>
            </button>
          );
        })}
      </div>

      {/* Existing senders */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <header className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-sm">Active Senders ({senders.length})</h2>
        </header>

        {senders.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-500">
            No senders yet. Pick a tier above to add your first one — or rely
            on the env-var fallback ({process.env.NEXT_PUBLIC_BRAND_NAME ?? "FieldFlow"}'s
            default number).
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="text-left px-5 py-2">Number</th>
                <th className="text-left px-5 py-2">Display Name</th>
                <th className="text-left px-5 py-2">Tier</th>
                <th className="text-left px-5 py-2">Status</th>
                <th className="text-right px-5 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {senders.map((s) => (
                <tr key={s.id} className="border-t border-gray-100">
                  <td className="px-5 py-3 font-mono text-xs">{s.phoneNumber}</td>
                  <td className="px-5 py-3">
                    {s.displayName}
                    {s.isDefault && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                        Default
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {tierLabel(s.brandingTier)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <StatusBadge status={s.status} verified={s.isVerified} />
                  </td>
                  <td className="px-5 py-3 text-right space-x-2">
                    {!s.isDefault && (
                      <button
                        onClick={() =>
                          startTransition(async () => {
                            await setDefaultSender(s.id);
                            router.refresh();
                          })
                        }
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (!confirm(`Delete sender ${s.phoneNumber}?`)) return;
                        startTransition(async () => {
                          await deleteSender(s.id);
                          router.refresh();
                        });
                      }}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* Add sender form */}
      {showForm && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <header className="mb-4">
            <h2 className="font-semibold">
              Add {tierLabel(selectedTier)} Sender
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {selectedTier === "BYO_WABA"
                ? "Embedded Signup is the production path — this manual form is for testing."
                : "Provide the Twilio subaccount credentials for this number."}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="WhatsApp Number (E.164)">
                <input
                  className={inputCls}
                  placeholder="+254712345678"
                  value={form.phoneNumber}
                  onChange={(e) =>
                    setForm({ ...form, phoneNumber: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Display Name">
                <input
                  className={inputCls}
                  placeholder="AquaTech Plumbing"
                  value={form.displayName}
                  onChange={(e) =>
                    setForm({ ...form, displayName: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Twilio Account SID">
                <input
                  className={inputCls}
                  placeholder="AC..."
                  value={form.twilioAccountSid}
                  onChange={(e) =>
                    setForm({ ...form, twilioAccountSid: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Twilio Auth Token">
                <input
                  className={inputCls}
                  type="password"
                  placeholder="••••••••"
                  value={form.twilioAuthToken}
                  onChange={(e) =>
                    setForm({ ...form, twilioAuthToken: e.target.value })
                  }
                  required
                />
              </Field>

              {selectedTier !== "SHARED" && (
                <>
                  <Field label="WABA ID (optional)">
                    <input
                      className={inputCls}
                      placeholder="123456789012345"
                      value={form.wabaId}
                      onChange={(e) =>
                        setForm({ ...form, wabaId: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Profile Photo URL (optional)">
                    <input
                      className={inputCls}
                      placeholder="https://…/logo.png"
                      value={form.profilePhotoUrl}
                      onChange={(e) =>
                        setForm({ ...form, profilePhotoUrl: e.target.value })
                      }
                    />
                  </Field>
                </>
              )}
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.isDefault}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
              />
              Make this the default sender (used for outbound-only flows like
              daily briefings)
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? "Saving…" : "Add Sender"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Architectural reminder */}
      <aside className="text-xs text-gray-500 leading-relaxed bg-gray-50 border border-gray-100 rounded-lg p-4">
        <strong>How routing works:</strong> When a worker sends a WhatsApp,
        the webhook reads the inbound <code>To</code> field, looks it up in
        this table, and replies using that sender's credentials. Workspaces
        are isolated by sender — no cross-tenant message leakage is possible.
        See <code>MVP-STRATEGY.md §17</code> for the full architecture.
      </aside>
    </div>
  );
}

function tierLabel(tier: BrandingTier): string {
  switch (tier) {
    case "SHARED":
      return "Shared";
    case "MANAGED":
      return "Managed";
    case "BYO_WABA":
      return "BYO WABA";
  }
}

function StatusBadge({
  status,
  verified,
}: {
  status: string;
  verified: boolean;
}) {
  const color =
    status === "ACTIVE"
      ? "bg-green-100 text-green-700"
      : status === "PENDING"
        ? "bg-amber-100 text-amber-700"
        : status === "REJECTED" || status === "SUSPENDED"
          ? "bg-red-100 text-red-700"
          : "bg-gray-100 text-gray-700";
  return (
    <span className={`text-xs px-2 py-1 rounded ${color}`}>
      {status}
      {verified && " ✓"}
    </span>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-600 mb-1">
        {label}
      </span>
      {children}
    </label>
  );
}
