"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";

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
  const workspaceId = await currentWorkspaceId();
  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.message };
  const d = parsed.data;
  await prisma.expense.create({
    data: {
      workspaceId,
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
  const workspaceId = await currentWorkspaceId();
  const page = filter?.page ?? 1;
  const take = 20;
  const skip = (page - 1) * take;
  const where: Prisma.ExpenseWhereInput = { workspaceId };
  if (filter?.category && filter.category !== "ALL") {
    where.category = filter.category as Prisma.ExpenseWhereInput["category"];
  }
  const [expenses, total] = await Promise.all([
    prisma.expense.findMany({ where, orderBy: { date: "desc" }, take, skip }),
    prisma.expense.count({ where }),
  ]);
  return { expenses, total, page, pages: Math.ceil(total / take) };
}

export async function deleteExpense(id: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const result = await prisma.expense.deleteMany({ where: { id, workspaceId } });
  if (result.count === 0) return { error: "Expense not found" };
  revalidatePath("/admin/expenses");
  return { ok: true };
}
