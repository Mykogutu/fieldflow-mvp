import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { currentWorkspaceId } from "@/lib/workspace";
import { answerCopilot, type CopilotMessage } from "@/lib/ai-ops";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  try {
    const { question, history } = (await req.json()) as {
      question: string;
      history?: CopilotMessage[];
    };
    if (!question?.trim()) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }
    const workspaceId = await currentWorkspaceId();
    const answer = await answerCopilot(workspaceId, question, history ?? []);
    return NextResponse.json({ answer });
  } catch (err) {
    console.error("[ai/chat]", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
