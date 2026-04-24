import { NextResponse } from "next/server";
import { clearCookie } from "@/lib/auth";

export async function POST() {
  clearCookie();
  return NextResponse.json({ ok: true });
}
