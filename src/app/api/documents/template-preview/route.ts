import { NextRequest, NextResponse } from "next/server";
import { canAccessDashboard, getSession } from "@/lib/auth";
import { generateDocumentTemplateSamplePDF, renderDocumentTemplateHtml } from "@/lib/document-templates";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !canAccessDashboard(session.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = await currentWorkspaceId();
    const type = req.nextUrl.searchParams.get("type") ?? "invoice";
    const format = req.nextUrl.searchParams.get("format") ?? "html";
    const settings = await prisma.setting.findMany({ where: { workspaceId } });
    const map = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

    if (format === "pdf") {
      const pdf = generateDocumentTemplateSamplePDF(type, map);
      const fileName = `${type.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "document"}-sample.pdf`;
      return new NextResponse(Buffer.from(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${fileName}"`,
        },
      });
    }

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
