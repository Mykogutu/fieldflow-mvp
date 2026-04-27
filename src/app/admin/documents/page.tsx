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

  const [rawDocs, total, typeCounts] = await Promise.all([
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

  // Enrich docs with client name and asset name from linked jobs
  const jobIds = rawDocs.map(d => d.jobId).filter(Boolean) as string[];
  const jobs = jobIds.length > 0
    ? await prisma.job.findMany({
        where: { id: { in: jobIds }, workspaceId },
        select: { id: true, clientName: true, asset: { select: { name: true } } },
      })
    : [];

  const jobMap = Object.fromEntries(jobs.map(j => [j.id, j]));

  const docs = rawDocs.map(doc => ({
    ...doc,
    clientName: doc.jobId ? (jobMap[doc.jobId]?.clientName ?? null) : null,
    assetName: doc.jobId ? (jobMap[doc.jobId]?.asset?.name ?? null) : null,
  }));

  return (
    <DocumentsClient
      docs={docs as never}
      total={total}
      typeCounts={typeCounts}
      typeFilter={typeFilter}
    />
  );
}
