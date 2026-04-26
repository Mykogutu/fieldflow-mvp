import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { suggestFollowUps } from "@/lib/ai-ops";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const workspaceId = await currentWorkspaceId();
    const followups = await suggestFollowUps(workspaceId);
    return NextResponse.json({ followups });
  } catch (err) {
    console.error("[ai/followups]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
