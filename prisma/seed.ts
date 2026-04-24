import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  await prisma.user.upsert({
    where: { phone: "+254700000000" },
    update: {},
    create: {
      email: "admin@fieldflow.co",
      phone: "+254700000000",
      password: hashedPassword,
      name: "Admin",
      role: "ADMIN",
    },
  });

  const settings = [
    { key: "company_name", value: "FieldFlow Services", type: "string" },
    { key: "company_phone", value: "+254700000000", type: "string" },
    { key: "briefing_hour", value: "6", type: "number" },
    { key: "default_warranty_months", value: "12", type: "number" },
    {
      key: "job_types",
      value: JSON.stringify([
        "Tank Repair",
        "Tank Cleaning",
        "Pipe Replacement",
        "Leak Fix",
        "General Service",
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

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value },
      create: s,
    });
  }

  console.log("✅ Seed complete. Admin: +254700000000 / admin123");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
