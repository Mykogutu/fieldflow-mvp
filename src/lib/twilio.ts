/**
 * WhatsApp messaging layer.
 *
 * Product events use saved WhatsAppTemplate rows. The lower-level
 * sendWhatsApp helper remains for direct replies and manual tests.
 */

import {
  getDefaultSender,
  getTwilioClient,
  senderFromAddress,
  applyBrandingFooter,
  type WhatsAppSender,
} from "./senders";
import { prisma } from "./prisma";
import { currentWorkspaceId } from "./workspace";
import { sendWhatsAppTemplate, type WhatsAppTemplateKey } from "./whatsapp-templates";

type WhatsAppSendMeta = {
  messageType?: string;
  eventType?: string;
  jobId?: string;
  clientId?: string;
  workerId?: string;
  templateId?: string;
};

function to(phone: string) {
  return `whatsapp:${phone}`;
}

async function resolveSender(
  sender?: WhatsAppSender | null
): Promise<WhatsAppSender | null> {
  if (sender) return sender;
  return await getDefaultSender();
}

async function workspaceIdFor(sender?: WhatsAppSender | null) {
  const s = await resolveSender(sender);
  return s?.workspaceId ?? (await currentWorkspaceId());
}

async function isWhatsAppFlowEnabled(
  settingKey: string,
  sender?: WhatsAppSender | null
): Promise<boolean> {
  const s = await resolveSender(sender);
  const workspaceId = s?.workspaceId;
  if (!workspaceId) return true;

  const setting = await prisma.setting.findFirst({
    where: { workspaceId, key: settingKey },
    select: { value: true },
  });

  return setting?.value !== "false";
}

export async function sendWhatsApp(
  phone: string,
  body: string,
  sender?: WhatsAppSender | null,
  meta: WhatsAppSendMeta = {}
): Promise<boolean> {
  const s = await resolveSender(sender);
  if (!s) {
    console.error("[Twilio] sendWhatsApp: no sender configured");
    return false;
  }
  try {
    const client = getTwilioClient(s);
    const poweredBySetting = await prisma.setting.findFirst({
      where: { workspaceId: s.workspaceId, key: "show_powered_by" },
      select: { value: true },
    });
    const outboundBody =
      poweredBySetting?.value === "false" ? body : applyBrandingFooter(s, body);

    const message = await client.messages.create({
      from: senderFromAddress(s),
      to: to(phone),
      body: outboundBody,
    });
    await logWhatsAppMessage(s, phone, "SENT", meta, message.sid);
    return true;
  } catch (err) {
    console.error("[Twilio] sendWhatsApp error:", err);
    await logWhatsAppMessage(
      s,
      phone,
      "FAILED",
      meta,
      undefined,
      err instanceof Error ? err.message : "Unknown WhatsApp send error"
    );
    return false;
  }
}

async function logWhatsAppMessage(
  sender: WhatsAppSender,
  phone: string,
  status: "SENT" | "FAILED",
  meta: WhatsAppSendMeta,
  providerMessageSid?: string,
  errorReason?: string
) {
  try {
    await prisma.whatsAppMessageLog.create({
      data: {
        workspaceId: sender.workspaceId,
        senderId: sender.id === "env-fallback" ? null : sender.id,
        templateId: meta.templateId,
        direction: "OUTBOUND",
        messageType: meta.messageType ?? "FREEFORM",
        eventType: meta.eventType ?? meta.messageType ?? "FREEFORM",
        jobId: meta.jobId,
        clientId: meta.clientId,
        workerId: meta.workerId,
        toPhone: phone,
        fromPhone: sender.phoneNumber,
        status,
        providerMessageSid,
        errorReason,
        sentAt: status === "SENT" ? new Date() : null,
        failedAt: status === "FAILED" ? new Date() : null,
      },
    });
  } catch (error) {
    console.error("[Twilio] message log error:", error);
  }
}

export async function sendJobAssignment(
  workerPhone: string,
  params: {
    workerName?: string;
    clientName: string;
    jobType: string;
    location: string;
    scheduledDate: string;
    jobId: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  await sendTemplate(
    "JOB_ASSIGNED_WORKER",
    workerPhone,
    {
      worker_name: params.workerName ?? "Technician",
      job_type: params.jobType,
      client_name: params.clientName,
      location: params.location,
      scheduled_time: params.scheduledDate,
    },
    "JOB_ASSIGNED",
    sender,
    { jobId: params.jobId }
  );
}

export async function sendTechnicianAssignedToClient(
  clientPhone: string,
  params: {
    clientName: string;
    companyName: string;
    jobType: string;
    scheduledDate: string;
    technicianName: string;
    technicianPhone: string;
    jobId: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  await sendTemplate(
    "TECHNICIAN_ASSIGNED_CLIENT",
    clientPhone,
    {
      client_name: params.clientName,
      company_name: params.companyName,
      job_type: params.jobType,
      scheduled_time: params.scheduledDate,
      technician_name: params.technicianName,
      technician_phone: params.technicianPhone,
    },
    "TECHNICIAN_ASSIGNED_CLIENT",
    sender,
    { jobId: params.jobId }
  );
}

export async function sendJobReassignment(
  workerPhone: string,
  params: {
    workerName: string;
    clientName: string;
    jobType: string;
    location: string;
    scheduledDate: string;
    jobId: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  await sendTemplate(
    "JOB_REASSIGNED",
    workerPhone,
    {
      worker_name: params.workerName,
      job_type: params.jobType,
      client_name: params.clientName,
      location: params.location,
      scheduled_time: params.scheduledDate,
    },
    "JOB_REASSIGNED",
    sender,
    { jobId: params.jobId }
  );
}

export async function sendOTPToClient(
  clientPhone: string,
  params: {
    clientName: string;
    jobType: string;
    jobId: string;
    workerName: string;
    amount: number;
    otpCode: string;
    companyName: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  await sendTemplate(
    "OTP_REQUEST",
    clientPhone,
    {
      client_name: params.clientName,
      company_name: params.companyName,
      job_type: params.jobType,
      job_id: params.jobId,
      otp_code: params.otpCode,
    },
    "OTP_REQUEST",
    sender,
    { jobId: params.jobId }
  );
}

export async function sendJobVerifiedToWorker(
  workerPhone: string,
  params: {
    workerName: string;
    clientName: string;
    jobType: string;
    jobId: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  await sendTemplate(
    "JOB_VERIFIED",
    workerPhone,
    {
      worker_name: params.workerName,
      job_type: params.jobType,
      client_name: params.clientName,
      job_id: params.jobId,
    },
    "JOB_VERIFIED",
    sender,
    { jobId: params.jobId }
  );
}

export async function sendInvoiceReadyToClient(
  clientPhone: string,
  params: {
    clientName: string;
    invoiceNumber: string;
    amount: string;
    jobId: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  await sendTemplate(
    "INVOICE_READY",
    clientPhone,
    {
      client_name: params.clientName,
      invoice_number: params.invoiceNumber,
      amount: params.amount,
      job_id: params.jobId,
    },
    "INVOICE_READY",
    sender,
    { jobId: params.jobId }
  );
}

export async function sendQuotationReadyToClient(
  clientPhone: string,
  params: {
    clientName: string;
    quotationNumber: string;
    jobType: string;
    amount: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  await sendTemplate(
    "QUOTATION_READY",
    clientPhone,
    {
      client_name: params.clientName,
      quotation_number: params.quotationNumber,
      job_type: params.jobType,
      amount: params.amount,
    },
    "QUOTATION_READY",
    sender
  );
}

export async function sendDocsToClient(
  clientPhone: string,
  params: {
    clientName: string;
    invoiceUrl?: string;
    jobCardUrl?: string;
    companyName: string;
    invoiceNumber?: string;
    amount?: string;
    jobId?: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  if (!(await isWhatsAppFlowEnabled("document_send_whatsapp", sender))) return;

  await sendInvoiceReadyToClient(
    clientPhone,
    {
      clientName: params.clientName,
      invoiceNumber: params.invoiceNumber ?? params.invoiceUrl ?? "Invoice",
      amount: params.amount ?? "See invoice",
      jobId: params.jobId ?? params.jobCardUrl ?? params.companyName,
    },
    sender
  );
}

export async function sendPostponeNotice(
  clientPhone: string,
  params: { reason: string; companyName: string },
  sender?: WhatsAppSender | null
): Promise<void> {
  if (!(await isWhatsAppFlowEnabled("whatsapp_client_notifications", sender))) return;

  const body =
    `Appointment Update - ${params.companyName}\n\n` +
    `Your appointment has been postponed.\n` +
    `Reason: ${params.reason}\n\n` +
    `We will contact you shortly to reschedule.`;
  await sendWhatsApp(clientPhone, body, sender, { messageType: "CLIENT_NOTIFICATION" });
}

export async function sendWorkerReply(
  phone: string,
  message: string,
  sender?: WhatsAppSender | null
): Promise<void> {
  await sendWhatsApp(phone, message, sender, { messageType: "WORKER_REPLY" });
}

export async function sendDailyBriefing(
  workerPhone: string,
  params: {
    workerName: string;
    jobCount: number;
    firstJobType: string;
    firstClientName: string;
    firstLocation: string;
    firstScheduledTime: string;
    workerId?: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  await sendTemplate(
    "DAILY_BRIEFING",
    workerPhone,
    {
      worker_name: params.workerName,
      job_count: params.jobCount,
      first_job_type: params.firstJobType,
      first_client_name: params.firstClientName,
      first_location: params.firstLocation,
      first_scheduled_time: params.firstScheduledTime,
    },
    "DAILY_BRIEFING",
    sender,
    { workerId: params.workerId }
  );
}

async function sendTemplate(
  templateKey: WhatsAppTemplateKey,
  toPhone: string,
  variables: Record<string, string | number>,
  eventType: string,
  sender?: WhatsAppSender | null,
  meta: { jobId?: string; clientId?: string; workerId?: string } = {}
) {
  const workspaceId = await workspaceIdFor(sender);
  await sendWhatsAppTemplate({
    workspaceId,
    templateKey,
    to: toPhone,
    variables,
    eventType,
    sender,
    ...meta,
  });
}
