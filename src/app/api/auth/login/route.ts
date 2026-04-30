import { NextRequest, NextResponse } from "next/server";
import { validateCredentials, signToken, canAccessDashboard } from "@/lib/auth";
import { normalizePhone } from "@/lib/utils";
import { z } from "zod";

const schema = z.object({
  phone: z.string().min(9),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  try {
    const phone = normalizePhone(parsed.data.phone);
    const user = await validateCredentials(phone, parsed.data.password);

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (!canAccessDashboard(user.role)) {
      return NextResponse.json({ error: "Workers use WhatsApp and do not need dashboard access." }, { status: 403 });
    }

    const token = signToken({ userId: user.userId, role: user.role, phone: user.phone, workspaceId: user.workspaceId });
    const response = NextResponse.json({ ok: true });
    response.cookies.set("ff_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err) {
    console.error("[Login]", err);
    return NextResponse.json({ error: "Server error. Check database connection." }, { status: 500 });
  }
}
