import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getDefaultSender } from "@/lib/senders";
import { sendWhatsApp } from "@/lib/twilio";
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

    const message = String(body?.message || "FieldFlow test message. Your WhatsApp sender is working.");
    const sent = await sendWhatsApp(phone, message, sender, { messageType: "TEST" });

    if (!sent) {
      return NextResponse.json({ error: "WhatsApp provider rejected the test message." }, { status: 502 });
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
