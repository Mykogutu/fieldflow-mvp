import { getJobs, createJob, reassignJob, rescheduleJob, updateJobStatus } from "@/app/actions/job-actions";
import { getUsers } from "@/app/actions/user-actions";
import { prisma } from "@/lib/prisma";
import { statusColor, statusLabel, formatDate, formatKES } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";
import JobsClient from "./JobsClient";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: { status?: string; search?: string; page?: string };
}) {
  const workspaceId = await currentWorkspaceId();
  const [{ jobs, total, pages }, workers, jobTypes, zones, assets] = await Promise.all([
    getJobs({
      status: searchParams.status,
      search: searchParams.search,
      page: searchParams.page ? parseInt(searchParams.page) : 1,
    }),
    getUsers("TECHNICIAN"),
    prisma.setting.findFirst({ where: { workspaceId, key: "job_types" } }),
    prisma.setting.findFirst({ where: { workspaceId, key: "zones" } }),
    prisma.asset.findMany({
      where: { workspaceId },
      select: { id: true, name: true, assetType: true, clientName: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const jobTypesList: string[] = jobTypes?.value ? JSON.parse(jobTypes.value) : [];
  const zonesList: string[] = zones?.value ? JSON.parse(zones.value) : [];

  return (
    <JobsClient
      jobs={jobs as never}
      total={total}
      pages={pages}
      workers={workers}
      jobTypes={jobTypesList}
      zones={zonesList}
      assets={assets}
      currentStatus={searchParams.status}
      currentSearch={searchParams.search}
    />
  );
}
