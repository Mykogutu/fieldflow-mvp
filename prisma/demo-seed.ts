/**
 * Demo data seed — populates the dashboard with realistic Restore Services
 * activity so the admin UI is exercise-able without going through the full
 * WhatsApp loop. Idempotent: re-running creates nothing new.
 *
 * What it creates (only if the workspace currently has zero jobs):
 *   - 4 technicians (workers) with Kenyan names / phone numbers
 *   - 8 jobs covering the full status machine
 *     (2 ASSIGNED, 1 IN_PROGRESS, 1 POSTPONED, 1 COMPLETED_PENDING_VERIFICATION,
 *      2 VERIFIED, 1 CLOSED)
 *   - Invoices for completed/verified jobs (2 PAID, 1 PENDING)
 *   - JobEvents for each status transition
 *   - 5 unread notifications for the dashboard
 *
 * Usage: node --env-file=.env --experimental-strip-types prisma/demo-seed.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RESTORE_SLUG = "restore-services";

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function main() {
  const workspace = await prisma.workspace.findUnique({ where: { slug: RESTORE_SLUG } });
  if (!workspace) {
    throw new Error("Restore Services workspace missing — run `npm run db:seed` first.");
  }
  const wsId = workspace.id;

  // Skip job/worker/notification seeding if a previous demo run already created
  // them. Asset seeding has its own idempotency guard and runs regardless.
  const demoJobMarker = await prisma.job.findFirst({
    where: { workspaceId: wsId, clientName: "Mrs. Sarah Wanjiku" },
    select: { id: true },
  });
  if (demoJobMarker) {
    console.log(`⚠️  Demo jobs already seeded — skipping job/notification seed.`);
    await seedAssets(wsId);
    return;
  }

  // ────────────────────────────────────────────────────────────────────────
  // Workers (technicians)
  // ────────────────────────────────────────────────────────────────────────
  const workerData = [
    { name: "James Baraka", phone: "+254722111222", baseZone: "Nairobi West" },
    { name: "Peter Ouma", phone: "+254733222333", baseZone: "Westlands" },
    { name: "Mary Wairimu", phone: "+254711333444", baseZone: "Nairobi East" },
    { name: "Daniel Kiprop", phone: "+254700444555", baseZone: "Karen" },
  ];

  const workers = [];
  for (const w of workerData) {
    const existing = await prisma.user.findUnique({ where: { phone: w.phone } });
    if (existing) {
      workers.push(existing);
      continue;
    }
    const user = await prisma.user.create({
      data: {
        workspaceId: wsId,
        name: w.name,
        phone: w.phone,
        baseZone: w.baseZone,
        role: "TECHNICIAN",
        isActive: true,
      },
    });
    workers.push(user);
  }
  console.log(`✅ ${workers.length} technicians ready`);

  const [james, peter, mary, daniel] = workers;

  // ────────────────────────────────────────────────────────────────────────
  // Jobs covering the full status machine
  // ────────────────────────────────────────────────────────────────────────
  const jobSpecs = [
    // 2 ASSIGNED — dispatched today, awaiting worker accept
    {
      clientName: "Mrs. Sarah Wanjiku",
      clientPhone: "+254712345001",
      description: "5000L tank crack repair, upper section. Water leaking.",
      jobType: "Plastic Tank Repair",
      status: "ASSIGNED" as const,
      priority: "NORMAL" as const,
      location: "Kilimani, Ngong Rd",
      zone: "Nairobi West",
      scheduledDate: daysFromNow(0),
      quotedAmount: 8000,
      worker: james,
      createdAt: hoursAgo(2),
    },
    {
      clientName: "Mr. Joseph Mwangi",
      clientPhone: "+254712345002",
      description: "10000L tank cleaning + disinfection.",
      jobType: "Water Tank Cleaning",
      status: "ASSIGNED" as const,
      priority: "NORMAL" as const,
      location: "Lavington, James Gichuru Rd",
      zone: "Nairobi West",
      scheduledDate: daysFromNow(1),
      quotedAmount: 4500,
      worker: peter,
      createdAt: hoursAgo(1),
    },
    // 1 IN_PROGRESS — worker on site right now
    {
      clientName: "Mrs. Grace Achieng",
      clientPhone: "+254712345003",
      description: "Gate valve replacement on rooftop tank.",
      jobType: "Gate Valve Installation",
      status: "IN_PROGRESS" as const,
      priority: "HIGH" as const,
      location: "Westlands, Mpaka Rd",
      zone: "Westlands",
      scheduledDate: daysAgo(0),
      quotedAmount: 5500,
      worker: mary,
      createdAt: hoursAgo(6),
      lastActionAt: hoursAgo(1),
    },
    // 1 POSTPONED — client unavailable
    {
      clientName: "Mr. Kamau Njoroge",
      clientPhone: "+254712345004",
      description: "Underground tank inspection and repair.",
      jobType: "Underground Tank Repair",
      status: "POSTPONED" as const,
      priority: "NORMAL" as const,
      location: "Karen, Bogani Rd",
      zone: "Karen",
      scheduledDate: daysAgo(1),
      quotedAmount: 12000,
      postponeReason: "Client not home, gate locked",
      postponedAt: daysAgo(1),
      worker: daniel,
      createdAt: daysAgo(2),
    },
    // 1 COMPLETED_PENDING_VERIFICATION — worker reported done, awaiting OTP
    {
      clientName: "Mrs. Aisha Mohammed",
      clientPhone: "+254712345005",
      description: "Steel tank cleaning + paint touch-up.",
      jobType: "Steel Tank Cleaning",
      status: "COMPLETED_PENDING_VERIFICATION" as const,
      priority: "NORMAL" as const,
      location: "Eastleigh, 12th St",
      zone: "Eastleigh",
      scheduledDate: daysAgo(0),
      quotedAmount: 6000,
      finalAmount: 6500,
      otpCode: "847291",
      otpExpiresAt: daysFromNow(1),
      completedAt: hoursAgo(2),
      worker: james,
      createdAt: daysAgo(1),
      lastActionAt: hoursAgo(2),
    },
    // 2 VERIFIED — recently completed, paid
    {
      clientName: "Mr. David Otieno",
      clientPhone: "+254712345006",
      description: "Tank disinfection — quarterly service.",
      jobType: "Tank Disinfection",
      status: "VERIFIED" as const,
      priority: "NORMAL" as const,
      location: "Kasarani, Mwiki",
      zone: "Kasarani",
      scheduledDate: daysAgo(2),
      quotedAmount: 3500,
      finalAmount: 3500,
      completedAt: daysAgo(2),
      verifiedAt: daysAgo(2),
      worker: peter,
      createdAt: daysAgo(3),
    },
    {
      clientName: "Mrs. Lucy Mutua",
      clientPhone: "+254712345007",
      description: "5000L plastic tank repair, base seal.",
      jobType: "Plastic Tank Repair",
      status: "VERIFIED" as const,
      priority: "NORMAL" as const,
      location: "Kilimani, Wood Ave",
      zone: "Nairobi West",
      scheduledDate: daysAgo(5),
      quotedAmount: 7500,
      finalAmount: 7500,
      completedAt: daysAgo(5),
      verifiedAt: daysAgo(5),
      worker: mary,
      createdAt: daysAgo(6),
    },
    // 1 CLOSED — older completed job
    {
      clientName: "Mr. Samuel Kibet",
      clientPhone: "+254712345008",
      description: "Tank painting — UV protective coat.",
      jobType: "Tank Painting",
      status: "CLOSED" as const,
      priority: "LOW" as const,
      location: "Karen, Hardy",
      zone: "Karen",
      scheduledDate: daysAgo(15),
      quotedAmount: 9000,
      finalAmount: 9000,
      completedAt: daysAgo(15),
      verifiedAt: daysAgo(15),
      worker: daniel,
      createdAt: daysAgo(20),
    },
  ];

  let created = 0;
  let invoiceCounter = 1;
  for (const spec of jobSpecs) {
    const { worker, ...jobFields } = spec;
    const job = await prisma.job.create({
      data: {
        workspaceId: wsId,
        ...jobFields,
        workers: { connect: { id: worker.id } },
      },
    });
    created++;

    // Job events for the audit trail
    await prisma.jobEvent.create({
      data: { workspaceId: wsId, jobId: job.id, type: "JOB_CREATED", createdAt: spec.createdAt },
    });
    await prisma.jobEvent.create({
      data: { workspaceId: wsId, jobId: job.id, type: "JOB_ASSIGNED", note: `Assigned to ${worker.name}`, createdAt: spec.createdAt },
    });

    if (["IN_PROGRESS", "COMPLETED_PENDING_VERIFICATION", "VERIFIED", "CLOSED"].includes(spec.status)) {
      await prisma.jobEvent.create({
        data: { workspaceId: wsId, jobId: job.id, type: "JOB_ACCEPTED", createdAt: spec.lastActionAt ?? spec.createdAt },
      });
    }

    if (spec.status === "POSTPONED") {
      await prisma.jobEvent.create({
        data: {
          workspaceId: wsId,
          jobId: job.id,
          type: "JOB_POSTPONED",
          note: spec.postponeReason,
          createdAt: spec.postponedAt!,
        },
      });
    }

    if (["COMPLETED_PENDING_VERIFICATION", "VERIFIED", "CLOSED"].includes(spec.status)) {
      await prisma.jobEvent.create({
        data: { workspaceId: wsId, jobId: job.id, type: "JOB_COMPLETED", createdAt: spec.completedAt! },
      });

      // Invoice
      const invoiceNumber = `INV-${String(invoiceCounter++).padStart(4, "0")}`;
      const invoiceStatus = spec.status === "COMPLETED_PENDING_VERIFICATION" ? "PENDING" : "PAID";
      await prisma.invoice.create({
        data: {
          workspaceId: wsId,
          invoiceNumber,
          jobId: job.id,
          amount: spec.finalAmount ?? spec.quotedAmount ?? 0,
          status: invoiceStatus,
          clientName: spec.clientName,
          clientPhone: spec.clientPhone,
          workerName: worker.name,
          paidAt: invoiceStatus === "PAID" ? spec.verifiedAt : null,
          items: [{ description: spec.jobType, amount: spec.finalAmount ?? spec.quotedAmount ?? 0 }],
          createdAt: spec.completedAt!,
        },
      });
    }

    if (["VERIFIED", "CLOSED"].includes(spec.status)) {
      await prisma.jobEvent.create({
        data: { workspaceId: wsId, jobId: job.id, type: "JOB_VERIFIED", createdAt: spec.verifiedAt! },
      });
    }
  }
  console.log(`✅ ${created} jobs + invoices + events created`);

  // ────────────────────────────────────────────────────────────────────────
  // Notifications (unread alerts for the dashboard)
  // ────────────────────────────────────────────────────────────────────────
  const notifications = [
    {
      type: "JOB_REPORTED_DONE",
      title: "Job awaiting verification",
      message: "Mrs. Aisha Mohammed — Steel Tank Cleaning. James Baraka reported done.",
      createdAt: hoursAgo(2),
    },
    {
      type: "JOB_POSTPONED",
      title: "Job postponed",
      message: "Mr. Kamau Njoroge — Underground Tank Repair. Reason: client not home, gate locked.",
      createdAt: daysAgo(1),
    },
    {
      type: "JOB_VERIFIED",
      title: "Job verified — KES 3,500",
      message: "Mr. David Otieno paid for Tank Disinfection.",
      createdAt: daysAgo(2),
    },
    {
      type: "JOB_VERIFIED",
      title: "Job verified — KES 7,500",
      message: "Mrs. Lucy Mutua paid for Plastic Tank Repair.",
      createdAt: daysAgo(5),
    },
    {
      type: "WORKER_ACCEPTED",
      title: "Worker accepted job",
      message: "Mary Wairimu accepted Gate Valve Installation for Mrs. Grace Achieng.",
      createdAt: hoursAgo(5),
    },
  ];

  for (const n of notifications) {
    await prisma.notification.create({
      data: { workspaceId: wsId, ...n, isRead: false },
    });
  }
  console.log(`✅ ${notifications.length} notifications created`);

  await seedAssets(wsId);

  console.log(`\n✅ Demo seed complete. Visit /admin to see the dashboard come alive.`);
}

/**
 * Idempotent: creates demo assets and links them to existing demo jobs by
 * client name match. Safe to run on a workspace that already has assets —
 * skips entirely if any asset already exists.
 */
async function seedAssets(wsId: string): Promise<void> {
  const existingCount = await prisma.asset.count({ where: { workspaceId: wsId } });
  if (existingCount > 0) {
    console.log(`⚠️  ${existingCount} assets already exist — skipping asset seed.`);
    return;
  }

  // One asset per demo client. Asset names match the description in the job
  // so the relationship reads naturally on the detail page.
  const assetSpecs = [
    {
      name: "Mrs. Sarah Wanjiku's 5000L plastic tank",
      assetType: "Plastic Tank",
      identifier: "Roof-mounted, north side",
      clientName: "Mrs. Sarah Wanjiku",
      clientPhone: "+254712345001",
      location: "Kilimani, Ngong Rd",
      zone: "Nairobi West",
      installationDate: daysAgo(720),
      warrantyExpiryDate: daysAgo(355),
      lastServiceDate: hoursAgo(2),
    },
    {
      name: "Mr. Joseph Mwangi's 10000L tank",
      assetType: "Plastic Tank",
      identifier: "Ground-level reservoir",
      clientName: "Mr. Joseph Mwangi",
      clientPhone: "+254712345002",
      location: "Lavington, James Gichuru Rd",
      zone: "Nairobi West",
      installationDate: daysAgo(540),
      warrantyExpiryDate: daysFromNow(180),
    },
    {
      name: "Mrs. Grace Achieng's rooftop tank",
      assetType: "Plastic Tank",
      identifier: "Rooftop, with gate valve",
      clientName: "Mrs. Grace Achieng",
      clientPhone: "+254712345003",
      location: "Westlands, Mpaka Rd",
      zone: "Westlands",
      installationDate: daysAgo(1095),
    },
    {
      name: "Mr. Kamau Njoroge's underground tank",
      assetType: "Underground Tank",
      identifier: "Below garage floor",
      serialNumber: "UT-2023-0847",
      clientName: "Mr. Kamau Njoroge",
      clientPhone: "+254712345004",
      location: "Karen, Bogani Rd",
      zone: "Karen",
      installationDate: daysAgo(800),
      notes: "Concrete-encased, requires confined-space protocol on entry.",
    },
    {
      name: "Mrs. Aisha Mohammed's steel tank",
      assetType: "Steel Tank",
      serialNumber: "ST-9921",
      clientName: "Mrs. Aisha Mohammed",
      clientPhone: "+254712345005",
      location: "Eastleigh, 12th St",
      zone: "Eastleigh",
      installationDate: daysAgo(1500),
      lastServiceDate: hoursAgo(2),
    },
    {
      name: "Mr. David Otieno's 5000L tank",
      assetType: "Plastic Tank",
      clientName: "Mr. David Otieno",
      clientPhone: "+254712345006",
      location: "Kasarani, Mwiki",
      zone: "Kasarani",
      installationDate: daysAgo(365),
      warrantyExpiryDate: daysFromNow(90),
      lastServiceDate: daysAgo(2),
      notes: "Quarterly disinfection contract.",
    },
    {
      name: "Mrs. Lucy Mutua's 5000L tank",
      assetType: "Plastic Tank",
      clientName: "Mrs. Lucy Mutua",
      clientPhone: "+254712345007",
      location: "Kilimani, Wood Ave",
      zone: "Nairobi West",
      installationDate: daysAgo(900),
      lastServiceDate: daysAgo(5),
    },
    {
      name: "Mr. Samuel Kibet's UV-coated tank",
      assetType: "Plastic Tank",
      identifier: "Yellow UV-protective coat",
      clientName: "Mr. Samuel Kibet",
      clientPhone: "+254712345008",
      location: "Karen, Hardy",
      zone: "Karen",
      installationDate: daysAgo(1200),
      lastServiceDate: daysAgo(15),
    },
  ];

  let assetCount = 0;
  for (const spec of assetSpecs) {
    const asset = await prisma.asset.create({
      data: { workspaceId: wsId, ...spec },
    });
    assetCount++;

    // Link every job for this client to this asset
    await prisma.job.updateMany({
      where: { workspaceId: wsId, clientName: spec.clientName, assetId: null },
      data: { assetId: asset.id },
    });
  }
  console.log(`✅ ${assetCount} assets created and linked to demo jobs`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
