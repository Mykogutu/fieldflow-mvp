import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const workspaceId = await currentWorkspaceId();
    const scope = req.nextUrl.searchParams.get("scope") ?? "full";
    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true, name: true, slug: true, createdAt: true },
    });

    const [settings, jobs, invoices, clients, workers, assets, documents, expenses] = await Promise.all([
      prisma.setting.findMany({ where: { workspaceId }, orderBy: { key: "asc" } }),
      shouldInclude(scope, ["full", "Jobs & Job Cards"])
        ? prisma.job.findMany({ where: { workspaceId }, include: { events: true, workers: { select: { id: true, name: true, phone: true, role: true } } } })
        : Promise.resolve([]),
      shouldInclude(scope, ["full", "Invoices & Expenses"])
        ? prisma.invoice.findMany({ where: { workspaceId } })
        : Promise.resolve([]),
      shouldInclude(scope, ["full", "Clients & Workers"])
        ? prisma.client.findMany({ where: { workspaceId } })
        : Promise.resolve([]),
      shouldInclude(scope, ["full", "Clients & Workers"])
        ? prisma.user.findMany({ where: { workspaceId }, select: { id: true, email: true, phone: true, name: true, role: true, baseZone: true, isActive: true, createdAt: true, updatedAt: true } })
        : Promise.resolve([]),
      shouldInclude(scope, ["full", "Jobs & Job Cards"])
        ? prisma.asset.findMany({ where: { workspaceId } })
        : Promise.resolve([]),
      shouldInclude(scope, ["full", "Jobs & Job Cards"])
        ? prisma.document.findMany({ where: { workspaceId } })
        : Promise.resolve([]),
      shouldInclude(scope, ["full", "Invoices & Expenses"])
        ? prisma.expense.findMany({ where: { workspaceId } })
        : Promise.resolve([]),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      scope,
      workspace,
      settings,
      jobs,
      invoices,
      clients,
      workers,
      assets,
      documents,
      expenses,
    };

    const fileSafeScope = scope.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "full";

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="fieldflow-${fileSafeScope}-export.json"`,
      },
    });
  } catch (error) {
    console.error("[SettingsExport]", error);
    return NextResponse.json({ error: "Unable to export workspace data." }, { status: 500 });
  }
}

function shouldInclude(scope: string, values: string[]) {
  return values.includes(scope);
}
