import { getAssets, getAssetTypes } from "@/app/actions/asset-actions";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";
import AssetsClient from "./AssetsClient";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: { search?: string; type?: string };
}) {
  const workspaceId = await currentWorkspaceId();
  const [assets, knownTypes, zonesSetting] = await Promise.all([
    getAssets({ search: searchParams.search, assetType: searchParams.type }),
    getAssetTypes(),
    prisma.setting.findFirst({ where: { workspaceId, key: "zones" } }),
  ]);
  const zones: string[] = zonesSetting?.value ? JSON.parse(zonesSetting.value) : [];

  return (
    <AssetsClient
      assets={assets}
      knownTypes={knownTypes}
      zones={zones}
      currentSearch={searchParams.search}
      currentType={searchParams.type}
    />
  );
}
