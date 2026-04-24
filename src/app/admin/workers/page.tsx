import { getUsers, createUser, updateUser, deleteUser } from "@/app/actions/user-actions";
import { prisma } from "@/lib/prisma";
import WorkersClient from "./WorkersClient";

export default async function WorkersPage() {
  const [workers, zonesSetting] = await Promise.all([
    getUsers("TECHNICIAN"),
    prisma.setting.findUnique({ where: { key: "zones" } }),
  ]);
  const zones: string[] = zonesSetting?.value ? JSON.parse(zonesSetting.value) : [];
  return <WorkersClient workers={workers} zones={zones} />;
}
