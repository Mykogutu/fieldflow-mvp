"use server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { sendJobAssignment } from "@/lib/twilio";
import { createNotification } from "@/lib/notifications";
import { pickBestWorker } from "@/lib/assignment";
import { normalizePhone, formatDate } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createSchema = z.object({
  clientName: z.string().min(1),
  clientPhone: z.string().min(9),
  jobType: z.string().min(1),
  description: z.string().optional(),
  location: z.string().optional(),
  zone: z.string().optional(),
  scheduledDate: z.string().optional(),
  quotedAmount: z.coerce.number().optional(),
  priority: z.enum(["EMERGENCY", "HIGH", "NORMAL", "LOW"]).default("NORMAL"),
  workerId: z.string().optional(),
  assetId: z.string().optional(),
});

export async function createJob(formData: FormData) {
  await requireAdmin();

  const raw = Object.fromEntries(formData.entries());
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.message };

  const d = parsed.data;
  const clientPhone = normalizePhone(d.clientPhone);
  const workspaceId = await currentWorkspaceId();

  let workerId = d.workerId;
  if (!workerId) {
    workerId =
      (await pickBestWorker({
        jobType: d.jobType,
        zone: d.zone ?? null,
        priority: d.priority,
        scheduledDate: d.scheduledDate ? new Date(d.scheduledDate) : null,
      })) ?? undefined;
  }

  const jobCount = await prisma.job.count({ where: { workspaceId } });
  const year = new Date().getFullYear();
  const jobNumber = `JC-${year}-${String(jobCount + 1).padStart(4, "0")}`;

  const job = await prisma.job.create({
    data: {
      workspaceId,
      jobNumber,
      clientName: d.clientName,
      clientPhone,
      jobType: d.jobType,
      description: d.description,
      location: d.location,
      zone: d.zone,
      scheduledDate: d.scheduledDate ? new Date(d.scheduledDate) : null,
      quotedAmount: d.quotedAmount,
      priority: d.priority,
      status: workerId ? "ASSIGNED" : "ASSIGNED",
      workers: workerId ? { connect: [{ id: workerId }] } : undefined,
      assetId: d.assetId || undefined,
    },
  });

  await prisma.jobEvent.create({
    data: { workspaceId, jobId: job.id, type: "CREATED", note: "Job created by admin" },
  });

  if (workerId) {
    const worker = await prisma.user.findFirst({
      where: { id: workerId, workspaceId },
      select: { phone: true, name: true },
    });
    if (worker) {
      await sendJobAssignment(worker.phone, {
        clientName: d.clientName,
        jobType: d.jobType,
        location: d.location ?? "—",
        scheduledDate: d.scheduledDate ? formatDate(new Date(d.scheduledDate)) : "TBD",
        jobId: job.id,
      });
    }
  }

  await createNotification({
    type: "JOB_CREATED",
    title: "New Job Created",
    message: `Job for ${d.clientName} (${d.jobType}) created.`,
    jobId: job.id,
    link: `/admin/jobs?id=${job.id}`,
  });

  revalidatePath("/admin/jobs");
  return { ok: true, jobId: job.id };
}

export async function getJobs(filter?: {
  status?: string;
  search?: string;
  page?: number;
}) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();

  const page = filter?.page ?? 1;
  const take = 20;
  const skip = (page - 1) * take;

  const where: Record<string, unknown> = { workspaceId };
  if (filter?.status && filter.status !== "ALL") {
    where.status = filter.status;
  }
  if (filter?.search) {
    where.OR = [
      { clientName: { contains: filter.search, mode: "insensitive" } },
      { jobType: { contains: filter.search, mode: "insensitive" } },
      { location: { contains: filter.search, mode: "insensitive" } },
    ];
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      include: {
        workers: { select: { id: true, name: true, phone: true } },
        invoice: { select: { id: true, invoiceNumber: true, status: true, amount: true } },
        asset: { select: { id: true, name: true, assetType: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.job.count({ where }),
  ]);

  return { jobs, total, page, pages: Math.ceil(total / take) };
}

export async function updateJobStatus(jobId: string, status: string, note?: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();

  const result = await prisma.job.updateMany({
    where: { id: jobId, workspaceId },
    data: { status: status as never, lastActionAt: new Date() },
  });
  if (result.count === 0) return { error: "Job not found" };

  await prisma.jobEvent.create({
    data: { workspaceId, jobId, type: "STATUS_CHANGE", note: note ?? `Status → ${status} (admin)` },
  });

  revalidatePath("/admin/jobs");
  return { ok: true };
}

export async function reassignJob(jobId: string, workerId: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();

  const job = await prisma.job.findFirst({ where: { id: jobId, workspaceId } });
  if (!job) return { error: "Job not found" };

  const worker = await prisma.user.findFirst({
    where: { id: workerId, workspaceId },
    select: { phone: true, name: true },
  });
  if (!worker) return { error: "Worker not found" };

  await prisma.job.update({
    where: { id: jobId },
    data: {
      workers: { set: [{ id: workerId }] },
      status: "ASSIGNED",
      isReassigned: true,
      lastActionAt: new Date(),
    },
  });

  await sendJobAssignment(worker.phone, {
    clientName: job.clientName,
    jobType: job.jobType,
    location: job.location ?? "—",
    scheduledDate: formatDate(job.scheduledDate),
    jobId: job.id,
  });

  await prisma.jobEvent.create({
    data: { workspaceId, jobId, type: "REASSIGNED", note: `Reassigned to ${worker.name}` },
  });

  revalidatePath("/admin/jobs");
  return { ok: true };
}

export async function rescheduleJob(jobId: string, newDate: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();

  const result = await prisma.job.updateMany({
    where: { id: jobId, workspaceId },
    data: {
      scheduledDate: new Date(newDate),
      status: "RESCHEDULED",
      lastActionAt: new Date(),
    },
  });
  if (result.count === 0) return { error: "Job not found" };

  await prisma.jobEvent.create({
    data: { workspaceId, jobId, type: "RESCHEDULED", note: `Rescheduled to ${newDate}` },
  });

  revalidatePath("/admin/jobs");
  return { ok: true };
}

export async function deleteJob(jobId: string) {
  await requireAdmin();
  const workspaceId = await currentWorkspaceId();
  const result = await prisma.job.updateMany({
    where: { id: jobId, workspaceId },
    data: { status: "CANCELLED" },
  });
  if (result.count === 0) return { error: "Job not found" };
  revalidatePath("/admin/jobs");
  return { ok: true };
}
