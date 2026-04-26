import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { parseJobIntake } from "@/lib/ai-ops";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { message } = (await req.json()) as { message: string };
    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }
    const workspaceId = await currentWorkspaceId();
    const draft = await parseJobIntake(workspaceId, message);
    return NextResponse.json({ draft });
  } catch (err) {
    console.error("[ai/intake]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
