import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/utils";
import type { JobStatus } from "@prisma/client";

export interface JobRisk {
  jobId: string;
  jobNumber: string;
  clientName: string;
  jobType: string;
  severity: "HIGH" | "MEDIUM" | "LOW";
  type:
    | "OVERDUE"
    | "UNASSIGNED"
    | "MISSING_LOCATION"
    | "NO_AMOUNT"
    | "UNPAID_INVOICE"
    | "VERIFICATION_STALLED";
  description: string;
  action: string;
}

const ACTIVE_STATUSES: JobStatus[] = [
  "ASSIGNED",
  "IN_PROGRESS",
  "POSTPONED",
  "RESCHEDULED",
  "COMPLETED_PENDING_VERIFICATION",
];

export async function detectJobRisks(workspaceId: string): Promise<JobRisk[]> {
  const now = new Date();

  const [rawJobs, unpaidPhones] = await Promise.all([
    prisma.job.findMany({
      where: { workspaceId, status: { in: ACTIVE_STATUSES } },
      include: { workers: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invoice
      .findMany({
        where: { workspaceId, status: "PENDING" },
        select: { clientPhone: true },
      })
      .then((rows) => new Set(rows.map((r) => r.clientPhone).filter(Boolean))),
  ]);

  const jobs = rawJobs as typeof rawJobs;
  const risks: JobRisk[] = [];

  for (const job of jobs) {
    // Overdue: past scheduled date and still active
    if (
      job.scheduledDate &&
      new Date(job.scheduledDate) < now &&
      ["ASSIGNED", "IN_PROGRESS"].includes(job.status)
    ) {
      risks.push({
        jobId: job.id,
        jobNumber: job.jobNumber,
        clientName: job.clientName,
        jobType: job.jobType,
        severity: "HIGH",
        type: "OVERDUE",
        description: `Scheduled for ${formatDate(job.scheduledDate)} — still open`,
        action: "Contact the worker, reschedule or close this job",
      });
    }

    // No worker
    if (job.workers.length === 0) {
      risks.push({
        jobId: job.id,
        jobNumber: job.jobNumber,
        clientName: job.clientName,
        jobType: job.jobType,
        severity: "HIGH",
        type: "UNASSIGNED",
        description: "No worker has been assigned",
        action: "Assign a worker before the scheduled date",
      });
    }

    // Missing location
    if (!job.location) {
      risks.push({
        jobId: job.id,
        jobNumber: job.jobNumber,
        clientName: job.clientName,
        jobType: job.jobType,
        severity: "MEDIUM",
        type: "MISSING_LOCATION",
        description: "No location or address recorded",
        action: "Confirm location with the client before dispatching",
      });
    }

    // No agreed amount
    if (!job.quotedAmount && !job.finalAmount) {
      risks.push({
        jobId: job.id,
        jobNumber: job.jobNumber,
        clientName: job.clientName,
        jobType: job.jobType,
        severity: "LOW",
        type: "NO_AMOUNT",
        description: "No quoted or agreed amount",
        action: "Agree on pricing before work starts to avoid disputes",
      });
    }

    // Client has unpaid invoice
    if (unpaidPhones.has(job.clientPhone)) {
      risks.push({
        jobId: job.id,
        jobNumber: job.jobNumber,
        clientName: job.clientName,
        jobType: job.jobType,
        severity: "MEDIUM",
        type: "UNPAID_INVOICE",
        description: "Client has an outstanding unpaid invoice",
        action: "Follow up on previous payment during or before this visit",
      });
    }

    // Verification stalled > 24 h
    if (job.status === "COMPLETED_PENDING_VERIFICATION") {
      const hoursWaiting =
        (now.getTime() - new Date(job.updatedAt).getTime()) / (1000 * 60 * 60);
      if (hoursWaiting > 24) {
        risks.push({
          jobId: job.id,
          jobNumber: job.jobNumber,
          clientName: job.clientName,
          jobType: job.jobType,
          severity: "HIGH",
          type: "VERIFICATION_STALLED",
          description: `Awaiting client verification for ${Math.round(hoursWaiting)} hours`,
          action: "Contact client to share the service code and confirm payment",
        });
      }
    }
  }

  const order: Record<JobRisk["severity"], number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return risks.sort((a, b) => order[a.severity] - order[b.severity]);
}
