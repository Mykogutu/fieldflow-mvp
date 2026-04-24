"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  description: z.string().min(1),
  amount: z.coerce.number().positive(),
  category: z.enum(["MATERIALS", "TRANSPORT", "FUEL", "TOOLS", "LABOR", "OTHER"]),
  jobId: z.string().optional(),
  date: z.string().optional(),
  notes: z.string().optional(),
});

export async function createExpense(formData: FormData) {
  await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.message };
  const d = parsed.data;
  await prisma.expense.create({
    data: {
      description: d.description,
      amount: d.amount,
      category: d.category,
      jobId: d.jobId || undefined,
      date: d.date ? new Date(d.date) : new Date(),
      notes: d.notes,
    },
  });
  revalidatePath("/admin/expenses");
  return { ok: true };
}

export async function getExpenses(filter?: { category?: string; page?: number }) {
  await requireAdmin();
  const page = filter?.page ?? 1;
  const take = 20;
  const skip = (page - 1) * take;
  const where = filter?.category && filter.category !== "ALL" ? { category: filter.category as never } : {};
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { date: "desc" }, take, skip }),
    prisma.expense.count({ where }),
  ]);
  return { expenses, total, page, pages: Math.ceil(total / take) };
}

export async function deleteExpense(id: string) {
  await requireAdmin();
  await prisma.expense.delete({ where: { id } });
  revalidatePath("/admin/expenses");
  return { ok: true };
}
