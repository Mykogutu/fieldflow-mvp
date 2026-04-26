import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const workspaceId = await currentWorkspaceId();
  const body: Record<string, string> = await req.json();

  await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where: { workspaceId_key: { workspaceId, key } },
        update: { value },
        create: { key, value, workspaceId },
      })
    )
  );

  return NextResponse.json({ ok: true });
}
