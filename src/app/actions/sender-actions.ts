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
  return prisma.whatsAppSender.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });
}

export async function createSender(input: SenderInput) {
  const phoneNumber = normalizePhone(input.phoneNumber);
  if (!phoneNumber || !input.displayName || !input.twilioAccountSid || !input.twilioAuthToken) {
    throw new Error("phoneNumber, displayName, and Twilio credentials are required");
  }

  // If this is the first sender, force it to be the default.
  const existingCount = await prisma.whatsAppSender.count();
  const shouldBeDefault = input.isDefault || existingCount === 0;

  // Only one default at a time.
  if (shouldBeDefault) {
    await prisma.whatsAppSender.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });
  }

  const sender = await prisma.whatsAppSender.create({
    data: {
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
  await prisma.whatsAppSender.updateMany({
    where: { isDefault: true },
    data: { isDefault: false },
  });
  await prisma.whatsAppSender.update({
    where: { id },
    data: { isDefault: true },
  });
  revalidatePath("/admin/settings/whatsapp");
}

export async function deleteSender(id: string) {
  await prisma.whatsAppSender.delete({ where: { id } });
  revalidatePath("/admin/settings/whatsapp");
}
