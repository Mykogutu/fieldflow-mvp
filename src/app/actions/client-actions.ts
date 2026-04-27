"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { normalizePhone } from "@/lib/utils";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const clientSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z.string().min(9, "Phone is required"),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().optional(),
  location: z.string().optional(),
  address: z.string().optional(),
  type: z.enum(["INDIVIDUAL", "COMPANY"]).default("INDIVIDUAL"),
  notes: z.string().optional(),
});

export async function createClient(formData: FormData) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid data" };

  const d = parsed.data;
  const phone = normalizePhone(d.phone);

  try {
    const client = await prisma.client.create({
      data: {
        workspaceId,
        name: d.name,
        phone,
        email: d.email || null,
        company: d.company || null,
        location: d.location || null,
        address: d.address || null,
        type: d.type,
        notes: d.notes || null,
      },
    });
    revalidatePath("/admin/clients");
    return { ok: true, id: client.id };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return { error: "A client with this phone number already exists." };
    }
    return { error: "Failed to create client." };
  }
}

export async function updateClient(formData: FormData) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const id = formData.get("id") as string;
  if (!id) return { error: "Missing client ID" };

  const raw = Object.fromEntries(formData.entries());
  const parsed = clientSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid data" };

  const d = parsed.data;
  const phone = normalizePhone(d.phone);

  try {
    await prisma.client.update({
      where: { id, workspaceId },
      data: {
        name: d.name,
        phone,
        email: d.email || null,
        company: d.company || null,
        location: d.location || null,
        address: d.address || null,
        type: d.type,
        notes: d.notes || null,
      },
    });
    revalidatePath("/admin/clients");
    revalidatePath(`/admin/clients/${id}`);
    return { ok: true };
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") {
      return { error: "Phone number already used by another client." };
    }
    return { error: "Failed to update client." };
  }
}

export async function deactivateClient(id: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  await prisma.client.update({ where: { id, workspaceId }, data: { isActive: false } });
  revalidatePath("/admin/clients");
  return { ok: true };
}

export async function getClients(search?: string) {
  const workspaceId = await currentWorkspaceId();
  return prisma.client.findMany({
    where: {
      workspaceId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { company: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });
}

export async function getClientsWithStats(search?: string, filter?: "unpaid" | "active" | "all") {
  const workspaceId = await currentWorkspaceId();

  const clients = await prisma.client.findMany({
    where: {
      workspaceId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { phone: { contains: search } },
              { company: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
  });

  if (clients.length === 0) return [];

  const phones = clients.map(c => c.phone);

  // Batch-fetch jobs and invoices for all clients in one query each
  const [allJobs, allInvoices] = await Promise.all([
    prisma.job.findMany({
      where: { workspaceId, clientPhone: { in: phones } },
      select: { clientPhone: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { workspaceId, clientPhone: { in: phones } },
      select: { clientPhone: true, amount: true, status: true },
    }),
  ]);

  // Build stats maps
  const jobsMap: Record<string, typeof allJobs> = {};
  const invoicesMap: Record<string, typeof allInvoices> = {};
  for (const j of allJobs) { (jobsMap[j.clientPhone] ??= []).push(j); }
  for (const i of allInvoices) { (invoicesMap[i.clientPhone] ??= []).push(i); }

  const result = clients.map(c => {
    const jobs = jobsMap[c.phone] ?? [];
    const invoices = invoicesMap[c.phone] ?? [];
    const totalInvoiced = invoices.reduce((s, i) => s + i.amount, 0);
    const totalPaid = invoices.filter(i => i.status === "PAID").reduce((s, i) => s + i.amount, 0);
    const outstanding = totalInvoiced - totalPaid;
    const lastJob = jobs[0]?.createdAt ?? null;

    return { ...c, jobCount: jobs.length, outstanding, lastJobDate: lastJob };
  });

  if (filter === "unpaid") return result.filter(c => c.outstanding > 0);
  return result;
}

export async function getClientWithDetails(id: string) {
  const workspaceId = await currentWorkspaceId();
  const client = await prisma.client.findFirst({ where: { id, workspaceId } });
  if (!client) return null;

  const [jobs, assets, invoices] = await Promise.all([
    prisma.job.findMany({
      where: { workspaceId, clientPhone: client.phone },
      include: {
        workers: { select: { name: true } },
        invoice: { select: { amount: true, status: true, invoiceNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
    prisma.asset.findMany({
      where: { workspaceId, clientPhone: client.phone },
      orderBy: { createdAt: "desc" },
    }),
    prisma.invoice.findMany({
      where: { workspaceId, clientPhone: client.phone },
      include: { job: { select: { jobType: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return { ...client, jobs, assets, invoices };
}
