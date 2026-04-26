import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/twilio";
import { formatDate } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const workspaceId = await currentWorkspaceId();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const workers = await prisma.user.findMany({
    where: { workspaceId, role: "TECHNICIAN", isActive: true },
    select: { id: true, name: true, phone: true },
  });

  let sent = 0;

  for (const worker of workers) {
    const jobs = await prisma.job.findMany({
      where: {
        workspaceId,
        workers: { some: { id: worker.id } },
        status: { in: ["ASSIGNED", "IN_PROGRESS"] },
        scheduledDate: { gte: today, lt: tomorrow },
      },
      orderBy: { scheduledDate: "asc" },
    });

    if (!jobs.length) continue;

    const firstName = worker.name.split(" ")[0];
    const jobLines = jobs.map(
      (j, i) =>
        `${i + 1}. ${j.jobType} — ${j.clientName}\n   📍 ${j.location ?? "—"}\n   ⏰ ${formatDate(j.scheduledDate)}`
    );

    const message =
      `☀️ Good morning, ${firstName}!\n\n` +
      `📋 Today's Jobs (${jobs.length}):\n\n` +
      jobLines.join("\n\n") +
      `\n\nReply "Accept" to confirm all, or "Accept 1" for specific jobs.`;

    await sendWhatsApp(worker.phone, message);
    sent++;
  }

  return NextResponse.json({ ok: true, sent });
}
