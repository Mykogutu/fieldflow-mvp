import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: { filter?: string; page?: string };
}) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();

  const filter = searchParams?.filter ?? "all";
  const page = searchParams?.page ? parseInt(searchParams.page) : 1;
  const take = 30;
  const skip = (page - 1) * take;

  const where = {
    workspaceId,
    ...(filter === "unread" ? { isRead: false } : {}),
    ...(filter === "read" ? { isRead: true } : {}),
  };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { workspaceId, isRead: false } }),
  ]);

  const pages = Math.ceil(total / take);

  return (
    <NotificationsClient
      notifications={notifications as never}
      total={total}
      unreadCount={unreadCount}
      pages={pages}
      currentPage={page}
      currentFilter={filter}
    />
  );
}
