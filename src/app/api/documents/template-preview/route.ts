import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { renderDocumentTemplateHtml } from "@/lib/document-templates";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const workspaceId = await currentWorkspaceId();
    const type = req.nextUrl.searchParams.get("type") ?? "invoice";
    const settings = await prisma.setting.findMany({ where: { workspaceId } });
    const map = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
    const html = renderDocumentTemplateHtml(type, map);

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("[TemplatePreview]", error);
    return NextResponse.json({ error: "Unable to render template preview." }, { status: 500 });
  }
}
