"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getInvoices(filter?: { status?: string; page?: number }) {
  await requireAdmin();
  const page = filter?.page ?? 1;
  const take = 20;
  const skip = (page - 1) * take;
  const where = filter?.status && filter.status !== "ALL" ? { status: filter.status as never } : {};

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
  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { status, paidAt: status === "PAID" ? new Date() : undefined },
  });
  revalidatePath("/admin/invoices");
  return { ok: true };
}
