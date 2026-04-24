import { prisma } from "./prisma";
import type { WorkerScore } from "@/types";

interface AssignmentInput {
  jobType: string;
  zone: string | null;
  priority: string;
  scheduledDate: Date | null;
  excludeWorkerIds?: string[];
}

export async function scoreWorkers(input: AssignmentInput): Promise<WorkerScore[]> {
  const workers = await prisma.user.findMany({
    where: {
      role: "TECHNICIAN",
      isActive: true,
      id: input.excludeWorkerIds?.length
        ? { notIn: input.excludeWorkerIds }
        : undefined,
    },
    select: {
      id: true,
      name: true,
      baseZone: true,
      jobs: {
        where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } },
        select: { id: true },
      },
    },
  });

  const scores: WorkerScore[] = workers.map((w) => {
    let score = 0;
    const reasons: string[] = [];

    // Zone match (40 pts)
    if (input.zone && w.baseZone) {
      if (w.baseZone === input.zone) {
        score += 40;
        reasons.push(`Zone match (${w.baseZone})`);
      } else if (sameRegion(w.baseZone, input.zone)) {
        score += 20;
        reasons.push(`Same region (${w.baseZone})`);
      }
    }

    // Emergency override — availability is king
    const isEmergency = input.priority === "EMERGENCY";

    // Load balance (30 pts)
    const activeJobs = w.jobs.length;
    const loadScore = isEmergency
      ? Math.max(0, 50 - activeJobs * 15)
      : Math.max(0, 30 - activeJobs * 10);
    score += loadScore;
    if (activeJobs === 0) reasons.push("No active jobs");
    else reasons.push(`${activeJobs} active job(s)`);

    // Fairness placeholder — could integrate historical totals (30 pts max)
    score += 10;

    return { workerId: w.id, workerName: w.name, score, reasons };
  });

  return scores.sort((a, b) => b.score - a.score);
}

export async function pickBestWorker(
  input: AssignmentInput
): Promise<string | null> {
  const ranked = await scoreWorkers(input);
  return ranked[0]?.workerId ?? null;
}

function sameRegion(zone1: string, zone2: string): boolean {
  const nairobiZones = [
    "Nairobi West",
    "Nairobi East",
    "Nairobi North",
    "Nairobi CBD",
    "Westlands",
    "Karen",
    "Eastleigh",
    "Kasarani",
  ];
  return nairobiZones.includes(zone1) && nairobiZones.includes(zone2);
}
