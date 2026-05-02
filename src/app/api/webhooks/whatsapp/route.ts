import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseIntent } from "@/lib/ai-agent";
import { pickBestWorker } from "@/lib/assignment";
import {
  sendArrivalConfirmationRequest,
  sendJobReassignment,
  sendJobVerifiedToWorker,
  sendOTPToClient,
  sendPostponeNotice,
  sendWorkerReply,
} from "@/lib/twilio";
import { createNotification, deliverJobVerifiedDocs, getCompanyName } from "@/lib/notifications";
import { getWorkspaceConfig } from "@/lib/workspace-config";
import { currentWorkspaceId } from "@/lib/workspace";
import { resolveSenderByNumber, type WhatsAppSender } from "@/lib/senders";
import { generateInvoicePDF, generateJobCardPDF } from "@/lib/pdf-generator";
import { normalizePhone, generateOTP, otpExpiresAt, generateInvoiceNumber, generateJobCardNumber, formatKES, formatDate, isWithin15Min } from "@/lib/utils";
import { put } from "@vercel/blob";

type WorkerRef = { id: string; name: string; phone: string };
type PendingCompletionConfirmation = {
  amount: number;
  requestedAt: string;
};
type ArrivalConfirmationState = {
  requestedAt: string;
  status: "PENDING" | "CONFIRMED" | "DISPUTED";
  workerName: string;
  respondedAt?: string;
  comment?: string;
};
type JobMetaState = {
  pendingCompletionConfirmation?: PendingCompletionConfirmation;
  arrivalConfirmation?: ArrivalConfirmationState;
};

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const rawFrom = form.get("From")?.toString() ?? "";
    const rawTo = form.get("To")?.toString() ?? "";
    const body = form.get("Body")?.toString()?.trim() ?? "";

    const workerPhone = normalizePhone(rawFrom.replace("whatsapp:", ""));

    // MVP-STRATEGY §17 — resolve which sender (and therefore which workspace)
    // received this message. Reply credentials and outbound API calls are all
    // scoped to this sender, so cross-tenant leakage is impossible.
    const inboundNumber = normalizePhone(rawTo.replace("whatsapp:", ""));
    const sender = await resolveSenderByNumber(inboundNumber);

    // Resolve workspace from the sender (preferred) or fall back to the
    // process default. In single-tenant Restore, both resolve to the same id.
    const workspaceId = sender?.workspaceId ?? (await currentWorkspaceId());

    const worker = await prisma.user.findFirst({
      where: { phone: workerPhone, workspaceId },
      select: { id: true, name: true, phone: true, role: true, isActive: true },
    });

    const workspace = await getWorkspaceConfig();
    const companyName = workspace.companyName || (await getCompanyName());

    if (!worker || !worker.isActive) {
      return await handleClientMessage(workerPhone, body, companyName, workspaceId, sender);
    }

    const pendingCompletionReply = await handlePendingCompletionConfirmation(
      worker,
      body,
      companyName,
      workspaceId,
      sender
    );
    if (pendingCompletionReply) return pendingCompletionReply;

    const parsed = await parseIntent(body, workspace);

    switch (parsed.intent) {
      case "ACCEPT_JOB":
        return await handleAccept(worker, parsed.data.selectionIndex, companyName, workspaceId);

      case "DECLINE_JOB":
        return await handleDecline(worker, companyName, workspaceId, sender);

      case "CHECK_IN":
        return await handleCheckIn(worker, workspaceId);

      case "REPORT_COMPLETION":
        return await handleCompletion(worker, parsed.data.amount, parsed.data.clientName, companyName, workspaceId, sender);

      case "SUBMIT_OTP":
        return await handleOTP(worker, parsed.data.otpCode!, companyName, workspaceId, sender);

      case "POSTPONE_JOB":
        return await handlePostpone(worker, parsed.data.postponeReason, companyName, workspaceId, sender);

      case "UNDO":
        return await handleUndo(worker, workspaceId);

      case "CHECK_SCHEDULE":
        return await handleSchedule(worker, workspaceId);

      case "CHECK_EARNINGS":
        return await handleEarnings(worker, workspaceId);

      case "REPORT_ISSUE":
        return await handleIssue(worker, parsed.data.rawText ?? body, companyName, workspaceId);

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
  companyName: string,
  workspaceId: string
) {
  const jobs = await prisma.job.findMany({
    where: {
      workspaceId,
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
    data: { workspaceId, jobId: job.id, type: "ACCEPTED", note: `Accepted by ${worker.name}` },
  });

  await createNotification({
    type: "JOB_ACCEPTED",
    title: "Job Accepted",
    message: `${worker.name} accepted job for ${job.clientName}`,
    jobId: job.id,
    link: `/admin/jobs?id=${job.id}`,
  });

  return twilioReply(
    `✅ Job accepted!\n\nClient: ${job.clientName}\nLocation: ${job.location ?? "—"}\nScheduled: ${formatDate(job.scheduledDate)}\n\nPlease proceed to the location.\nWhen you arrive on site, text "ARRIVED".\nWhen the job is complete, text "Done [amount]".`
  );
}

async function handleDecline(
  worker: { id: string; name: string; phone: string },
  companyName: string,
  workspaceId: string,
  sender?: WhatsAppSender | null
) {
  const jobs = await prisma.job.findMany({
    where: { workspaceId, workers: { some: { id: worker.id } }, status: "ASSIGNED" },
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
    data: { workspaceId, jobId: job.id, type: "DECLINED", note: `Declined by ${worker.name}` },
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
    const nextWorker = await prisma.user.findFirst({
      where: { id: nextWorkerId, workspaceId },
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
      await sendJobReassignment(
        nextWorker.phone,
        {
          workerName: nextWorker.name,
          clientName: job.clientName,
          jobType: job.jobType,
          location: job.location ?? "—",
          scheduledDate: formatDate(job.scheduledDate),
          jobId: job.id,
        },
        sender
      );
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

async function handleCheckIn(
  worker: { id: string; name: string; phone: string },
  workspaceId: string,
  sender?: WhatsAppSender | null,
  companyName?: string
) {
  const job = await prisma.job.findFirst({
    where: { workspaceId, workers: { some: { id: worker.id } }, status: "IN_PROGRESS" },
    orderBy: { scheduledDate: "asc" },
  });

  if (!job) return twilioReply("No active job to check in for.");

  const metadata = mergeJobMetadata(job.metadata, {
    arrivalConfirmation: {
      requestedAt: new Date().toISOString(),
      status: "PENDING",
      workerName: worker.name,
    },
  });

  await prisma.job.update({
    where: { id: job.id },
    data: { metadata, lastActionAt: new Date() },
  });

  await prisma.jobEvent.create({
    data: { workspaceId, jobId: job.id, type: "ARRIVED", note: `${worker.name} arrived on site` },
  });

  await createNotification({
    type: "ARRIVAL_VERIFICATION_REQUESTED",
    title: "Arrival verification requested",
    message: `${worker.name} checked in for ${job.clientName}. Client asked to confirm arrival.`,
    jobId: job.id,
    link: `/admin/jobs?id=${job.id}`,
  });

  await sendArrivalConfirmationRequest(
    job.clientPhone,
    {
      clientName: job.clientName,
      workerName: worker.name,
      companyName: companyName ?? "FieldFlow Services",
      location: job.location ?? job.zone ?? undefined,
      jobId: job.id,
    },
    sender
  );

  return twilioReply(
    `✅ Arrival logged for ${job.clientName}.\n\nThe client has been asked to confirm with YES or NO.\n\nText "Done [amount]" when the job is complete.`
  );
}

async function handleCompletion(
  worker: { id: string; name: string; phone: string },
  amount: number | undefined,
  clientHint: string | undefined,
  companyName: string,
  workspaceId: string,
  sender?: WhatsAppSender | null
) {
  const activeJobs = await prisma.job.findMany({
    where: {
      workspaceId,
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

  const metadata = mergeJobMetadata(job.metadata, {
    pendingCompletionConfirmation: {
      amount,
      requestedAt: new Date().toISOString(),
    },
  });

  await prisma.job.update({
    where: { id: job.id },
    data: { metadata, lastActionAt: new Date() },
  });

  const expectedLocation = job.location ?? job.zone ?? "";
  return twilioReply(
    `Before I mark this complete, reply with the client name and location for this job.\n\nExpected client: ${job.clientName}\nExpected location: ${expectedLocation || "Use the client name only if no location is listed."}`
  );
}

async function finalizeCompletion(
  job: {
    id: string;
    jobNumber: string;
    clientName: string;
    clientPhone: string;
    jobType: string;
    description: string | null;
    location: string | null;
    priority: string;
    scheduledDate: Date | null;
    invoice: { id: string; invoiceNumber: string; items: unknown; amount: number } | null;
    metadata: unknown;
  },
  worker: WorkerRef,
  amount: number,
  companyName: string,
  workspaceId: string,
  sender?: WhatsAppSender | null
) {
  const clientProfile = await prisma.client.findFirst({
    where: { workspaceId, phone: job.clientPhone },
    select: { billingMode: true },
  });
  const billingMode = clientProfile?.billingMode ?? "PAY_ON_COMPLETION";
  const otp = generateOTP();
  const expires = otpExpiresAt();

  const invoiceCount = await prisma.invoice.count({ where: { workspaceId } });
  const invoiceNumber = generateInvoiceNumber(invoiceCount + 1);
  const metadata = clearPendingCompletion(job.metadata);

  const completionTime = new Date();
  const requiresImmediatePayment = billingMode === "PAY_ON_COMPLETION";

  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: requiresImmediatePayment ? "COMPLETED_PENDING_VERIFICATION" : "VERIFIED",
      finalAmount: amount,
      otpCode: requiresImmediatePayment ? otp : null,
      otpExpiresAt: requiresImmediatePayment ? expires : null,
      completedAt: completionTime,
      verifiedAt: requiresImmediatePayment ? null : completionTime,
      lastActionAt: completionTime,
      metadata,
    },
  });

  const invoice = await prisma.invoice.create({
    data: {
      workspaceId,
      invoiceNumber,
      jobId: job.id,
      amount,
      status: "PENDING",
      clientName: job.clientName,
      clientPhone: job.clientPhone,
      workerName: worker.name,
      paymentNotes:
        billingMode === "MONTHLY_BILLING"
          ? "Monthly billing client"
          : billingMode === "MANUAL_FOLLOW_UP"
          ? "Manual payment follow-up required"
          : null,
      items: [{ description: job.jobType, amount }],
    },
  });

  await prisma.jobEvent.create({
    data: {
      workspaceId,
      jobId: job.id,
      type: requiresImmediatePayment ? "COMPLETED" : "VERIFIED_BILL_LATER",
      note: requiresImmediatePayment
        ? `${worker.name} marked done. Amount: ${formatKES(amount)}`
        : `${worker.name} marked done. Amount: ${formatKES(amount)}. Billing mode: ${billingMode}`,
    },
  });

  if (requiresImmediatePayment) {
    await sendOTPToClient(
      job.clientPhone,
      {
        clientName: job.clientName,
        jobType: job.jobType,
        jobId: job.jobNumber,
        workerName: worker.name,
        amount,
        otpCode: otp,
        companyName,
      },
      sender
    );

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

  await createNotification({
    type: "JOB_VERIFIED",
    title: "Job verified without instant payment",
    message: `${worker.name} completed job for ${job.clientName}. Invoice ${invoice.invoiceNumber} is pending under ${billingMode === "MONTHLY_BILLING" ? "monthly billing" : "manual follow-up"}.`,
    jobId: job.id,
    link: `/admin/jobs?id=${job.id}`,
  });

  await sendJobVerifiedToWorker(
    worker.phone,
    {
      workerName: worker.name,
      clientName: job.clientName,
      jobType: job.jobType,
      jobId: job.jobNumber,
    },
    sender
  );

  try {
    await deliverJobVerifiedDocs(job.id, companyName, sender);
  } catch (err) {
    console.error("[Webhook] Billing-later document delivery error:", err);
  }

  const billingText =
    billingMode === "MONTHLY_BILLING"
      ? "This client is on monthly billing, so no OTP is needed."
      : "This client is set to manual payment follow-up, so no OTP is needed.";

  return twilioReply(
    `✅ Job completed and verified.\n\nAmount: ${formatKES(amount)}\nInvoice: ${invoice.invoiceNumber} (Pending)\n\n${billingText}`
  );
}

async function handleOTP(
  worker: { id: string; name: string; phone: string },
  otp: string,
  companyName: string,
  workspaceId: string,
  sender?: WhatsAppSender | null
) {
  const job = await prisma.job.findFirst({
    where: {
      workspaceId,
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
      workspaceId,
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

  await sendJobVerifiedToWorker(worker.phone, {
    workerName: worker.name,
    clientName: job.clientName,
    jobType: job.jobType,
    jobId: job.jobNumber,
  }, sender);

  // Generate and send PDFs
  try {
    const setting = await prisma.setting.findFirst({ where: { workspaceId, key: "company_phone" } });
    const companyPhone = setting?.value ?? "";

    const invoiceCount = await prisma.invoice.count({ where: { workspaceId } });
    const jobCount = await prisma.job.count({ where: { workspaceId, status: { in: ["VERIFIED", "CLOSED"] } } });

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

    await deliverJobVerifiedDocs(job.id, companyName, sender);
  } catch (err) {
    console.error("[Webhook] PDF generation error:", err);
  }

  return twilioReply(`🎉 Job VERIFIED!\n\nClient: ${job.clientName}\nAmount: ${formatKES(job.finalAmount ?? 0)}\nInvoice: PAID\n\nDocuments sent to client. Well done!`);
}

async function handlePostpone(
  worker: { id: string; name: string; phone: string },
  reason: string | undefined,
  companyName: string,
  workspaceId: string,
  sender?: WhatsAppSender | null
) {
  const job = await prisma.job.findFirst({
    where: {
      workspaceId,
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
      workspaceId,
      jobId: job.id,
      type: "POSTPONED",
      note: `Postponed by ${worker.name}: ${reason}`,
    },
  });

  await sendPostponeNotice(job.clientPhone, { reason, companyName, jobType: job.jobType }, sender);

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

async function handleUndo(
  worker: { id: string; name: string; phone: string },
  workspaceId: string
) {
  const job = await prisma.job.findFirst({
    where: {
      workspaceId,
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

  await prisma.invoice.deleteMany({ where: { jobId: job.id, workspaceId } }).catch(() => {});

  await prisma.jobEvent.create({
    data: { workspaceId, jobId: job.id, type: "UNDO", note: `Undo by ${worker.name}` },
  });

  return twilioReply(`↩️ Undone. Job for ${job.clientName} is back to In Progress.`);
}

async function handleSchedule(
  worker: { id: string; name: string; phone: string },
  workspaceId: string
) {
  const jobs = await prisma.job.findMany({
    where: {
      workspaceId,
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

async function handleEarnings(
  worker: { id: string; name: string; phone: string },
  workspaceId: string
) {
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const weekJobs = await prisma.job.findMany({
    where: {
      workspaceId,
      workers: { some: { id: worker.id } },
      status: "VERIFIED",
      verifiedAt: { gte: startOfWeek },
    },
    select: { finalAmount: true },
  });

  const monthJobs = await prisma.job.findMany({
    where: {
      workspaceId,
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
  companyName: string,
  workspaceId: string
) {
  const job = await prisma.job.findFirst({
    where: {
      workspaceId,
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
      data: { workspaceId, jobId: job.id, type: "ISSUE_REPORTED", note: message },
    });
  }

  return twilioReply("⚠️ Issue reported. Admin has been alerted and will contact you shortly.");
}

async function handlePendingCompletionConfirmation(
  worker: WorkerRef,
  body: string,
  companyName: string,
  workspaceId: string,
  sender?: WhatsAppSender | null
) {
  const activeJobs = await prisma.job.findMany({
    where: {
      workspaceId,
      workers: { some: { id: worker.id } },
      status: { in: ["ASSIGNED", "IN_PROGRESS"] },
    },
    include: { invoice: true },
    orderBy: { updatedAt: "desc" },
    take: 5,
  });

  const job = activeJobs.find((item) => getJobMeta(item.metadata).pendingCompletionConfirmation);
  if (!job) return null;

  const confirmation = getJobMeta(job.metadata).pendingCompletionConfirmation;
  if (!confirmation) return null;

  if (!matchesClientAndLocation(body, job.clientName, job.location ?? job.zone ?? "")) {
    return twilioReply(
      `That reply does not match the job I expected.\n\nReply with the client name and location for:\n${job.clientName}\n${job.location ?? job.zone ?? "No location listed"}`
    );
  }

  return await finalizeCompletion(job, worker, confirmation.amount, companyName, workspaceId, sender);
}

async function handleClientMessage(
  clientPhone: string,
  body: string,
  companyName: string,
  workspaceId: string,
  sender?: WhatsAppSender | null
) {
  const jobs = await prisma.job.findMany({
    where: {
      workspaceId,
      clientPhone,
      status: {
        in: ["ASSIGNED", "IN_PROGRESS", "POSTPONED", "COMPLETED_PENDING_VERIFICATION", "VERIFIED"],
      },
    },
    include: { workers: { select: { id: true, name: true, phone: true } } },
    orderBy: { updatedAt: "desc" },
    take: 10,
  });

  if (!jobs.length) {
    return twilioReply("This number is not linked to an active FieldFlow job right now.");
  }

  const arrivalJob = jobs.find((job) => getJobMeta(job.metadata).arrivalConfirmation?.status === "PENDING");
  if (arrivalJob) {
    const arrivalReply = await handleClientArrivalReply(arrivalJob, body, workspaceId, sender);
    if (arrivalReply) return arrivalReply;
  }

  const latestJob = jobs[0];
  const postponeReason = parseClientPostpone(body);
  if (postponeReason && ["ASSIGNED", "IN_PROGRESS"].includes(latestJob.status)) {
    await prisma.job.update({
      where: { id: latestJob.id },
      data: {
        status: "POSTPONED",
        postponeReason,
        postponedAt: new Date(),
        lastActionAt: new Date(),
      },
    });

    await prisma.jobEvent.create({
      data: {
        workspaceId,
        jobId: latestJob.id,
        type: "CLIENT_POSTPONED",
        note: `Client requested postponement: ${postponeReason}`,
      },
    });

    await createNotification({
      type: "CLIENT_POSTPONED",
      title: "Client requested postponement",
      message: `${latestJob.clientName} asked to postpone ${latestJob.jobType}. Reason: ${postponeReason}`,
      jobId: latestJob.id,
      link: `/admin/jobs?id=${latestJob.id}`,
    });

    const assignedWorker = latestJob.workers[0];
    if (assignedWorker) {
      await sendWorkerReply(
        assignedWorker.phone,
        `Client ${latestJob.clientName} asked to postpone this visit. Reason: ${postponeReason}. Admin has been notified.`,
        sender
      );
    }

    return twilioReply(`Thanks. We have logged your postponement request and alerted ${companyName}. The team will contact you with a new schedule.`);
  }

  await prisma.jobEvent.create({
    data: {
      workspaceId,
      jobId: latestJob.id,
      type: "CLIENT_COMMENT",
      note: `Client comment (${latestJob.status}): ${body}`,
    },
  });

  await createNotification({
    type: "CLIENT_COMMENT",
    title: "Client comment received",
    message: `${latestJob.clientName} commented on ${latestJob.jobType}: ${body}`,
    jobId: latestJob.id,
    link: `/admin/jobs?id=${latestJob.id}`,
  });

  return twilioReply(`Thanks. Your comment has been saved and shared with ${companyName}.`);
}

async function handleClientArrivalReply(
  job: {
    id: string;
    clientName: string;
    jobType: string;
    location: string | null;
    status: string;
    metadata: unknown;
    workers: Array<{ id: string; name: string; phone: string }>;
  },
  body: string,
  workspaceId: string,
  sender?: WhatsAppSender | null
) {
  const yesNo = parseYesNo(body);
  const meta = getJobMeta(job.metadata);
  const arrival = meta.arrivalConfirmation;
  if (!arrival) return null;

  if (!yesNo) {
    await prisma.jobEvent.create({
      data: {
        workspaceId,
        jobId: job.id,
        type: "CLIENT_COMMENT",
        note: `Client comment while confirming arrival: ${body}`,
      },
    });

    await createNotification({
      type: "CLIENT_COMMENT",
      title: "Client comment received",
      message: `${job.clientName} sent a comment while confirming arrival: ${body}`,
      jobId: job.id,
      link: `/admin/jobs?id=${job.id}`,
    });

    return twilioReply("Thanks, we saved your comment. Please also reply YES if the technician has arrived, or NO if they have not.");
  }

  const updatedMetadata = mergeJobMetadata(job.metadata, {
    arrivalConfirmation: {
      ...arrival,
      status: yesNo === "YES" ? "CONFIRMED" : "DISPUTED",
      respondedAt: new Date().toISOString(),
      comment: body,
    },
  });

  await prisma.job.update({
    where: { id: job.id },
    data: { metadata: updatedMetadata, lastActionAt: new Date() },
  });

  await prisma.jobEvent.create({
    data: {
      workspaceId,
      jobId: job.id,
      type: yesNo === "YES" ? "ARRIVAL_CONFIRMED" : "ARRIVAL_DISPUTED",
      note: `Client replied ${yesNo}: ${body}`,
    },
  });

  await createNotification({
    type: yesNo === "YES" ? "ARRIVAL_CONFIRMED" : "ARRIVAL_DISPUTED",
    title: yesNo === "YES" ? "Client confirmed arrival" : "Client denied arrival",
    message: `${job.clientName} replied ${yesNo} for ${job.jobType}${job.location ? ` at ${job.location}` : ""}.`,
    jobId: job.id,
    link: `/admin/jobs?id=${job.id}`,
  });

  const primaryWorker = job.workers[0];
  if (primaryWorker) {
    const workerMessage =
      yesNo === "YES"
        ? `Client ${job.clientName} confirmed that you have arrived.`
        : `Client ${job.clientName} says you have not arrived yet. Please contact them before continuing.`;
    await sendWorkerReply(primaryWorker.phone, workerMessage, sender);
  }

  return twilioReply(
    yesNo === "YES"
      ? "Thanks, we have confirmed the technician's arrival."
      : "Thanks, we have alerted the team that the technician has not arrived yet."
  );
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

function getJobMeta(raw: unknown): JobMetaState {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return raw as JobMetaState;
}

function mergeJobMetadata(raw: unknown, updates: Partial<JobMetaState>) {
  const next: JobMetaState = { ...getJobMeta(raw), ...updates };
  if (!next.pendingCompletionConfirmation) delete next.pendingCompletionConfirmation;
  if (!next.arrivalConfirmation) delete next.arrivalConfirmation;
  return next;
}

function clearPendingCompletion(raw: unknown) {
  return mergeJobMetadata(raw, { pendingCompletionConfirmation: undefined });
}

function normalizeText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function significantTokens(value: string) {
  return normalizeText(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !["mrs", "mr", "ms", "the", "and", "road", "rd"].includes(token));
}

function matchesClientAndLocation(reply: string, clientName: string, location: string) {
  const normalizedReply = normalizeText(reply);
  const clientTokens = significantTokens(clientName);
  const locationTokens = significantTokens(location);

  const hasClient = clientTokens.length === 0 || clientTokens.some((token) => normalizedReply.includes(token));
  const hasLocation = locationTokens.length === 0 || locationTokens.some((token) => normalizedReply.includes(token));

  return hasClient && hasLocation;
}

function parseYesNo(reply: string): "YES" | "NO" | null {
  const normalizedReply = normalizeText(reply);
  if (/^(yes|y|ndio|iko|arrived|amefika)\b/.test(normalizedReply)) return "YES";
  if (/^(no|n|hapana|bado|not yet|not arrived)\b/.test(normalizedReply)) return "NO";
  return null;
}

function parseClientPostpone(reply: string) {
  const normalizedReply = normalizeText(reply);
  if (!/^(postpone|reschedule|later|not available|not home|kesho|tomorrow|move visit)\b/.test(normalizedReply)) {
    return null;
  }

  const reason = reply.replace(/^(postpone|reschedule|later|not available|not home|kesho|tomorrow|move visit)\b[:\-\s]*/i, "").trim();
  return reason || "Client requested postponement";
}

function escapeXml(str: string) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
