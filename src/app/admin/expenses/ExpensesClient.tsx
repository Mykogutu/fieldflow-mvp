"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, X, Trash2, DollarSign, Truck, Wrench,
  Package, Users, Fuel, MoreHorizontal, TrendingDown,
} from "lucide-react";
import { createExpense, deleteExpense } from "@/app/actions/expense-actions";
import { formatDate, formatKES } from "@/lib/utils";

const CATEGORIES = ["MATERIALS", "TRANSPORT", "FUEL", "TOOLS", "LABOR", "OTHER"] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_META: Record<Category, { label: string; icon: React.ElementType; color: string; bg: string }> = {
  MATERIALS: { label: "Materials",  icon: Package,      color: "text-[#2563EB]",   bg: "bg-[#EFF6FF]"   },
  TRANSPORT: { label: "Transport",  icon: Truck,        color: "text-[#D97706]",  bg: "bg-[#FFFBEB]"  },
  FUEL:      { label: "Fuel",       icon: Fuel,         color: "text-[#EA580C]", bg: "bg-[#FFF7ED]" },
  TOOLS:     { label: "Tools",      icon: Wrench,       color: "text-[#9333EA]", bg: "bg-[#F5F3FF]" },
  LABOR:     { label: "Labor",      icon: Users,        color: "text-[#16A34A]",  bg: "bg-[#F0FDF4]"  },
  OTHER:     { label: "Other",      icon: MoreHorizontal,color:"text-[#475569]",  bg: "bg-[#F1F5F9]" },
};

interface Expense {
  id: string; description: string; amount: number;
  category: string; date: Date | string; notes: string | null;
}

export default function ExpensesClient({ expenses, total, currentCategory }: {
  expenses: Expense[]; total: number; pages: number; currentCategory?: string;
}) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

  // Per-category totals for summary cards
  const categoryTotals = CATEGORIES.reduce((acc, cat) => {
    acc[cat] = expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0);
    return acc;
  }, {} as Record<Category, number>);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      await createExpense(fd);
      setShowAdd(false);
      router.refresh();
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this expense?")) return;
    startTransition(async () => { await deleteExpense(id); router.refresh(); });
  }

  const activeTab = currentCategory ?? "ALL";

  const tabs = [
    { key: "ALL", label: "All", count: total },
    ...CATEGORIES.map(c => ({ key: c, label: CATEGORY_META[c].label, count: expenses.filter(e => e.category === c).length })),
  ];

  return (
    <div className="space-y-5">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="ff-page-title">Expenses</h1>
          <p className="ff-page-desc">{total} entries · {formatKES(totalAmount)} total</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="ff-btn-primary inline-flex items-center gap-2 text-sm px-4 py-2.5">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* ── Summary ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4 flex items-center gap-3 lg:col-span-1">
          <div className="w-10 h-10 rounded-[10px] bg-[#FFF1F2] flex items-center justify-center shrink-0">
            <TrendingDown className="w-5 h-5 text-[#DC2626]" />
          </div>
          <div>
            <p className="text-xs text-[#94A3B8] font-medium">Total Expenses</p>
            <p className="text-lg font-bold text-[#DC2626] leading-tight">{formatKES(totalAmount)}</p>
          </div>
        </div>
        {(["MATERIALS", "TRANSPORT", "FUEL"] as Category[]).map(cat => {
          const meta = CATEGORY_META[cat];
          return (
            <div key={cat} className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-[10px] ${meta.bg} flex items-center justify-center shrink-0`}>
                <meta.icon className={`w-5 h-5 ${meta.color}`} />
              </div>
              <div>
                <p className="text-xs text-[#94A3B8] font-medium">{meta.label}</p>
                <p className={`text-base font-bold leading-tight ${meta.color}`}>
                  {categoryTotals[cat] > 0 ? formatKES(categoryTotals[cat]) : "—"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tab bar + table card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-[16px] border border-[#E2E8F0] shadow-card overflow-hidden">
        {/* Tab bar */}
        <div className="border-b border-[#E2E8F0] px-4 py-3 overflow-x-auto scrollbar-none">
          <div className="flex gap-2 min-w-max">
            {tabs.map(tab => (
              <button key={tab.key}
                onClick={() => {
                  const sp = new URLSearchParams();
                  if (tab.key !== "ALL") sp.set("category", tab.key);
                  router.push(`/admin/expenses?${sp}`);
                }}
                className={`ff-tab min-h-9 px-4 py-2 ${activeTab === tab.key ? "ff-tab-active" : "ff-tab-inactive"}`}>
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full font-semibold
                    ${activeTab === tab.key ? "bg-[#2563EB]/15 text-[#2563EB]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {expenses.length === 0 ? (
          <div className="py-20 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F1F5F9] flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-[#94A3B8]" />
            </div>
            <p className="text-sm font-semibold text-[#475569]">No expenses found</p>
            <button onClick={() => setShowAdd(true)} className="ff-btn-primary text-sm px-4 py-2 inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ff-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Amount</th>
                  <th>Date</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(exp => {
                  const cat = exp.category as Category;
                  const meta = CATEGORY_META[cat] ?? CATEGORY_META.OTHER;
                  return (
                    <tr key={exp.id}>
                      <td>
                        <p className="font-semibold text-[#0F172A] text-sm">{exp.description}</p>
                        {exp.notes && <p className="text-[11px] text-[#94A3B8] mt-0.5">{exp.notes}</p>}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className={`w-6 h-6 rounded-[6px] flex items-center justify-center ${meta.bg}`}>
                            <meta.icon className={`w-3 h-3 ${meta.color}`} />
                          </div>
                          <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                        </div>
                      </td>
                      <td className="font-bold text-[#0F172A]">{formatKES(exp.amount)}</td>
                      <td className="text-[#64748B] whitespace-nowrap text-xs">{formatDate(exp.date)}</td>
                      <td className="text-right">
                        <button onClick={() => handleDelete(exp.id)} disabled={isPending}
                          className="p-1.5 rounded-[6px] border border-[#E2E8F0] text-[#94A3B8] hover:border-red-300 hover:text-[#DC2626] hover:bg-[#FFF1F2] transition-colors disabled:opacity-50"
                          title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Modal ────────────────────────────────────────────────────── */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[16px] shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0]">
              <h2 className="font-bold text-[#0F172A]">Add Expense</h2>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-[#F8FAFC] text-[#94A3B8]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Description <span className="text-[#F87171]">*</span></label>
                  <input name="description" required className="ff-input text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5">Amount (KES) <span className="text-[#F87171]">*</span></label>
                    <input name="amount" type="number" required min="0" step="0.01" className="ff-input text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#475569] mb-1.5">Category <span className="text-[#F87171]">*</span></label>
                    <select name="category" required className="ff-input text-sm">
                      {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_META[c].label}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Date</label>
                  <input name="date" type="date" className="ff-input text-sm"
                    defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#475569] mb-1.5">Notes</label>
                  <input name="notes" placeholder="optional" className="ff-input text-sm" />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="ff-btn-secondary flex-1 text-sm">Cancel</button>
                  <button type="submit" disabled={isPending} className="ff-btn-primary flex-1 text-sm disabled:opacity-50">
                    {isPending ? "Saving…" : "Save Expense"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
