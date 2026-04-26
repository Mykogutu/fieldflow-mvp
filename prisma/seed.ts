/**
 * MVP-STRATEGY v2.0 §16.3 — Default workspace + admin seed.
 *
 * Idempotent. Safe to run repeatedly. Creates the default "Restore Services"
 * workspace, the default admin user, and the default Settings — only when
 * each is missing. Read once, write nothing if everything is already correct.
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

  const wsId = workspace.id;

  // ────────────────────────────────────────────────────────────────────────
  // 2. Default admin (only if missing)
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
    const existing = await prisma.setting.findUnique({
      where: { workspaceId_key: { workspaceId: wsId, key: s.key } },
    });
    if (!existing) {
      await prisma.setting.create({
        data: { ...s, workspaceId: wsId },
      });
      console.log(`   ↳ Setting created: ${s.key}`);
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
