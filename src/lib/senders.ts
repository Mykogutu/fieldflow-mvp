/**
 * Sender registry — see MVP-STRATEGY.md §17
 *
 * The Facebook-style invariant: one codebase routes to many WhatsApp senders.
 * The `To` field on an inbound webhook tells us which sender (and therefore
 * which workspace) the message is for. We then build a Twilio client scoped
 * to that sender's subaccount credentials and reply from the same number.
 *
 * In single-tenant deployments today, the DB has zero `WhatsAppSender` rows
 * and we fall back to the env-var sender. The moment you provision a second
 * number for a second workspace, the routing layer Just Works™ — no code
 * changes required.
 */

import twilio from "twilio";
import type { Twilio } from "twilio";
import { prisma } from "./prisma";
import { normalizePhone } from "./utils";
import { currentWorkspaceId } from "./workspace";
import type { WhatsAppSender, BrandingTier, SenderStatus } from "@prisma/client";

// Re-export so callers don't need to depend on @prisma/client directly.
export type { WhatsAppSender, BrandingTier, SenderStatus };

/**
 * Virtual sender used when no DB row matches and we have to fall back to
 * the env-var-configured sender (single-tenant deployments). Shape-compatible
 * with the Prisma `WhatsAppSender` model so call sites don't have to branch.
 */
function envFallbackSender(): WhatsAppSender | null {
  const phone = process.env.TWILIO_WHATSAPP_NUMBER;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!phone || !sid || !token) return null;

  return {
    id: "env-fallback",
    workspaceId: null,
    phoneNumber: normalizePhone(phone),
    twilioAccountSid: sid,
    twilioAuthToken: token,
    wabaId: null,
    displayName: process.env.NEXT_PUBLIC_BRAND_NAME ?? "FieldFlow",
    profilePhotoUrl: null,
    brandingTier: "SHARED" as BrandingTier,
    status: "ACTIVE" as SenderStatus,
    isVerified: false,
    isDefault: true,
    createdAt: new Date(0),
    updatedAt: new Date(0),
  };
}

/**
 * Look up the sender that received the inbound message. The webhook's
 * Twilio `To` field is normalized and matched against `WhatsAppSender.phoneNumber`.
 *
 * Returns the env-fallback sender when no DB row matches — preserves
 * single-tenant behavior on installs that haven't provisioned senders yet.
 */
export async function resolveSenderByNumber(
  phoneNumber: string
): Promise<WhatsAppSender | null> {
  const normalized = normalizePhone(phoneNumber);

  const row = await prisma.whatsAppSender.findUnique({
    where: { phoneNumber: normalized },
  });
  if (row && row.status === "ACTIVE") return row;

  // Fall back: if the env-var sender matches the inbound `To`, use it.
  const env = envFallbackSender();
  if (env && env.phoneNumber === normalized) return env;

  // Last resort: in dev / single-tenant, just return the env sender even if
  // the number doesn't match (Twilio sandbox numbers move around).
  return env;
}

/**
 * The default sender for outbound-only flows (daily briefings, cron jobs,
 * anything not triggered by an inbound webhook). Picks the first sender
 * marked `isDefault=true`, then any ACTIVE sender, then env fallback.
 */
export async function getDefaultSender(
  workspaceId?: string | null
): Promise<WhatsAppSender | null> {
  // Resolve to the current workspace when caller doesn't supply one.
  const wsId = workspaceId === undefined ? await currentWorkspaceId() : workspaceId;
  const where = wsId === null ? {} : { workspaceId: wsId };

  const preferred = await prisma.whatsAppSender.findFirst({
    where: { ...where, isDefault: true, status: "ACTIVE" },
  });
  if (preferred) return preferred;

  const anyActive = await prisma.whatsAppSender.findFirst({
    where: { ...where, status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
  });
  if (anyActive) return anyActive;

  return envFallbackSender();
}

/**
 * Construct a Twilio client scoped to a given sender's subaccount credentials.
 * Cached per-account-sid so we're not re-instantiating on every message.
 */
const clientCache = new Map<string, Twilio>();

export function getTwilioClient(sender: WhatsAppSender): Twilio {
  const cached = clientCache.get(sender.twilioAccountSid);
  if (cached) return cached;
  const client = twilio(sender.twilioAccountSid, sender.twilioAuthToken);
  clientCache.set(sender.twilioAccountSid, client);
  return client;
}

/**
 * Format the WhatsApp `from` field from a sender.
 */
export function senderFromAddress(sender: WhatsAppSender): string {
  return `whatsapp:${sender.phoneNumber}`;
}

/**
 * MVP-STRATEGY §17.4 — the growth-loop footer.
 *
 * SHARED-tier messages get a "Powered by FieldFlow" tail with an upgrade link.
 * MANAGED and BYO_WABA senders return the body untouched.
 */
export function applyBrandingFooter(
  sender: WhatsAppSender,
  body: string
): string {
  if (sender.brandingTier !== "SHARED") return body;
  const upgradeUrl =
    process.env.NEXT_PUBLIC_UPGRADE_URL ??
    `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://fieldflow.app"}/upgrade`;
  return `${body}\n\n— Powered by FieldFlow · Get your own branded number → ${upgradeUrl}`;
}
