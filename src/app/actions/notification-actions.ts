"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getNotifications(limit = 20) {
  await requireAdmin();
  return prisma.notification.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getUnreadCount() {
  await requireAdmin();
  return prisma.notification.count({ where: { isRead: false } });
}

export async function markAsRead(id: string) {
  await requireAdmin();
  await prisma.notification.update({ where: { id }, data: { isRead: true } });
  revalidatePath("/admin");
  return { ok: true };
}

export async function markAllAsRead() {
  await requireAdmin();
  await prisma.notification.updateMany({ where: { isRead: false }, data: { isRead: true } });
  revalidatePath("/admin");
  return { ok: true };
}
