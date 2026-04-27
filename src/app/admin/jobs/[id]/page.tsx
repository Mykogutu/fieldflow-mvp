import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import { notFound } from "next/navigation";
import { getUsers } from "@/app/actions/user-actions";
import JobDetailClient from "./JobDetailClient";

async function getJob(id: string) {
  const workspaceId = await currentWorkspaceId();
  const job = await prisma.job.findFirst({
    where: { id, workspaceId },
    include: {
      workers: { select: { id: true, name: true, phone: true } },
      invoice: true,
      events: { orderBy: { createdAt: "asc" } },
      asset: true,
    },
  });
  if (!job) return null;

  // Fetch documents linked to this job
  const documents = await prisma.document.findMany({
    where: { workspaceId, jobId: id },
    orderBy: { generatedAt: "desc" },
  });

  return { ...job, documents };
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const [job, workers] = await Promise.all([
    getJob(params.id),
    getUsers("TECHNICIAN"),
  ]);

  if (!job) notFound();

  return (
    <JobDetailClient
      job={{
        ...job,
        workers: job.workers,
        events: job.events.map(e => ({ ...e, createdAt: e.createdAt })),
        asset: job.asset,
        invoice: job.invoice,
        documents: job.documents,
        allWorkers: workers,
      } as never}
    />
  );
}
