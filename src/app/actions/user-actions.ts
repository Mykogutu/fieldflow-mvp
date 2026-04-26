"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { hashPassword } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(9),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "TECHNICIAN"]).default("TECHNICIAN"),
  baseZone: z.string().optional(),
});

const updateSchema = z.object({
  id: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  password: z.string().min(6).optional().or(z.literal("")),
  baseZone: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
});

export async function createUser(formData: FormData) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const parsed = createSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.message };
  const d = parsed.data;
  const phone = normalizePhone(d.phone);
  // Phone is globally unique across workspaces (one human = one phone).
  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) return { error: "A user with this phone number already exists." };
  const hashed = await hashPassword(d.password);
  await prisma.user.create({
    data: {
      workspaceId,
      name: d.name,
      phone,
      email: d.email || undefined,
      password: hashed,
      role: d.role,
      baseZone: d.baseZone || undefined,
    },
  });
  revalidatePath("/admin/workers");
  return { ok: true };
}

export async function updateUser(formData: FormData) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: parsed.error.message };
  const { id, password, ...rest } = parsed.data;
  const data: Record<string, unknown> = { ...rest };
  if (password) data.password = await hashPassword(password);
  const result = await prisma.user.updateMany({ where: { id, workspaceId }, data });
  if (result.count === 0) return { error: "User not found" };
  revalidatePath("/admin/workers");
  return { ok: true };
}

export async function getUsers(role?: "ADMIN" | "TECHNICIAN") {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  return prisma.user.findMany({
    where: role ? { workspaceId, role } : { workspaceId },
    select: { id: true, name: true, phone: true, email: true, role: true, baseZone: true, isActive: true },
    orderBy: { name: "asc" },
  });
}

export async function deleteUser(id: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const result = await prisma.user.updateMany({
    where: { id, workspaceId },
    data: { isActive: false },
  });
  if (result.count === 0) return { error: "User not found" };
  revalidatePath("/admin/workers");
  return { ok: true };
}
