import { getUsers, createUser, updateUser, deleteUser } from "@/app/actions/user-actions";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import { getWorkspaceConfig } from "@/lib/workspace-config";
import WorkersClient from "./WorkersClient";

export default async function WorkersPage() {
  const workspaceId = await currentWorkspaceId();
  const [workers, zonesSetting, workspaceConfig] = await Promise.all([
    getUsers("TECHNICIAN"),
    prisma.setting.findFirst({ where: { workspaceId, key: "zones" } }),
    getWorkspaceConfig(),
  ]);
  const zones: string[] = zonesSetting?.value ? JSON.parse(zonesSetting.value) : [];
  return (
    <WorkersClient
      workers={workers}
      zones={zones}
      labels={{
        worker: workspaceConfig.workerTitle,
        workers: workspaceConfig.workerTitlePlural,
      }}
    />
  );
}
