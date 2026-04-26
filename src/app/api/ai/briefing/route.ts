import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { generateBriefing } from "@/lib/ai-ops";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const type = (req.nextUrl.searchParams.get("type") ?? "morning") as
    | "morning"
    | "evening";

  try {
    const workspaceId = await currentWorkspaceId();
    const briefing = await generateBriefing(workspaceId, type);
    return NextResponse.json({ briefing });
  } catch (err) {
    console.error("[ai/briefing]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
