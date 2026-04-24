import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { JwtPayload } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "ff_token";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<JwtPayload | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

export async function requireAdmin(): Promise<JwtPayload> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function validateCredentials(
  phone: string,
  password: string
): Promise<{ userId: string; role: "ADMIN" | "TECHNICIAN"; phone: string } | null> {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, phone: true, password: true, role: true, isActive: true },
  });
  if (!user || !user.password || !user.isActive) return null;
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
  return { userId: user.id, role: user.role as "ADMIN" | "TECHNICIAN", phone: user.phone };
}

export function setCookieToken(token: string) {
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export function clearCookie() {
  cookies().set(COOKIE_NAME, "", { maxAge: 0, path: "/" });
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
