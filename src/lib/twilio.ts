import twilio from "twilio";

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const FROM = `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`;

function to(phone: string) {
  return `whatsapp:${phone}`;
}

export async function sendWhatsApp(phone: string, body: string): Promise<void> {
  try {
    await client.messages.create({ from: FROM, to: to(phone), body });
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
  }
): Promise<void> {
  const body =
    `🔔 *New Job Assigned*\n\n` +
    `Client: ${params.clientName}\n` +
    `Type: ${params.jobType}\n` +
    `Location: ${params.location}\n` +
    `Scheduled: ${params.scheduledDate}\n\n` +
    `Reply *ACCEPT* to confirm or *DECLINE* if unavailable.`;

  await sendWhatsApp(workerPhone, body);
}

export async function sendOTPToClient(
  clientPhone: string,
  params: {
    workerName: string;
    amount: number;
    otpCode: string;
    companyName: string;
  }
): Promise<void> {
  const body =
    `✅ *Service Complete*\n\n` +
    `${params.companyName} has completed your service.\n` +
    `Amount: KES ${params.amount.toLocaleString()}\n\n` +
    `🔐 *Service Code: ${params.otpCode}*\n\n` +
    `Share this code with the technician AFTER payment to confirm the service.`;

  await sendWhatsApp(clientPhone, body);
}

export async function sendDocsToClient(
  clientPhone: string,
  params: {
    clientName: string;
    invoiceUrl?: string;
    jobCardUrl?: string;
    companyName: string;
  }
): Promise<void> {
  const parts = [`✅ *Service Verified — ${params.companyName}*\n`, `Dear ${params.clientName}, thank you for using our services.\n`];
  if (params.invoiceUrl) parts.push(`📄 Invoice: ${params.invoiceUrl}`);
  if (params.jobCardUrl) parts.push(`📋 Job Card: ${params.jobCardUrl}`);
  parts.push("\nThank you for your business!");
  await sendWhatsApp(clientPhone, parts.join("\n"));
}

export async function sendPostponeNotice(
  clientPhone: string,
  params: { reason: string; companyName: string }
): Promise<void> {
  const body =
    `📅 *Appointment Update — ${params.companyName}*\n\n` +
    `Your appointment has been postponed.\n` +
    `Reason: ${params.reason}\n\n` +
    `We will contact you shortly to reschedule.`;
  await sendWhatsApp(clientPhone, body);
}

export async function sendWorkerReply(phone: string, message: string): Promise<void> {
  await sendWhatsApp(phone, message);
}
