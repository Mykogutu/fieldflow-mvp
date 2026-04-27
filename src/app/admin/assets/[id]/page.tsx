import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import { notFound } from "next/navigation";
import AssetDetailClient from "./AssetDetailClient";

async function getAsset(id: string) {
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
  if (!asset) return null;

  const documents = await prisma.document.findMany({
    where: { workspaceId, jobId: { in: asset.jobs.map(j => j.id) } },
    orderBy: { generatedAt: "desc" },
  });

  return { ...asset, documents };
}

export default async function AssetDetailPage({ params }: { params: { id: string } }) {
  const asset = await getAsset(params.id);
  if (!asset) notFound();

  return <AssetDetailClient asset={asset as never} />;
}
