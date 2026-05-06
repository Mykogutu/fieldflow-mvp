import { prisma } from "./prisma";
import { getDefaultSender, getTwilioClient, senderFromAddress, type WhatsAppSender } from "./senders";
import { messageChannelForWorkspace, sendSms, type MessageChannel } from "./sms";
import { formatDate, normalizePhone } from "./utils";

export const WHATSAPP_TEMPLATE_KEYS = [
  "JOB_ASSIGNED_WORKER",
  "TECHNICIAN_ASSIGNED_CLIENT",
  "JOB_REASSIGNED",
  "SERVICE_CODE_REQUEST",
  "JOB_VERIFIED",
  "INVOICE_READY",
  "QUOTATION_READY",
  "DAILY_BRIEFING",
  "ARRIVAL_CONFIRMATION_REQUEST",
  "POSTPONEMENT_NOTICE",
  "REVIEW_REQUEST",
] as const;

export type WhatsAppTemplateKey = (typeof WHATSAPP_TEMPLATE_KEYS)[number];

type TemplateDefinition = {
  key: WhatsAppTemplateKey;
  name: string;
  category: string;
  language: string;
  settingKey?: string;
  envSidKeys: readonly string[];
  body: string;
  variables: readonly string[];
  examples: Record<string, string>;
};

const DEFAULT_LANGUAGE = "en";
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

export const WHATSAPP_TEMPLATE_DEFINITIONS: Record<WhatsAppTemplateKey, TemplateDefinition> = {
  JOB_ASSIGNED_WORKER: {
    key: "JOB_ASSIGNED_WORKER",
    name: "job_assigned_worker",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "whatsapp_job_assignment_notifications",
    envSidKeys: ["TWILIO_JOB_ASSIGNED_WORKER_TEMPLATE_SID", "TWILIO_JOB_ASSIGNMENT_TEMPLATE_SID"],
    body:
      "Hello {{worker_name}}. You have been assigned a new job.\n\n" +
      "Job: {{job_type}}\n" +
      "Client: {{client_name}}\n" +
      "Location: {{location}}\n" +
      "Scheduled: {{scheduled_time}}\n\n" +
      "Reply ACCEPT to take this job or DECLINE if you are unavailable.",
    variables: ["worker_name", "job_type", "client_name", "location", "scheduled_time"],
    examples: {
      worker_name: "James",
      job_type: "Tank Cleaning",
      client_name: "Mrs. Aisha Mohamed",
      location: "Kilimani",
      scheduled_time: "26 Apr 2026, 09:00",
    },
  },
  TECHNICIAN_ASSIGNED_CLIENT: {
    key: "TECHNICIAN_ASSIGNED_CLIENT",
    name: "technician_assigned_client",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "whatsapp_client_notifications",
    envSidKeys: ["TWILIO_TECHNICIAN_ASSIGNED_CLIENT_TEMPLATE_SID"],
    body:
      "Hello {{client_name}}. {{company_name}} has assigned a technician to your job.\n\n" +
      "Service: {{job_type}}\n" +
      "Scheduled: {{scheduled_time}}\n" +
      "Technician: {{technician_name}}\n" +
      "Phone: {{technician_phone}}\n\n" +
      "Please keep your phone available in case the technician needs directions or arrival confirmation.",
    variables: ["client_name", "company_name", "job_type", "scheduled_time", "technician_name", "technician_phone"],
    examples: {
      client_name: "Mrs. Aisha Mohamed",
      company_name: "Restore Services",
      job_type: "Tank Cleaning",
      scheduled_time: "26 Apr 2026, 09:00",
      technician_name: "James Baraka",
      technician_phone: "+254700111222",
    },
  },
  JOB_REASSIGNED: {
    key: "JOB_REASSIGNED",
    name: "job_reassigned",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "whatsapp_reassignment_alerts",
    envSidKeys: ["TWILIO_JOB_REASSIGNED_TEMPLATE_SID"],
    body:
      "Hello {{worker_name}}. A job has been reassigned to you.\n\n" +
      "Job: {{job_type}}\n" +
      "Client: {{client_name}}\n" +
      "Location: {{location}}\n" +
      "Scheduled: {{scheduled_time}}\n\n" +
      "Reply ACCEPT to take this job or DECLINE if you are unavailable.",
    variables: ["worker_name", "job_type", "client_name", "location", "scheduled_time"],
    examples: {
      worker_name: "Mary",
      job_type: "Plastic Tank Repair",
      client_name: "Mrs. Lucy Mutua",
      location: "Kilimani",
      scheduled_time: "21 Apr 2026, 10:00",
    },
  },
  SERVICE_CODE_REQUEST: {
    key: "SERVICE_CODE_REQUEST",
    name: "service_code_completion_request",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "whatsapp_service_code_messages",
    envSidKeys: ["TWILIO_SERVICE_CODE_REQUEST_TEMPLATE_SID"],
    body:
      "Hello {{client_name}}. {{company_name}} has marked your job as complete.\n\n" +
      "Job: {{job_type}}\n" +
      "Reference: {{job_id}}\n" +
      "Amount: {{amount}}\n" +
      "Service code: {{service_code}}\n\n" +
      "Please share this service code only after confirming the work is complete.",
    variables: ["client_name", "company_name", "job_type", "job_id", "amount", "service_code"],
    examples: {
      client_name: "Mr. David Otieno",
      company_name: "Restore Services",
      job_type: "Tank Disinfection",
      job_id: "JC-2026-0002",
      amount: "KES 5,000",
      service_code: "847291",
    },
  },
  JOB_VERIFIED: {
    key: "JOB_VERIFIED",
    name: "job_verified_worker",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "whatsapp_job_assignment_notifications",
    envSidKeys: ["TWILIO_JOB_VERIFIED_TEMPLATE_SID"],
    body:
      "Hello {{worker_name}}. Your completed job has been verified.\n\n" +
      "Job: {{job_type}}\n" +
      "Client: {{client_name}}\n" +
      "Reference: {{job_id}}\n\n" +
      "Thank you.",
    variables: ["worker_name", "job_type", "client_name", "job_id"],
    examples: {
      worker_name: "Peter",
      job_type: "Tank Painting",
      client_name: "Mr. Samuel Kibet",
      job_id: "JC-2026-0004",
    },
  },
  INVOICE_READY: {
    key: "INVOICE_READY",
    name: "invoice_ready_client",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "whatsapp_document_delivery",
    envSidKeys: ["TWILIO_INVOICE_READY_TEMPLATE_SID"],
    body:
      "Hello {{client_name}}. Your invoice is ready.\n\n" +
      "Invoice: {{invoice_number}}\n" +
      "Amount: {{amount}}\n" +
      "Reference: {{job_id}}\n\n" +
      "Reply if you need it resent.",
    variables: ["client_name", "invoice_number", "amount", "job_id"],
    examples: {
      client_name: "Mrs. Aisha Mohamed",
      invoice_number: "INV-0001",
      amount: "KES 6,500",
      job_id: "JC-2026-0001",
    },
  },
  QUOTATION_READY: {
    key: "QUOTATION_READY",
    name: "quotation_ready_client",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "whatsapp_quotation_sending",
    envSidKeys: ["TWILIO_QUOTATION_READY_TEMPLATE_SID"],
    body:
      "Hello {{client_name}}. Your quotation is ready.\n\n" +
      "Quotation: {{quotation_number}}\n" +
      "Service: {{job_type}}\n" +
      "Amount: {{amount}}\n\n" +
      "Reply if you would like us to proceed.",
    variables: ["client_name", "quotation_number", "job_type", "amount"],
    examples: {
      client_name: "Mrs. Sarah Wanjiku",
      quotation_number: "QT-0001",
      job_type: "Plastic Tank Repair",
      amount: "KES 7,500",
    },
  },
  DAILY_BRIEFING: {
    key: "DAILY_BRIEFING",
    name: "daily_briefing_worker",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "briefing_enabled",
    envSidKeys: ["TWILIO_DAILY_BRIEFING_TEMPLATE_SID"],
    body:
      "Good morning {{worker_name}}.\n\n" +
      "You have {{job_count}} job(s) today.\n\n" +
      "First job:\n" +
      "{{first_job_type}}\n" +
      "{{first_client_name}}\n" +
      "{{first_location}}\n" +
      "{{first_scheduled_time}}\n\n" +
      "Reply ACCEPT to confirm.\n" +
      "Text ARRIVED when you reach the client.",
    variables: ["worker_name", "job_count", "first_job_type", "first_client_name", "first_location", "first_scheduled_time"],
    examples: {
      worker_name: "James",
      job_count: "2",
      first_job_type: "Tank Repair",
      first_client_name: "Mrs. Wanjiku",
      first_location: "Kilimani",
      first_scheduled_time: "9:00 AM",
    },
  },
  ARRIVAL_CONFIRMATION_REQUEST: {
    key: "ARRIVAL_CONFIRMATION_REQUEST",
    name: "arrival_confirmation_request",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "whatsapp_client_notifications",
    envSidKeys: ["TWILIO_ARRIVAL_CONFIRMATION_REQUEST_TEMPLATE_SID"],
    body:
      "Hello {{client_name}}. {{worker_name}} has checked in for your visit from {{company_name}}.\n\n" +
      "Location: {{location}}\n\n" +
      "Reply YES if they have arrived, or NO if they have not arrived yet. You can include a short comment in the same reply.",
    variables: ["client_name", "worker_name", "company_name", "location"],
    examples: {
      client_name: "Mrs. Aisha Mohamed",
      worker_name: "James Baraka",
      company_name: "Restore Services",
      location: "Kilimani, Nairobi",
    },
  },
  POSTPONEMENT_NOTICE: {
    key: "POSTPONEMENT_NOTICE",
    name: "postponement_notice_client",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "whatsapp_client_notifications",
    envSidKeys: ["TWILIO_POSTPONEMENT_NOTICE_TEMPLATE_SID"],
    body:
      "Appointment update from {{company_name}}.\n\n" +
      "Your {{job_type}} visit has been postponed.\n" +
      "Reason: {{reason}}\n\n" +
      "Reply with any comment or question and we will follow up with a new schedule.",
    variables: ["company_name", "job_type", "reason"],
    examples: {
      company_name: "Restore Services",
      job_type: "Tank Cleaning",
      reason: "Client requested a later visit time",
    },
  },
  REVIEW_REQUEST: {
    key: "REVIEW_REQUEST",
    name: "review_request_client",
    category: "UTILITY",
    language: DEFAULT_LANGUAGE,
    settingKey: "whatsapp_client_notifications",
    envSidKeys: ["TWILIO_REVIEW_REQUEST_TEMPLATE_SID"],
    body:
      "Hello {{client_name}}. Thank you for choosing {{company_name}} for your {{job_type}}.\n\n" +
      "We would love your feedback.\n" +
      "Reply with a short review or comment about the service you received.",
    variables: ["client_name", "company_name", "job_type"],
    examples: {
      client_name: "Mrs. Aisha Mohamed",
      company_name: "Restore Services",
      job_type: "Tank Cleaning",
    },
  },
};

export type WhatsAppVariablePayload = Record<string, string | number | boolean | Date | null | undefined>;

export type WhatsAppTemplateSendInput = {
  workspaceId: string;
  templateKey: WhatsAppTemplateKey;
  to: string;
  variables: WhatsAppVariablePayload;
  eventType: string;
  jobId?: string;
  clientId?: string;
  workerId?: string;
  sender?: WhatsAppSender | null;
};

function variableSchemaFor(definition: TemplateDefinition) {
  return definition.variables.map((name, index) => ({
    name,
    position: index + 1,
    type: "text",
    example: definition.examples[name] ?? "",
  }));
}

function sidFromEnv(definition: TemplateDefinition) {
  const suffix = defaultTwilioEnvSuffix();
  for (const key of definition.envSidKeys) {
    const suffixedValue = suffix ? process.env[`${key}_${suffix}`]?.trim() : undefined;
    if (suffixedValue) return suffixedValue;

    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return null;
}

export async function ensureDefaultWhatsAppTemplates(workspaceId: string, senderId?: string | null) {
  for (const definition of Object.values(WHATSAPP_TEMPLATE_DEFINITIONS)) {
    const existing = await prisma.whatsAppTemplate.findFirst({
      where: {
        workspaceId,
        OR: [{ templateKey: definition.key }, { useCase: definition.key }, { templateName: definition.name }],
      },
      select: { id: true, providerTemplateSid: true, approvalStatus: true, status: true, isEnabled: true },
    });
    const envProviderTemplateSid = sidFromEnv(definition);
    const providerTemplateSid = existing?.providerTemplateSid ?? envProviderTemplateSid;

    const data = {
      workspaceId,
      templateKey: definition.key,
      templateName: definition.name,
      providerTemplateSid,
      language: definition.language,
      category: definition.category,
      useCase: definition.key,
      body: definition.body,
      variableSchema: variableSchemaFor(definition),
      approvalStatus: existing?.approvalStatus ?? existing?.status ?? "DRAFT",
      status: existing?.status ?? existing?.approvalStatus ?? "DRAFT",
      isEnabled: existing?.isEnabled ?? true,
      ...(senderId !== undefined ? { senderId } : {}),
    };

    if (existing) {
      await prisma.whatsAppTemplate.update({
        where: { id: existing.id },
        data,
      });
    } else {
      await prisma.whatsAppTemplate.create({ data });
    }
  }
}

async function isSettingEnabled(workspaceId: string, key?: string) {
  if (!key) return true;
  const setting = await prisma.setting.findUnique({
    where: { workspaceId_key: { workspaceId, key } },
    select: { value: true },
  });
  return setting?.value !== "false";
}

export async function getActiveSender(workspaceId: string): Promise<WhatsAppSender | null> {
  const configuredSender = await prisma.whatsAppSender.findFirst({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  if (configuredSender && configuredSender.status !== "ACTIVE") {
    return null;
  }

  return configuredSender ?? (await getDefaultSender(workspaceId));
}

export async function getApprovedTemplate(workspaceId: string, templateKey: WhatsAppTemplateKey) {
  await ensureDefaultWhatsAppTemplates(workspaceId);
  return prisma.whatsAppTemplate.findFirst({
    where: {
      workspaceId,
      templateKey,
      isEnabled: true,
      approvalStatus: { in: ["APPROVED", "approved"] },
    },
    orderBy: { updatedAt: "desc" },
  });
}

async function getTemplateForSend(workspaceId: string, templateKey: WhatsAppTemplateKey) {
  await ensureDefaultWhatsAppTemplates(workspaceId);
  return prisma.whatsAppTemplate.findFirst({
    where: { workspaceId, templateKey },
    orderBy: { updatedAt: "desc" },
  });
}

export function renderTemplateVariables(templateKey: WhatsAppTemplateKey, payload: WhatsAppVariablePayload) {
  const definition = WHATSAPP_TEMPLATE_DEFINITIONS[templateKey];
  const variables: Record<string, string> = {};

  definition.variables.forEach((name, index) => {
    const raw = payload[name] ?? "";
    const value = raw instanceof Date ? formatDate(raw) : String(raw);
    variables[name] = value;
    variables[String(index + 1)] = value;
  });

  return variables;
}

function namedVariablesOnly(templateKey: WhatsAppTemplateKey, variables: Record<string, string>) {
  const definition = WHATSAPP_TEMPLATE_DEFINITIONS[templateKey];
  return Object.fromEntries(definition.variables.map((name) => [name, variables[name] ?? ""]));
}

function renderBody(body: string, variables: Record<string, string>) {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => variables[key] ?? "");
}

function approvalIsApproved(status: string | null | undefined) {
  return String(status ?? "").toUpperCase() === "APPROVED";
}

function templateIsApproved(template: { approvalStatus?: string | null; status?: string | null }) {
  return approvalIsApproved(template.approvalStatus) || approvalIsApproved(template.status);
}

async function logAttempt(input: {
  workspaceId: string;
  senderId?: string | null;
  templateId?: string | null;
  toPhone?: string | null;
  fromPhone?: string | null;
  status: string;
  eventType: string;
  jobId?: string;
  clientId?: string;
  workerId?: string;
  providerMessageSid?: string;
  errorReason?: string;
}) {
  await prisma.whatsAppMessageLog.create({
    data: {
      workspaceId: input.workspaceId,
      senderId: input.senderId === "env-fallback" ? null : input.senderId ?? null,
      templateId: input.templateId ?? null,
      direction: "OUTBOUND",
      messageType: "TEMPLATE",
      eventType: input.eventType,
      jobId: input.jobId,
      clientId: input.clientId,
      workerId: input.workerId,
      toPhone: input.toPhone ?? null,
      fromPhone: input.fromPhone ?? null,
      status: input.status,
      providerMessageSid: input.providerMessageSid,
      errorReason: input.errorReason,
      sentAt: input.status === "SENT" ? new Date() : null,
      failedAt: input.status === "FAILED" || input.status === "BLOCKED" ? new Date() : null,
    },
  });
}

export async function sendWhatsAppTemplate(input: WhatsAppTemplateSendInput) {
  const toPhone = normalizePhone(input.to);
  const template = await getTemplateForSend(input.workspaceId, input.templateKey);
  const sender = input.sender ?? (await getActiveSender(input.workspaceId));
  const definition = WHATSAPP_TEMPLATE_DEFINITIONS[input.templateKey];
  const channel = await messageChannelForWorkspace(input.workspaceId);
  const baseLog = {
    workspaceId: input.workspaceId,
    senderId: sender?.id ?? null,
    templateId: template?.id ?? null,
    toPhone,
    fromPhone: sender?.phoneNumber ?? null,
    eventType: input.eventType,
    jobId: input.jobId,
    clientId: input.clientId,
    workerId: input.workerId,
  };
  const variables = renderTemplateVariables(input.templateKey, input.variables);
  const namedVariables = namedVariablesOnly(input.templateKey, variables);
  const renderedBody = renderBody(template?.body ?? definition.body, namedVariables);
  const sendSmsCopy = (reason?: string) =>
    sendSms(
      toPhone,
      renderedBody,
      sender,
      {
        messageType: "SMS_TEMPLATE",
        eventType: reason ? `${input.eventType}_SMS_FALLBACK` : input.eventType,
        jobId: input.jobId,
        clientId: input.clientId,
        workerId: input.workerId,
        templateId: template?.id ?? null,
      },
      input.workspaceId
    );

  if (!(await isSettingEnabled(input.workspaceId, definition.settingKey))) {
    await logAttempt({ ...baseLog, status: "SKIPPED", errorReason: "WhatsApp setting is disabled for this event." });
    return { ok: false, skipped: true, error: "WhatsApp setting is disabled for this event." };
  }

  if (channel === "sms") {
    return await sendSmsCopy();
  }

  if (!sender) {
    await logAttempt({ ...baseLog, status: "BLOCKED", errorReason: "No active WhatsApp sender is configured." });
    if (canUseSmsFallback(channel)) return await sendSmsCopy("NO_WHATSAPP_SENDER");
    return { ok: false, error: "No active WhatsApp sender is configured." };
  }

  if (sender.status !== "ACTIVE") {
    await logAttempt({ ...baseLog, status: "BLOCKED", errorReason: `WhatsApp sender is ${sender.status}.` });
    if (canUseSmsFallback(channel)) return await sendSmsCopy("WHATSAPP_SENDER_BLOCKED");
    return { ok: false, error: `WhatsApp sender is ${sender.status}.` };
  }

  if (!template) {
    await logAttempt({ ...baseLog, status: "BLOCKED", errorReason: `Template ${input.templateKey} is not configured.` });
    if (canUseSmsFallback(channel)) return await sendSmsCopy("WHATSAPP_TEMPLATE_MISSING");
    return { ok: false, error: `Template ${input.templateKey} is not configured.` };
  }

  if (!template.isEnabled) {
    await logAttempt({ ...baseLog, status: "SKIPPED", errorReason: `Template ${input.templateKey} is disabled.` });
    if (canUseSmsFallback(channel)) return await sendSmsCopy("WHATSAPP_TEMPLATE_DISABLED");
    return { ok: false, skipped: true, error: `Template ${input.templateKey} is disabled.` };
  }

  const isProduction = process.env.NODE_ENV === "production";
  if (!templateIsApproved(template) && isProduction) {
    await logAttempt({
      ...baseLog,
      status: "BLOCKED",
      errorReason: `Template ${input.templateKey} is not approved for production sending.`,
    });
    if (canUseSmsFallback(channel)) return await sendSmsCopy("WHATSAPP_TEMPLATE_UNAPPROVED");
    return { ok: false, error: `Template ${input.templateKey} is not approved for production sending.` };
  }

  if (!template.providerTemplateSid && isProduction) {
    await logAttempt({
      ...baseLog,
      status: "BLOCKED",
      errorReason: `Template ${input.templateKey} does not have a Twilio Content SID.`,
    });
    if (canUseSmsFallback(channel)) return await sendSmsCopy("WHATSAPP_TEMPLATE_SID_MISSING");
    return { ok: false, error: `Template ${input.templateKey} does not have a Twilio Content SID.` };
  }

  try {
    const client = getTwilioClient(sender);
    const messageParams = template.providerTemplateSid
      ? {
          to: `whatsapp:${toPhone}`,
          contentSid: template.providerTemplateSid,
          contentVariables: JSON.stringify(Object.fromEntries(definition.variables.map((_, index) => [String(index + 1), variables[String(index + 1)] ?? ""]))),
          ...(sender.messagingServiceSid ? { messagingServiceSid: sender.messagingServiceSid } : { from: senderFromAddress(sender) }),
        }
      : {
          from: senderFromAddress(sender),
          to: `whatsapp:${toPhone}`,
          body: renderedBody,
        };

    const message = await client.messages.create(messageParams);
    await logAttempt({ ...baseLog, status: "SENT", providerMessageSid: message.sid });
    if (channel === "both") {
      const smsResult = await sendSmsCopy();
      return { ok: true, providerMessageSid: message.sid, sms: smsResult };
    }
    return { ok: true, providerMessageSid: message.sid };
  } catch (error) {
    const errorReason = error instanceof Error ? error.message : "Unknown WhatsApp provider error.";
    await logAttempt({ ...baseLog, status: "FAILED", errorReason });
    if (canUseSmsFallback(channel)) return await sendSmsCopy("WHATSAPP_PROVIDER_FAILED");
    return { ok: false, error: errorReason };
  }
}

function canUseSmsFallback(channel: MessageChannel) {
  return channel === "auto" || channel === "both";
}
