import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const workspaceId = await currentWorkspaceId();
  const [settings, teamMembers, defaultSender, activeSenderCount] = await Promise.all([
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

  return <SettingsClient settings={map} teamMembers={teamMembers} whatsappSummary={whatsappSummary} />;
}
