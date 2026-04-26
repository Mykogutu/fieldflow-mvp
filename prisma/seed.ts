/**
 * MVP-STRATEGY v2.0 §16.3 — Workspace Migration Sprint seed/backfill.
 *
 * Idempotent. Safe to run repeatedly against production.
 *
 * What it does:
 *   1. Creates the default "Restore Services" workspace (idempotent on slug).
 *   2. Backfills `workspaceId` on every existing row that still has NULL.
 *      All historical Restore data lands in the Restore workspace.
 *   3. Seeds the Restore admin user + default Settings — only if missing.
 *
 * Read once, write nothing if everything is already correct.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const RESTORE_SLUG = "restore-services";
const RESTORE_NAME = "Restore Services";

async function main() {
  // ────────────────────────────────────────────────────────────────────────
  // 1. Default workspace
  // ────────────────────────────────────────────────────────────────────────
  const workspace = await prisma.workspace.upsert({
    where: { slug: RESTORE_SLUG },
    update: {},
    create: {
      name: RESTORE_NAME,
      slug: RESTORE_SLUG,
      isActive: true,
    },
  });
  console.log(`✅ Workspace: ${workspace.name} (${workspace.id})`);

  // ────────────────────────────────────────────────────────────────────────
  // 2. Backfill workspaceId on every core model
  // ────────────────────────────────────────────────────────────────────────
  const wsId = workspace.id;
  const backfills: Array<[string, () => Promise<{ count: number }>]> = [
    ["User", () => prisma.user.updateMany({ where: { workspaceId: null }, data: { workspaceId: wsId } })],
    ["Job", () => prisma.job.updateMany({ where: { workspaceId: null }, data: { workspaceId: wsId } })],
    ["JobEvent", () => prisma.jobEvent.updateMany({ where: { workspaceId: null }, data: { workspaceId: wsId } })],
    ["Invoice", () => prisma.invoice.updateMany({ where: { workspaceId: null }, data: { workspaceId: wsId } })],
    ["Expense", () => prisma.expense.updateMany({ where: { workspaceId: null }, data: { workspaceId: wsId } })],
    ["Notification", () => prisma.notification.updateMany({ where: { workspaceId: null }, data: { workspaceId: wsId } })],
    ["Setting", () => prisma.setting.updateMany({ where: { workspaceId: null }, data: { workspaceId: wsId } })],
    ["Asset", () => prisma.asset.updateMany({ where: { workspaceId: null }, data: { workspaceId: wsId } })],
    ["Document", () => prisma.document.updateMany({ where: { workspaceId: null }, data: { workspaceId: wsId } })],
    ["WhatsAppSender", () => prisma.whatsAppSender.updateMany({ where: { workspaceId: null }, data: { workspaceId: wsId } })],
  ];

  for (const [model, op] of backfills) {
    const { count } = await op();
    if (count > 0) console.log(`   ↳ ${model}: backfilled ${count} row(s)`);
    else console.log(`   ↳ ${model}: nothing to backfill`);
  }

  // ────────────────────────────────────────────────────────────────────────
  // 3. Default admin (only if missing)
  // ────────────────────────────────────────────────────────────────────────
  const adminPhone = "+254700000000";
  const existingAdmin = await prisma.user.findUnique({ where: { phone: adminPhone } });
  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    await prisma.user.create({
      data: {
        workspaceId: wsId,
        email: "admin@fieldflow.co",
        phone: adminPhone,
        password: hashedPassword,
        name: "Admin",
        role: "ADMIN",
      },
    });
    console.log(`✅ Admin user created: ${adminPhone} / admin123`);
  } else {
    // Make sure the existing admin is attached to the workspace.
    if (!existingAdmin.workspaceId) {
      await prisma.user.update({
        where: { id: existingAdmin.id },
        data: { workspaceId: wsId },
      });
      console.log(`✅ Admin attached to workspace`);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  // 4. Default settings (only created if missing — never overwrites existing)
  // ────────────────────────────────────────────────────────────────────────
  const defaultSettings: Array<{ key: string; value: string; type: string }> = [
    { key: "company_name", value: "Restore Services", type: "string" },
    { key: "company_phone", value: "+254700000000", type: "string" },
    { key: "briefing_hour", value: "6", type: "number" },
    { key: "default_warranty_months", value: "12", type: "number" },
    {
      key: "job_types",
      value: JSON.stringify([
        "Plastic Tank Repair",
        "Water Tank Cleaning",
        "Tank Disinfection",
        "Gate Valve Installation",
        "Underground Tank Repair",
        "Steel Tank Cleaning",
        "Tank Painting",
      ]),
      type: "json",
    },
    {
      key: "zones",
      value: JSON.stringify([
        "Nairobi West",
        "Nairobi East",
        "Nairobi North",
        "Nairobi CBD",
        "Westlands",
        "Karen",
        "Eastleigh",
        "Kasarani",
      ]),
      type: "json",
    },
  ];

  for (const s of defaultSettings) {
    const existing = await prisma.setting.findUnique({ where: { key: s.key } });
    if (!existing) {
      await prisma.setting.create({
        data: { ...s, workspaceId: wsId },
      });
      console.log(`   ↳ Setting created: ${s.key}`);
    } else if (!existing.workspaceId) {
      await prisma.setting.update({
        where: { id: existing.id },
        data: { workspaceId: wsId },
      });
    }
  }

  console.log(`\n✅ Seed complete. Default workspace id: ${wsId}`);
  console.log(`   Set DEFAULT_WORKSPACE_ID=${wsId} in .env if you want to skip the lookup.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
