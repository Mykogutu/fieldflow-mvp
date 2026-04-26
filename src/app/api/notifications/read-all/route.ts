import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";

export async function POST() {
  const session = await getSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const workspaceId = await currentWorkspaceId();
  await prisma.notification.updateMany({
    where: { workspaceId, isRead: false },
    data: { isRead: true },
  });
  return NextResponse.json({ ok: true });
}
