import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIntent } from "@/lib/ai-agent";
import { pickBestWorker } from "@/lib/assignment";
import {
  sendWorkerReply,
  sendJobAssignment,
  sendOTPToClient,
  sendPostponeNotice,
} from "@/lib/twilio";
import { createNotification, deliverJobVerifiedDocs, getCompanyName } from "@/lib/notifications";
import { getWorkspaceConfig } from "@/lib/workspace-config";
import { generateInvoicePDF, generateJobCardPDF } from "@/lib/pdf-generator";
import { normalizePhone, generateOTP, otpExpiresAt, generateInvoiceNumber, generateJobCardNumber, formatKES, formatDate, isWithin15Min } from "@/lib/utils";
import { put } from "@vercel/blob";

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const rawFrom = form.get("From")?.toString() ?? "";
    const body = form.get("Body")?.toString()?.trim() ?? "";

    const workerPhone = normalizePhone(rawFrom.replace("whatsapp:", ""));

    const worker = await prisma.user.findUnique({
      where: { phone: workerPhone },
      select: { id: true, name: true, phone: true, role: true, isActive: true },
    });

    if (!worker || !worker.isActive) {
      return twilioReply("You are not registered in the FieldFlow system.");
    }

    const workspace = await getWorkspaceConfig();
    const companyName = workspace.companyName || (await getCompanyName());
    const parsed = await parseIntent(body, workspace);

    switch (parsed.intent) {
      case "ACCEPT_JOB":
        return await handleAccept(worker, parsed.data.selectionIndex, companyName);

      case "DECLINE_JOB":
        return await handleDecline(worker, companyName);

      case "CHECK_IN":
        return await handleCheckIn(worker);

      case "REPORT_COMPLETION":
        return await handleCompletion(worker, parsed.data.amount, parsed.data.clientName, companyName);

      case "SUBMIT_OTP":
        return await handleOTP(worker, parsed.data.otpCode!, companyName);

      case "POSTPONE_JOB":
        return await handlePostpone(worker, parsed.data.postponeReason, companyName);

      case "UNDO":
        return await handleUndo(worker);

      case "CHECK_SCHEDULE":
        return await handleSchedule(worker);

      case "CHECK_EARNINGS":
        return await handleEarnings(worker);

      case "REPORT_ISSUE":
        return await handleIssue(worker, parsed.data.rawText ?? body, companyName);

      default:
        return twilioReply(
          "I didn't understand that. Try: ACCEPT, DECLINE, DONE [amount], POSTPONE, or your 6-digit code."
        );
    }
  } catch (err) {
    console.error("[Webhook] Unhandled error:", err);
    return new NextResponse("OK", { status: 200 });
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// INTENT HANDLERS
// ──────────────────────────────────────────────────────────────────────────────

async function handleAccept(
  worker: { id: string; name: string; phone: string },
  idx: number | undefined,
  companyName: string
) {
  const jobs = await prisma.job.findMany({
    where: {
      workers: { some: { id: worker.id } },
      status: "ASSIGNED",
    },
    orderBy: { scheduledDate: "asc" },
  });

  if (!jobs.length) return twilioReply("You have no pending jobs to accept.");

  const job = idx !== undefined ? jobs[idx] : jobs[0];
  if (!job) return twilioReply(`No job at position ${(idx ?? 0) + 1}.`);

  await prisma.job.update({
    where: { id: job.id },
    data: { status: "IN_PROGRESS", lastActionAt: new Date() },
  });

  await prisma.jobEvent.create({
    data: { jobId: job.id, type: "ACCEPTED", note: `Accepted by ${worker.name}` },
  });

  await createNotification({
    type: "JOB_ACCEPTED",
    title: "Job Accepted",
    message: `${worker.name} accepted job for ${job.clientName}`,
    jobId: job.id,
    link: `/admin/jobs?id=${job.id}`,
  });

  return twilioReply(
    `✅ Job accepted!\n\nClient: ${job.clientName}\nLocation: ${job.location ?? "—"}\nScheduled: ${formatDate(job.scheduledDate)}\n\nText "Done [amount]" when you complete the job.`
  );
}

async function handleDecline(
  worker: { id: string; name: string; phone: string },
  companyName: string
) {
  const jobs = await prisma.job.findMany({
    where: { workers: { some: { id: worker.id } }, status: "ASSIGNED" },
    orderBy: { createdAt: "asc" },
  });

  if (!jobs.length) return twilioReply("No pending jobs to decline.");

  const job = jobs[0];

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "DECLINED",
      isReassigned: true,
      lastActionAt: new Date(),
    },
  });

  await prisma.jobEvent.create({
    data: { jobId: job.id, type: "DECLINED", note: `Declined by ${worker.name}` },
  });

  // Auto-reassign
  const nextWorkerId = await pickBestWorker({
    jobType: job.jobType,
    zone: job.zone,
    priority: job.priority,
    scheduledDate: job.scheduledDate,
    excludeWorkerIds: [worker.id],
  });

  if (nextWorkerId) {
    const nextWorker = await prisma.user.findUnique({
      where: { id: nextWorkerId },
      select: { name: true, phone: true },
    });

    await prisma.job.update({
      where: { id: job.id },
      data: {
        status: "ASSIGNED",
        workers: { set: [{ id: nextWorkerId }] },
        lastActionAt: new Date(),
      },
    });

    if (nextWorker) {
      await sendJobAssignment(nextWorker.phone, {
        clientName: job.clientName,
        jobType: job.jobType,
        location: job.location ?? "—",
        scheduledDate: formatDate(job.scheduledDate),
        jobId: job.id,
      });
    }
  }

  await createNotification({
    type: "JOB_DECLINED",
    title: "Job Declined",
    message: `${worker.name} declined job for ${job.clientName}. ${nextWorkerId ? "Reassigned." : "Needs manual reassignment."}`,
    jobId: job.id,
    link: `/admin/jobs?id=${job.id}`,
  });

  return twilioReply("Noted. Job has been reassigned.");
}

async function handleCheckIn(worker: { id: string; name: string; phone: string }) {
  const job = await prisma.job.findFirst({
    where: { workers: { some: { id: worker.id } }, status: "IN_PROGRESS" },
    orderBy: { scheduledDate: "asc" },
  });

  if (!job) return twilioReply("No active job to check in for.");

  await prisma.jobEvent.create({
    data: { jobId: job.id, type: "ARRIVED", note: `${worker.name} arrived on site` },
  });

  return twilioReply(`✅ Checked in for ${job.clientName}. Timer started.\n\nText "Done [amount]" when complete.`);
}

async function handleCompletion(
  worker: { id: string; name: string; phone: string },
  amount: number | undefined,
  clientHint: string | undefined,
  companyName: string
) {
  const activeJobs = await prisma.job.findMany({
    where: {
      workers: { some: { id: worker.id } },
      status: { in: ["IN_PROGRESS", "ASSIGNED"] },
    },
    orderBy: { scheduledDate: "asc" },
  });

  if (!activeJobs.length) return twilioReply("You have no active jobs.");

  let job = activeJobs[0];

  if (activeJobs.length > 1 && clientHint) {
    const hint = clientHint.toLowerCase();
    const match = activeJobs.find((j) => j.clientName.toLowerCase().includes(hint));
    if (match) job = match;
  }

  if (!amount || amount <= 0) {
    return twilioReply(
      `Please include the amount. Example:\nDone ${job.clientName.split(" ")[1] ?? ""} 5000`
    );
  }

  const otp = generateOTP();
  const expires = otpExpiresAt();

  // Count invoices to generate invoice number
  const invoiceCount = await prisma.invoice.count();
  const invoiceNumber = generateInvoiceNumber(invoiceCount + 1);

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "COMPLETED_PENDING_VERIFICATION",
      finalAmount: amount,
      otpCode: otp,
      otpExpiresAt: expires,
      completedAt: new Date(),
      lastActionAt: new Date(),
    },
  });

  await prisma.invoice.create({
    data: {
      invoiceNumber,
      jobId: job.id,
      amount,
      status: "PENDING",
      clientName: job.clientName,
      clientPhone: job.clientPhone,
      workerName: worker.name,
      items: [{ description: job.jobType, amount }],
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job.id,
      type: "COMPLETED",
      note: `${worker.name} marked done. Amount: ${formatKES(amount)}`,
    },
  });

  await sendOTPToClient(job.clientPhone, {
    workerName: worker.name,
    amount,
    otpCode: otp,
    companyName,
  });

  await createNotification({
    type: "JOB_COMPLETED",
    title: "Job Awaiting Verification",
    message: `${worker.name} completed job for ${job.clientName}. Amount: ${formatKES(amount)}`,
    jobId: job.id,
    link: `/admin/jobs?id=${job.id}`,
  });

  return twilioReply(
    `✅ Job marked complete!\n\nAmount: ${formatKES(amount)}\n\nOTP sent to ${job.clientName}. Once they pay and share the 6-digit code, text it to verify.`
  );
}

async function handleOTP(
  worker: { id: string; name: string; phone: string },
  otp: string,
  companyName: string
) {
  const job = await prisma.job.findFirst({
    where: {
      workers: { some: { id: worker.id } },
      status: "COMPLETED_PENDING_VERIFICATION",
      otpCode: otp,
    },
    include: { invoice: true },
  });

  if (!job) {
    return twilioReply("That code doesn't match any of your pending jobs. Please check with the client.");
  }

  if (job.otpExpiresAt && new Date() > job.otpExpiresAt) {
    return twilioReply("That code has expired. Contact admin to generate a new one.");
  }

  const now = new Date();

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "VERIFIED",
      verifiedAt: now,
      lastActionAt: now,
    },
  });

  if (job.invoice) {
    await prisma.invoice.update({
      where: { id: job.invoice.id },
      data: { status: "PAID", paidAt: now },
    });
  }

  await prisma.jobEvent.create({
    data: {
      jobId: job.id,
      type: "VERIFIED",
      note: `OTP ${otp} verified by ${worker.name}`,
    },
  });

  await createNotification({
    type: "JOB_VERIFIED",
    title: "Job Verified ✅",
    message: `Job for ${job.clientName} verified. Invoice PAID. Amount: ${formatKES(job.finalAmount ?? 0)}`,
    jobId: job.id,
    link: `/admin/jobs?id=${job.id}`,
  });

  // Generate and send PDFs
  try {
    const setting = await prisma.setting.findUnique({ where: { key: "company_phone" } });
    const companyPhone = setting?.value ?? "";

    const invoiceCount = await prisma.invoice.count();
    const jobCount = await prisma.job.count({ where: { status: { in: ["VERIFIED", "CLOSED"] } } });

    const invoicePdfBytes = generateInvoicePDF({
      invoiceNumber: job.invoice?.invoiceNumber ?? "INV-0000",
      jobNumber: job.jobNumber,
      clientName: job.clientName,
      clientPhone: job.clientPhone,
      workerName: worker.name,
      jobType: job.jobType,
      description: job.description ?? undefined,
      location: job.location ?? undefined,
      amount: job.finalAmount ?? 0,
      items: job.invoice?.items as { description: string; amount: number }[] | undefined,
      createdAt: now,
      companyName,
      companyPhone,
    });

    const jobCardPdfBytes = generateJobCardPDF({
      jobNumber: job.jobNumber,
      clientName: job.clientName,
      clientPhone: job.clientPhone,
      workerName: worker.name,
      jobType: job.jobType,
      description: job.description ?? undefined,
      location: job.location ?? undefined,
      priority: job.priority,
      scheduledDate: job.scheduledDate,
      completedAt: job.completedAt,
      verifiedAt: now,
      finalAmount: job.finalAmount,
      invoiceNumber: job.invoice?.invoiceNumber,
      otpCode: otp,
      companyName,
      companyPhone,
    });

    // Upload to Vercel Blob if token is available
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const invBlob = await put(
        `invoices/${job.invoice?.invoiceNumber ?? job.id}.pdf`,
        Buffer.from(invoicePdfBytes),
        { access: "public", contentType: "application/pdf" }
      );
      await prisma.invoice.update({
        where: { id: job.invoice!.id },
        data: { pdfUrl: invBlob.url },
      });
    }

    await deliverJobVerifiedDocs(job.id, companyName);
  } catch (err) {
    console.error("[Webhook] PDF generation error:", err);
  }

  return twilioReply(`🎉 Job VERIFIED!\n\nClient: ${job.clientName}\nAmount: ${formatKES(job.finalAmount ?? 0)}\nInvoice: PAID\n\nDocuments sent to client. Well done!`);
}

async function handlePostpone(
  worker: { id: string; name: string; phone: string },
  reason: string | undefined,
  companyName: string
) {
  const job = await prisma.job.findFirst({
    where: {
      workers: { some: { id: worker.id } },
      status: { in: ["ASSIGNED", "IN_PROGRESS"] },
    },
    orderBy: { scheduledDate: "asc" },
  });

  if (!job) return twilioReply("No active job to postpone.");

  if (!reason) {
    return twilioReply(`What's the reason for postponing the job for ${job.clientName}?`);
  }

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "POSTPONED",
      postponeReason: reason,
      postponedAt: new Date(),
      lastActionAt: new Date(),
    },
  });

  await prisma.jobEvent.create({
    data: {
      jobId: job.id,
      type: "POSTPONED",
      note: `Postponed by ${worker.name}: ${reason}`,
    },
  });

  await sendPostponeNotice(job.clientPhone, { reason, companyName });

  await createNotification({
    type: "JOB_POSTPONED",
    title: "Job Postponed",
    message: `${worker.name} postponed job for ${job.clientName}. Reason: ${reason}`,
    jobId: job.id,
    link: `/admin/jobs?id=${job.id}`,
  });

  return twilioReply(
    `✅ Job postponed.\n\nReason logged: "${reason}"\nClient and admin have been notified.\n\nAdmin will reschedule and notify you.`
  );
}

async function handleUndo(worker: { id: string; name: string; phone: string }) {
  const job = await prisma.job.findFirst({
    where: {
      workers: { some: { id: worker.id } },
      status: "COMPLETED_PENDING_VERIFICATION",
    },
    orderBy: { completedAt: "desc" },
  });

  if (!job) return twilioReply("Nothing to undo.");

  if (!isWithin15Min(job.lastActionAt)) {
    return twilioReply("The 15-minute undo window has passed. Contact admin.");
  }

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: "IN_PROGRESS",
      otpCode: null,
      otpExpiresAt: null,
      completedAt: null,
      lastActionAt: new Date(),
    },
  });

  await prisma.invoice.delete({ where: { jobId: job.id } }).catch(() => {});

  await prisma.jobEvent.create({
    data: { jobId: job.id, type: "UNDO", note: `Undo by ${worker.name}` },
  });

  return twilioReply(`↩️ Undone. Job for ${job.clientName} is back to In Progress.`);
}

async function handleSchedule(worker: { id: string; name: string; phone: string }) {
  const jobs = await prisma.job.findMany({
    where: {
      workers: { some: { id: worker.id } },
      status: { in: ["ASSIGNED", "IN_PROGRESS"] },
    },
    orderBy: { scheduledDate: "asc" },
    take: 5,
  });

  if (!jobs.length) return twilioReply("No jobs scheduled for today. Enjoy the day! ☀️");

  const lines = jobs.map(
    (j, i) =>
      `${i + 1}. ${j.jobType} — ${j.clientName}\n   📍 ${j.location ?? "—"}\n   ⏰ ${formatDate(j.scheduledDate)}`
  );

  return twilioReply(`📋 Your Jobs (${jobs.length}):\n\n${lines.join("\n\n")}`);
}

async function handleEarnings(worker: { id: string; name: string; phone: string }) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const weekJobs = await prisma.job.findMany({
    where: {
      workers: { some: { id: worker.id } },
      status: "VERIFIED",
      verifiedAt: { gte: startOfWeek },
    },
    select: { finalAmount: true },
  });

  const monthJobs = await prisma.job.findMany({
    where: {
      workers: { some: { id: worker.id } },
      status: "VERIFIED",
      verifiedAt: { gte: startOfMonth },
    },
    select: { finalAmount: true },
  });

  const weekTotal = weekJobs.reduce((sum, j) => sum + (j.finalAmount ?? 0), 0);
  const monthTotal = monthJobs.reduce((sum, j) => sum + (j.finalAmount ?? 0), 0);

  return twilioReply(
    `💰 Your Earnings\n\nThis week: ${formatKES(weekTotal)} (${weekJobs.length} jobs)\nThis month: ${formatKES(monthTotal)} (${monthJobs.length} jobs)`
  );
}

async function handleIssue(
  worker: { id: string; name: string; phone: string },
  message: string,
  companyName: string
) {
  const job = await prisma.job.findFirst({
    where: {
      workers: { some: { id: worker.id } },
      status: { in: ["IN_PROGRESS", "ASSIGNED"] },
    },
  });

  await createNotification({
    type: "ISSUE_REPORTED",
    title: "⚠️ Issue Reported",
    message: `${worker.name}: ${message}${job ? ` (Job: ${job.clientName})` : ""}`,
    jobId: job?.id,
    link: job ? `/admin/jobs?id=${job.id}` : undefined,
  });

  if (job) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "ISSUE_REPORTED", lastActionAt: new Date() },
    });

    await prisma.jobEvent.create({
      data: { jobId: job.id, type: "ISSUE_REPORTED", note: message },
    });
  }

  return twilioReply("⚠️ Issue reported. Admin has been alerted and will contact you shortly.");
}

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

function twilioReply(message: string) {
  const xml = `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
