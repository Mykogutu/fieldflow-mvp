"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  assetType: z.string().min(1),
  identifier: z.string().optional(),
  serialNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  deviceNumber: z.string().optional(),
  simNumber: z.string().optional(),
  clientName: z.string().min(1),
  clientPhone: z.string().optional(),
  location: z.string().optional(),
  zone: z.string().optional(),
  installationDate: z.string().optional(),
  warrantyExpiryDate: z.string().optional(),
  notes: z.string().optional(),
});

const updateSchema = createSchema.partial().extend({ id: z.string() });

function emptyToUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === "" || v === undefined) continue;
    out[k] = v;
  }
  return out as Partial<T>;
}

export async function getAssets(filters?: { search?: string; assetType?: string }) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const where: Record<string, unknown> = { workspaceId };
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { clientName: { contains: filters.search, mode: "insensitive" } },
      { clientPhone: { contains: filters.search } },
      { serialNumber: { contains: filters.search, mode: "insensitive" } },
      { registrationNumber: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters?.assetType) where.assetType = filters.assetType;

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { jobs: true } },
    },
  });
  return assets;
}

export async function getAssetById(id: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  return prisma.asset.findFirst({ where: { id, workspaceId } });
}

export async function getAssetWithJobs(id: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const asset = await prisma.asset.findFirst({
    where: { id, workspaceId },
    include: {
      jobs: {
        orderBy: { scheduledDate: "desc" },
        include: {
          workers: { select: { id: true, name: true } },
          invoice: { select: { invoiceNumber: true, amount: true, status: true } },
        },
      },
    },
  });
  return asset;
}

export async function getAssetTypes(): Promise<string[]> {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const rows = await prisma.asset.findMany({
    where: { workspaceId },
    distinct: ["assetType"],
    select: { assetType: true },
    orderBy: { assetType: "asc" },
  });
  return rows.map((r) => r.assetType);
}

export async function createAsset(formData: FormData) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.message };
  const d = parsed.data;
  const data = emptyToUndefined({
    ...d,
    clientPhone: d.clientPhone ? normalizePhone(d.clientPhone) : undefined,
    installationDate: d.installationDate ? new Date(d.installationDate) : undefined,
    warrantyExpiryDate: d.warrantyExpiryDate ? new Date(d.warrantyExpiryDate) : undefined,
  });
  const asset = await prisma.asset.create({
    data: {
      workspaceId,
      name: d.name,
      assetType: d.assetType,
      clientName: d.clientName,
      ...data,
    },
  });
  revalidatePath("/admin/assets");
  return { ok: true, id: asset.id };
}

export async function updateAsset(formData: FormData) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.message };
  const { id, ...rest } = parsed.data;
  const data = emptyToUndefined({
    ...rest,
    clientPhone: rest.clientPhone ? normalizePhone(rest.clientPhone) : undefined,
    installationDate: rest.installationDate ? new Date(rest.installationDate) : undefined,
    warrantyExpiryDate: rest.warrantyExpiryDate ? new Date(rest.warrantyExpiryDate) : undefined,
  });
  const result = await prisma.asset.updateMany({ where: { id, workspaceId }, data });
  if (result.count === 0) return { error: "Asset not found" };
  revalidatePath("/admin/assets");
  revalidatePath(`/admin/assets/${id}`);
  return { ok: true };
}

export async function deleteAsset(id: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const linkedJobs = await prisma.job.count({ where: { assetId: id, workspaceId } });
  if (linkedJobs > 0) {
    return { error: `Cannot delete — ${linkedJobs} job(s) are linked to this asset.` };
  }
  const result = await prisma.asset.deleteMany({ where: { id, workspaceId } });
  if (result.count === 0) return { error: "Asset not found" };
  revalidatePath("/admin/assets");
  return { ok: true };
}
