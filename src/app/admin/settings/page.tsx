import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  const workspaceId = await currentWorkspaceId();
  const settings = await prisma.setting.findMany({ where: { workspaceId } });
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  return <SettingsClient settings={map} />;
}
