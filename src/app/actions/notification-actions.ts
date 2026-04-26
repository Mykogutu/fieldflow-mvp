"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export async function getNotifications(limit = 20) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  return prisma.notification.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount() {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  return prisma.notification.count({ where: { workspaceId, isRead: false } });
}

export async function markAsRead(id: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const result = await prisma.notification.updateMany({
    where: { id, workspaceId },
    data: { isRead: true },
  });
  if (result.count === 0) return { error: "Notification not found" };
  revalidatePath("/admin");
  return { ok: true };
}

export async function markAllAsRead() {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  await prisma.notification.updateMany({
    where: { workspaceId, isRead: false },
    data: { isRead: true },
  });
  revalidatePath("/admin");
  return { ok: true };
}
