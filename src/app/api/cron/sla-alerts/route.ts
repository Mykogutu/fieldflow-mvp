import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { currentWorkspaceId } from "@/lib/workspace";

const SLA_HOURS = 8;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const workspaceId = await currentWorkspaceId();
  const cutoff = new Date(Date.now() - SLA_HOURS * 60 * 60 * 1000);

  const staleJobs = await prisma.job.findMany({
    where: {
      workspaceId,
      status: { in: ["ASSIGNED", "IN_PROGRESS"] },
      updatedAt: { lt: cutoff },
    },
    select: { id: true, clientName: true, jobType: true, status: true },
  });

  for (const job of staleJobs) {
    await createNotification({
      type: "SLA_ALERT",
      title: "⏰ SLA Alert",
      message: `Job for ${job.clientName} (${job.jobType}) has been ${job.status} for over ${SLA_HOURS}h.`,
      jobId: job.id,
      link: `/admin/jobs?id=${job.id}`,
    });
  }

  return NextResponse.json({ ok: true, alerts: staleJobs.length });
}
