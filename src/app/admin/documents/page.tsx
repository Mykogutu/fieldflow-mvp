import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import DocumentsClient from "./DocumentsClient";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams?: { type?: string };
}) {
  const workspaceId = await currentWorkspaceId();
  const typeFilter = searchParams?.type;

  const where = {
    workspaceId,
    ...(typeFilter ? { type: typeFilter as never } : {}),
  };

  const [docs, total, typeCounts] = await Promise.all([
    prisma.document.findMany({
      where,
      orderBy: { generatedAt: "desc" },
      take: 50,
    }),
    prisma.document.count({ where: { workspaceId } }),
    prisma.document.groupBy({
      by: ["type"],
      where: { workspaceId },
      _count: { _all: true },
    }),
  ]);

  return (
    <DocumentsClient
      docs={docs as never}
      total={total}
      typeCounts={typeCounts}
      typeFilter={typeFilter}
    />
  );
}
