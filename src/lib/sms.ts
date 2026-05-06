import { prisma } from "./prisma";
import { currentWorkspaceId } from "./workspace";
import { getDefaultSender, getTwilioClient, type WhatsAppSender } from "./senders";
import { normalizePhone } from "./utils";

export type MessageChannel = "whatsapp" | "sms" | "both" | "auto";

type SmsMeta = {
  messageType?: string;
  eventType?: string;
  jobId?: string;
  clientId?: string;
  workerId?: string;
  templateId?: string | null;
};

const DEFAULT_TWILIO_ENV_SUFFIX = "MYRIAD";

function defaultTwilioEnvSuffix() {
  return (
    process.env.DEFAULT_TWILIO_ENV_SUFFIX ??
    process.env.TWILIO_DEFAULT_CLIENT ??
    DEFAULT_TWILIO_ENV_SUFFIX
  )
    .trim()
    .toUpperCase();
}

function envValue(key: string) {
  const suffix = defaultTwilioEnvSuffix();
  const suffixedKey = suffix ? `${key}_${suffix}` : "";
  return (suffixedKey ? process.env[suffixedKey]?.trim() : undefined) || process.env[key]?.trim() || null;
}

function normalizeChannel(value: string | null | undefined): MessageChannel {
  const channel = String(value ?? "").trim().toLowerCase();
  if (channel === "sms" || channel === "text") return "sms";
  if (channel === "both" || channel === "all") return "both";
  if (channel === "whatsapp" || channel === "wa") return "whatsapp";
  if (channel === "auto" || channel === "fallback") return "auto";
  return "both";
}

export async function messageChannelForWorkspace(workspaceId: string): Promise<MessageChannel> {
  const setting = await prisma.setting.findFirst({
    where: { workspaceId, key: { in: ["message_channel", "outbound_message_channel"] } },
    select: { value: true },
    orderBy: { key: "asc" },
  });

  return normalizeChannel(
    setting?.value ??
      process.env.TWILIO_MESSAGE_CHANNEL ??
      process.env.FIELD_FLOW_MESSAGE_CHANNEL ??
      "both"
  );
}

function smsMessagingServiceSid() {
  return envValue("TWILIO_SMS_MESSAGING_SERVICE_SID") ?? envValue("TWILIO_MESSAGING_SERVICE_SID");
}

function smsFromNumber(sender?: WhatsAppSender | null) {
  return (
    envValue("TWILIO_SMS_NUMBER") ??
    envValue("TWILIO_TEXT_NUMBER") ??
    envValue("TWILIO_PHONE_NUMBER") ??
    envValue("TWILIO_WHATSAPP_NUMBER") ??
    sender?.phoneNumber ??
    null
  );
}

export async function sendSms(
  phone: string,
  body: string,
  sender?: WhatsAppSender | null,
  meta: SmsMeta = {},
  workspaceId?: string
) {
  const resolvedSender = sender ?? (await getDefaultSender(workspaceId));
  const wsId = workspaceId ?? resolvedSender?.workspaceId ?? (await currentWorkspaceId());
  const toPhone = normalizePhone(phone);
  const fromPhone = smsFromNumber(resolvedSender);
  const messagingServiceSid = smsMessagingServiceSid();
  const baseLog = {
    workspaceId: wsId,
    senderId: resolvedSender?.id === "env-fallback" ? null : resolvedSender?.id ?? null,
    templateId: meta.templateId ?? null,
    direction: "OUTBOUND",
    messageType: meta.messageType ?? "SMS",
    eventType: meta.eventType ?? meta.messageType ?? "SMS",
    jobId: meta.jobId,
    clientId: meta.clientId,
    workerId: meta.workerId,
    toPhone,
    fromPhone: fromPhone ?? null,
  };

  if (!resolvedSender) {
    await prisma.whatsAppMessageLog.create({
      data: { ...baseLog, status: "BLOCKED", errorReason: "No Twilio credentials are configured for SMS.", failedAt: new Date() },
    });
    return { ok: false, error: "No Twilio credentials are configured for SMS." };
  }

  if (!messagingServiceSid && !fromPhone) {
    await prisma.whatsAppMessageLog.create({
      data: { ...baseLog, status: "BLOCKED", errorReason: "No SMS number or messaging service is configured.", failedAt: new Date() },
    });
    return { ok: false, error: "No SMS number or messaging service is configured." };
  }

  try {
    const client = getTwilioClient(resolvedSender);
    const message = await client.messages.create({
      to: toPhone,
      body,
      ...(messagingServiceSid ? { messagingServiceSid } : { from: fromPhone! }),
    });

    await prisma.whatsAppMessageLog.create({
      data: { ...baseLog, status: "SENT", providerMessageSid: message.sid, sentAt: new Date() },
    });
    return { ok: true, providerMessageSid: message.sid };
  } catch (error) {
    const errorReason = error instanceof Error ? error.message : "Unknown SMS provider error.";
    await prisma.whatsAppMessageLog.create({
      data: { ...baseLog, status: "FAILED", errorReason, failedAt: new Date() },
    });
    return { ok: false, error: errorReason };
  }
}
