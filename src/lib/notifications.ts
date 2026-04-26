import { prisma } from "./prisma";
import { sendDocsToClient } from "./twilio";
import { getWorkspaceConfig } from "./workspace-config";
import { currentWorkspaceId } from "./workspace";
import type { WhatsAppSender } from "./senders";

export async function createNotification(params: {
  type: string;
  title: string;
  message: string;
  jobId?: string;
  link?: string;
}): Promise<void> {
  const workspaceId = await currentWorkspaceId();
  await prisma.notification.create({ data: { ...params, workspaceId } });
}

export async function deliverJobVerifiedDocs(
  jobId: string,
  companyName: string,
  sender?: WhatsAppSender | null
): Promise<void> {
  const workspaceId = await currentWorkspaceId();
  const job = await prisma.job.findFirst({
    where: { id: jobId, workspaceId },
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
  const workspaceId = await currentWorkspaceId();
  const s = await prisma.setting.findFirst({ where: { workspaceId, key: "company_name" } });
  return s?.value ?? "FieldFlow Services";
}

/**
 * Preferred accessor — returns the full workspace config for messaging.
 * Use this in new code instead of getCompanyName().
 */
export async function getWorkspace() {
  return getWorkspaceConfig();
}
