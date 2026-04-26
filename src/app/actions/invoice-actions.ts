"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import type { Prisma } from "@prisma/client";

export async function getInvoices(filter?: { status?: string; page?: number }) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const page = filter?.page ?? 1;
  const take = 20;
  const skip = (page - 1) * take;
  const where: Prisma.InvoiceWhereInput = { workspaceId };
  if (filter?.status && filter.status !== "ALL") {
    where.status = filter.status as Prisma.InvoiceWhereInput["status"];
  }

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { job: { select: { jobType: true, location: true, workers: { select: { name: true } } } } },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.invoice.count({ where }),
  ]);

  return { invoices, total, page, pages: Math.ceil(total / take) };
}

export async function updateInvoiceStatus(invoiceId: string, status: "PENDING" | "PAID" | "CANCELLED") {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const result = await prisma.invoice.updateMany({
    where: { id: invoiceId, workspaceId },
    data: { status, paidAt: status === "PAID" ? new Date() : undefined },
  });
  if (result.count === 0) return { error: "Invoice not found" };
  revalidatePath("/admin/invoices");
  return { ok: true };
}
