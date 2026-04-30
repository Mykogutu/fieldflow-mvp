import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import type { JwtPayload, Role } from "@/types";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "ff_token";
const DASHBOARD_ROLES: Role[] = ["ADMIN", "MANAGER", "VIEWER"];
const OPERATOR_ROLES: Role[] = ["ADMIN", "MANAGER"];

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
  return requireRole(["ADMIN"]);
}

export async function requireDashboardAccess(): Promise<JwtPayload> {
  return requireRole(DASHBOARD_ROLES);
}

export async function requireOperator(): Promise<JwtPayload> {
  return requireRole(OPERATOR_ROLES);
}

export async function requireRole(roles: Role[]): Promise<JwtPayload> {
  const session = await getSession();
  if (!session || !roles.includes(session.role)) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function validateCredentials(
  phone: string,
  password: string
): Promise<{ userId: string; role: Role; phone: string; workspaceId: string } | null> {
  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, workspaceId: true, phone: true, password: true, role: true, isActive: true },
  });
  if (!user || !user.password || !user.isActive) return null;
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null;
  return { userId: user.id, role: user.role as Role, phone: user.phone, workspaceId: user.workspaceId };
}

export function canAccessDashboard(role: Role): boolean {
  return DASHBOARD_ROLES.includes(role);
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
