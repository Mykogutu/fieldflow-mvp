"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

export async function markDocumentSent(docId: string, via: "WHATSAPP" | "EMAIL" | "MANUAL") {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();

  const result = await prisma.document.updateMany({
    where: { id: docId, workspaceId },
    data: { sentAt: new Date(), sentVia: via },
  });

  if (result.count === 0) return { error: "Document not found" };

  revalidatePath("/admin/documents");
  return { ok: true };
}

export async function getDocuments(filter?: { type?: string; page?: number }) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const page = filter?.page ?? 1;
  const take = 50;
  const skip = (page - 1) * take;

  const where = {
    workspaceId,
    ...(filter?.type ? { type: filter.type as never } : {}),
  };

  const [docs, total] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      take,
      skip,
    }),
    prisma.document.count({ where: { workspaceId } }),
  ]);

  const typeCounts = await prisma.document.groupBy({
    by: ["type"],
    where: { workspaceId },
    _count: { _all: true },
  });

  return { docs, total, typeCounts };
}
