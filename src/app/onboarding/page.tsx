import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import OnboardingClient from "./OnboardingClient";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const workspaceId = await currentWorkspaceId();
  const [settings, user, recordCounts] = await Promise.all([
    prisma.setting.findMany({ where: { workspaceId } }),
    prisma.user.findUnique({ where: { id: session.userId }, select: { name: true, email: true, phone: true } }),
    Promise.all([
      prisma.user.count({ where: { workspaceId, role: "TECHNICIAN" } }),
      prisma.client.count({ where: { workspaceId } }),
      prisma.asset.count({ where: { workspaceId } }),
      prisma.job.count({ where: { workspaceId } }),
    ]).then(([workers, clients, assets, jobs]) => ({ workers, clients, assets, jobs })),
  ]);
  const map = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

  return <OnboardingClient settings={map} adminName={user?.name ?? "Admin"} recordCounts={recordCounts} />;
}
