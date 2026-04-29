import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const workspaceId = await currentWorkspaceId();
    const body = await req.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid onboarding data" }, { status: 400 });
    }

    const settings = body.settings && typeof body.settings === "object" ? body.settings : {};
    const step = typeof body.step === "number" ? String(body.step) : "1";
    const complete = body.complete === true;

    const entries = Object.entries(settings)
      .filter(([key, value]) => typeof key === "string" && value !== undefined && value !== null)
      .map(([key, value]) => [key, typeof value === "string" ? value : JSON.stringify(value)] as const);

    await prisma.$transaction([
      ...entries.map(([key, value]) =>
        prisma.setting.upsert({
          where: { workspaceId_key: { workspaceId, key } },
          update: { value },
          create: { workspaceId, key, value },
        })
      ),
      prisma.setting.upsert({
        where: { workspaceId_key: { workspaceId, key: "onboarding_step" } },
        update: { value: complete ? "complete" : step },
        create: { workspaceId, key: "onboarding_step", value: complete ? "complete" : step },
      }),
      prisma.setting.upsert({
        where: { workspaceId_key: { workspaceId, key: "onboarding_complete" } },
        update: { value: complete ? "true" : "false", type: "boolean" },
        create: { workspaceId, key: "onboarding_complete", value: complete ? "true" : "false", type: "boolean" },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Onboarding]", error);
    return NextResponse.json({ error: "Unable to save onboarding." }, { status: 500 });
  }
}
