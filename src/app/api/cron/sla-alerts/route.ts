import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { currentWorkspaceId } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const workspaceId = await currentWorkspaceId();
  const settings = await prisma.setting.findMany({
    where: { workspaceId, key: { in: ["sla_alerts", "sla_hours"] } },
    select: { key: true, value: true },
  });
  const settingMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

  if (settingMap.sla_alerts === "false") {
    return NextResponse.json({ ok: true, alerts: 0, skipped: "SLA alerts are disabled" });
  }

  const slaHours = Math.max(1, Number.parseInt(settingMap.sla_hours ?? "8", 10) || 8);
  const cutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000);

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
      title: "SLA Alert",
      message: `Job for ${job.clientName} (${job.jobType}) has been ${job.status} for over ${slaHours}h.`,
      jobId: job.id,
      link: `/admin/jobs?id=${job.id}`,
    });
  }

  return NextResponse.json({ ok: true, alerts: staleJobs.length, thresholdHours: slaHours });
}
