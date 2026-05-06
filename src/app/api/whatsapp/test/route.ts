import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDefaultSender } from "@/lib/senders";
import { sendWhatsAppTemplate } from "@/lib/whatsapp-templates";
import { normalizePhone } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const workspaceId = await currentWorkspaceId();
    const body = await req.json().catch(() => null);
    const phone = normalizePhone(String(body?.phone ?? ""));

    if (!phone) {
      return NextResponse.json({ error: "Enter a valid phone number." }, { status: 400 });
    }

    const sender = await getDefaultSender(workspaceId);
    if (!sender) {
      return NextResponse.json({ error: "No active WhatsApp sender is configured." }, { status: 400 });
    }

    const senderWorkspaceId = sender.id === "env-fallback" ? workspaceId : sender.workspaceId;

    const sent = await sendWhatsAppTemplate({
      workspaceId: senderWorkspaceId,
      templateKey: "JOB_ASSIGNED_WORKER",
      to: phone,
      sender,
      eventType: "TEST",
      variables: {
        worker_name: "FieldFlow Test",
        job_type: "Template Test",
        client_name: "Pilot Client",
        location: "Nairobi",
        scheduled_time: "Today",
      },
    });

    if (!sent.ok) {
      return NextResponse.json({ error: sent.error ?? "WhatsApp provider rejected the test message." }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      sender: {
        phoneNumber: sender.phoneNumber,
        displayName: sender.displayName,
        status: sender.status,
      },
    });
  } catch (error) {
    console.error("[WhatsApp test]", error);
    return NextResponse.json({ error: "Unable to send WhatsApp test message." }, { status: 500 });
  }
}
