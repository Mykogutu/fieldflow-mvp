import { getUsers, createUser, updateUser, deleteUser } from "@/app/actions/user-actions";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import WorkersClient from "./WorkersClient";

export default async function WorkersPage() {
  const workspaceId = await currentWorkspaceId();
  const [workers, zonesSetting] = await Promise.all([
    getUsers("TECHNICIAN"),
    prisma.setting.findFirst({ where: { workspaceId, key: "zones" } }),
  ]);
  const zones: string[] = zonesSetting?.value ? JSON.parse(zonesSetting.value) : [];
  return <WorkersClient workers={workers} zones={zones} />;
}
