import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const workspaceId = await currentWorkspaceId();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    settings,
    teamMembers,
    defaultSender,
    activeSenderCount,
    activeWorkerCount,
    jobsThisMonth,
    pdfsThisMonth,
    whatsappMessagesThisMonth,
  ] = await Promise.all([
    prisma.setting.findMany({ where: { workspaceId } }),
    prisma.user.findMany({
      where: { workspaceId },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    }),
    prisma.whatsAppSender.findFirst({
      where: { workspaceId, isDefault: true, status: "ACTIVE" },
      select: { displayName: true, phoneNumber: true, status: true, brandingTier: true },
    }),
    prisma.whatsAppSender.count({ where: { workspaceId, status: "ACTIVE" } }),
    prisma.user.count({ where: { workspaceId, role: "TECHNICIAN", isActive: true } }),
    prisma.job.count({ where: { workspaceId, createdAt: { gte: monthStart } } }),
    prisma.document.count({ where: { workspaceId, generatedAt: { gte: monthStart } } }),
    prisma.whatsAppMessageLog.count({ where: { workspaceId, createdAt: { gte: monthStart } } }),
  ]);
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const hasEnvFallback = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER);
  const whatsappSummary = {
    connected: Boolean(defaultSender || hasEnvFallback),
    activeSenderCount,
    displayName: defaultSender?.displayName ?? (hasEnvFallback ? "Environment fallback sender" : ""),
    phoneNumber: defaultSender?.phoneNumber ?? (hasEnvFallback ? process.env.TWILIO_WHATSAPP_NUMBER ?? "" : ""),
    status: defaultSender?.status ?? (hasEnvFallback ? "ACTIVE" : "DISCONNECTED"),
    source: defaultSender ? "Workspace sender" : hasEnvFallback ? "Environment fallback" : "Not configured",
  };
  const billingSummary = {
    planName: map.billing_plan_name ?? "Starter",
    planPrice: map.billing_plan_price ?? "Free",
    planStatus: map.billing_plan_status ?? "Active",
    workerLimit: Number.parseInt(map.plan_worker_limit ?? "3", 10) || 3,
    jobLimit: Number.parseInt(map.plan_job_limit ?? "100", 10) || 100,
    pdfLimit: Number.parseInt(map.plan_pdf_limit ?? "100", 10) || 100,
    whatsappLimit: Number.parseInt(map.plan_whatsapp_limit ?? "500", 10) || 500,
    activeWorkerCount,
    jobsThisMonth,
    pdfsThisMonth,
    whatsappMessagesThisMonth,
  };

  return <SettingsClient settings={map} teamMembers={teamMembers} whatsappSummary={whatsappSummary} billingSummary={billingSummary} />;
}
