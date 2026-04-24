"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createExpense, deleteExpense } from "@/app/actions/expense-actions";
import { formatDate, formatKES } from "@/lib/utils";

const CATEGORIES = ["MATERIALS", "TRANSPORT", "FUEL", "TOOLS", "LABOR", "OTHER"];
const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

interface Expense {
  id: string; description: string; amount: number; category: string; date: string; notes: string | null;
}

export default function ExpensesClient({
  expenses, total, currentCategory,
}: { expenses: Expense[]; total: number; pages: number; currentCategory?: string }) {
  const router = useRouter();
  const [showAdd, setShowAdd] = useState(false);
  const [isPending, startTransition] = useTransition();

  const totalAmount = expenses.reduce((s, e) => s + e.amount, 0);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Expenses <span className="text-gray-400 text-lg font-normal">({total})</span></h1>
        <button onClick={() => setShowAdd(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm font-medium">
          + Add Expense
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl px-5 py-4">
        <p className="text-sm text-gray-500">Showing total</p>
        <p className="text-2xl font-bold text-gray-900">{formatKES(totalAmount)}</p>
      </div>

      {/* Filter */}
      <div className="flex gap-1 flex-wrap">
        {["ALL", ...CATEGORIES].map((c) => (
          <button key={c} onClick={() => {
            const sp = new URLSearchParams();
            if (c !== "ALL") sp.set("category", c);
            router.push(`/admin/expenses?${sp}`);
          }}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              (currentCategory ?? "ALL") === c ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-blue-400"
            }`}
          >
            {c.charAt(0) + c.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Description</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Category</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Amount</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Date</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{exp.description}</p>
                    {exp.notes && <p className="text-xs text-gray-400 mt-0.5">{exp.notes}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">{exp.category}</span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatKES(exp.amount)}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">{formatDate(exp.date)}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(exp.id)} className="text-red-500 hover:underline text-xs">Delete</button>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No expenses found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Add Expense</h2>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="p-6">
              <form onSubmit={handleCreate} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <input name="description" required className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Amount (KES)</label>
                    <input name="amount" type="number" required className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                    <select name="category" required className={inputCls}>
                      {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                  <input name="date" type="date" className={inputCls} defaultValue={new Date().toISOString().split("T")[0]} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optional)</label>
                  <input name="notes" className={inputCls} />
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowAdd(false)} className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm">Cancel</button>
                  <button type="submit" disabled={isPending} className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                    {isPending ? "Saving..." : "Save Expense"}
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
