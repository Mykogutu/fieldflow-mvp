import { prisma } from "./prisma";
import { sendDocsToClient } from "./twilio";
import { getWorkspaceConfig } from "./workspace-config";
import type { WhatsAppSender } from "./senders";

export async function createNotification(params: {
  type: string;
  title: string;
  message: string;
  jobId?: string;
  link?: string;
}): Promise<void> {
  await prisma.notification.create({ data: params });
}

export async function deliverJobVerifiedDocs(
  jobId: string,
  companyName: string,
  sender?: WhatsAppSender | null
): Promise<void> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { invoice: true },
  });
  if (!job) return;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const invoiceUrl = job.invoice
    ? `${siteUrl}/api/invoices/${job.invoice.id}/pdf`
    : undefined;

  await sendDocsToClient(
    job.clientPhone,
    {
      clientName: job.clientName,
      invoiceUrl,
      companyName,
    },
    sender
  );
}

export async function getCompanyName(): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key: "company_name" } });
  return s?.value ?? "FieldFlow Services";
}

/**
 * Preferred accessor — returns the full workspace config for messaging.
 * Use this in new code instead of getCompanyName().
 */
export async function getWorkspace() {
  return getWorkspaceConfig();
}
