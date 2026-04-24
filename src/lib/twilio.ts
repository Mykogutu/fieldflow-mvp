/**
 * Messaging layer — see MVP-STRATEGY.md §17
 *
 * Every send function takes an optional `sender` (`WhatsAppSender`). When
 * provided, we send from that sender's credentials/number — this is what
 * powers per-tenant branding without forking the codebase. When omitted,
 * we resolve the default sender (env-fallback in single-tenant deployments).
 */

import {
  getDefaultSender,
  getTwilioClient,
  senderFromAddress,
  applyBrandingFooter,
  type WhatsAppSender,
} from "./senders";

function to(phone: string) {
  return `whatsapp:${phone}`;
}

async function resolveSender(
  sender?: WhatsAppSender | null
): Promise<WhatsAppSender | null> {
  if (sender) return sender;
  return await getDefaultSender();
}

export async function sendWhatsApp(
  phone: string,
  body: string,
  sender?: WhatsAppSender | null
): Promise<void> {
  const s = await resolveSender(sender);
  if (!s) {
    console.error("[Twilio] sendWhatsApp: no sender configured");
    return;
  }
  try {
    const client = getTwilioClient(s);
    await client.messages.create({
      from: senderFromAddress(s),
      to: to(phone),
      body: applyBrandingFooter(s, body),
    });
  } catch (err) {
    console.error("[Twilio] sendWhatsApp error:", err);
  }
}

export async function sendJobAssignment(
  workerPhone: string,
  params: {
    clientName: string;
    jobType: string;
    location: string;
    scheduledDate: string;
    jobId: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  const body =
    `🔔 *New Job Assigned*\n\n` +
    `Client: ${params.clientName}\n` +
    `Type: ${params.jobType}\n` +
    `Location: ${params.location}\n` +
    `Scheduled: ${params.scheduledDate}\n\n` +
    `Reply *ACCEPT* to confirm or *DECLINE* if unavailable.`;

  await sendWhatsApp(workerPhone, body, sender);
}

export async function sendOTPToClient(
  clientPhone: string,
  params: {
    workerName: string;
    amount: number;
    otpCode: string;
    companyName: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  // Tenant brand sits in the body so SHARED-tier messages still feel like
  // they came from the workspace, not from FieldFlow.
  const body =
    `✅ *Service Complete — ${params.companyName}*\n\n` +
    `${params.companyName} has completed your service.\n` +
    `Amount: KES ${params.amount.toLocaleString()}\n\n` +
    `🔐 *Service Code: ${params.otpCode}*\n\n` +
    `Share this code with the technician AFTER payment to confirm the service.`;

  await sendWhatsApp(clientPhone, body, sender);
}

export async function sendDocsToClient(
  clientPhone: string,
  params: {
    clientName: string;
    invoiceUrl?: string;
    jobCardUrl?: string;
    companyName: string;
  },
  sender?: WhatsAppSender | null
): Promise<void> {
  const parts = [
    `✅ *Service Verified — ${params.companyName}*\n`,
    `Dear ${params.clientName}, thank you for using our services.\n`,
  ];
  if (params.invoiceUrl) parts.push(`📄 Invoice: ${params.invoiceUrl}`);
  if (params.jobCardUrl) parts.push(`📋 Job Card: ${params.jobCardUrl}`);
  parts.push("\nThank you for your business!");
  await sendWhatsApp(clientPhone, parts.join("\n"), sender);
}

export async function sendPostponeNotice(
  clientPhone: string,
  params: { reason: string; companyName: string },
  sender?: WhatsAppSender | null
): Promise<void> {
  const body =
    `📅 *Appointment Update — ${params.companyName}*\n\n` +
    `Your appointment has been postponed.\n` +
    `Reason: ${params.reason}\n\n` +
    `We will contact you shortly to reschedule.`;
  await sendWhatsApp(clientPhone, body, sender);
}

export async function sendWorkerReply(
  phone: string,
  message: string,
  sender?: WhatsAppSender | null
): Promise<void> {
  await sendWhatsApp(phone, message, sender);
}
