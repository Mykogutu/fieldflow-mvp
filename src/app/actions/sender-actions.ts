"use server";

/**
 * WhatsApp sender admin actions — see MVP-STRATEGY.md §17
 *
 * One workspace can have many senders (region, brand, service line). The
 * webhook router resolves an inbound message's `To` field against this table
 * to pick the right one.
 */

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";
import { currentWorkspaceId } from "@/lib/workspace";
import type { BrandingTier } from "@prisma/client";

export interface SenderInput {
  phoneNumber: string;
  displayName: string;
  twilioAccountSid: string;
  twilioAuthToken: string;
  brandingTier: BrandingTier;
  wabaId?: string;
  profilePhotoUrl?: string;
  isDefault?: boolean;
}

export async function getSenders() {
  const workspaceId = await currentWorkspaceId();
  return prisma.whatsAppSender.findMany({
    where: { workspaceId },
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function createSender(input: SenderInput) {
  const workspaceId = await currentWorkspaceId();
  const phoneNumber = normalizePhone(input.phoneNumber);
  if (!phoneNumber || !input.displayName || !input.twilioAccountSid || !input.twilioAuthToken) {
    throw new Error("phoneNumber, displayName, and Twilio credentials are required");
  }

  // If this is the workspace's first sender, force it to be the default.
  const existingCount = await prisma.whatsAppSender.count({ where: { workspaceId } });
  const shouldBeDefault = input.isDefault || existingCount === 0;

  // Only one default at a time per workspace.
  if (shouldBeDefault) {
    await prisma.whatsAppSender.updateMany({
      where: { workspaceId, isDefault: true },
      data: { isDefault: false },
    });
  }

  const sender = await prisma.whatsAppSender.create({
    data: {
      workspaceId,
      phoneNumber,
      displayName: input.displayName,
      twilioAccountSid: input.twilioAccountSid,
      twilioAuthToken: input.twilioAuthToken,
      brandingTier: input.brandingTier,
      wabaId: input.wabaId ?? null,
      profilePhotoUrl: input.profilePhotoUrl ?? null,
      isDefault: shouldBeDefault,
      status: "ACTIVE",
    },
  });

  revalidatePath("/admin/settings/whatsapp");
  return sender;
}

export async function setDefaultSender(id: string) {
  const workspaceId = await currentWorkspaceId();
  await prisma.whatsAppSender.updateMany({
    where: { workspaceId, isDefault: true },
    data: { isDefault: false },
  });
  const result = await prisma.whatsAppSender.updateMany({
    where: { id, workspaceId },
    data: { isDefault: true },
  });
  if (result.count === 0) throw new Error("Sender not found");
  revalidatePath("/admin/settings/whatsapp");
}

export async function deleteSender(id: string) {
  const workspaceId = await currentWorkspaceId();
  await prisma.whatsAppSender.deleteMany({ where: { id, workspaceId } });
  revalidatePath("/admin/settings/whatsapp");
}
