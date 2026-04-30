import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getTemplate, type DocumentType } from "@/lib/industry-templates";
import { prisma } from "@/lib/prisma";
import { currentWorkspaceId } from "@/lib/workspace";

type DataAction = "clear_job_history" | "reset_settings";

const CONFIRMATIONS: Record<DataAction, string> = {
  clear_job_history: "DELETE JOB HISTORY",
  reset_settings: "RESET SETTINGS",
};

const documentKeyMap: Record<DocumentType, string> = {
  Invoice: "invoice",
  Warranty: "warranty",
  DeliveryNote: "delivery_note",
  Certificate: "completion_certificate",
  ServiceReport: "service_report",
  InstallationCertificate: "installation_report",
};

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const workspaceId = await currentWorkspaceId();
    const body = await req.json().catch(() => null);
    const action = body?.action as DataAction | undefined;
    const confirmation = String(body?.confirmation ?? "").trim();

    if (!action || !(action in CONFIRMATIONS)) {
      return NextResponse.json({ error: "Unsupported data action." }, { status: 400 });
    }

    if (confirmation !== CONFIRMATIONS[action]) {
      return NextResponse.json({ error: `Type ${CONFIRMATIONS[action]} to confirm.` }, { status: 400 });
    }

    if (action === "clear_job_history") {
      return clearJobHistory(workspaceId);
    }

    return resetWorkspaceSettings(workspaceId);
  } catch (error) {
    console.error("[SettingsDataAction]", error);
    return NextResponse.json({ error: "Unable to complete data action." }, { status: 500 });
  }
}

async function clearJobHistory(workspaceId: string) {
  const jobs = await prisma.job.findMany({
    where: { workspaceId },
    select: { id: true },
  });
  const jobIds = jobs.map((job) => job.id);

  if (jobIds.length === 0) {
    return NextResponse.json({ ok: true, message: "No job history to delete.", deletedJobs: 0 });
  }

  await prisma.$transaction([
    prisma.document.deleteMany({ where: { workspaceId, jobId: { in: jobIds } } }),
    prisma.invoice.deleteMany({ where: { workspaceId, jobId: { in: jobIds } } }),
    prisma.notification.deleteMany({ where: { workspaceId, jobId: { in: jobIds } } }),
    prisma.jobEvent.deleteMany({ where: { workspaceId, jobId: { in: jobIds } } }),
    prisma.expense.updateMany({ where: { workspaceId, jobId: { in: jobIds } }, data: { jobId: null } }),
    prisma.whatsAppMessageLog.updateMany({ where: { workspaceId, jobId: { in: jobIds } }, data: { jobId: null } }),
    prisma.job.deleteMany({ where: { workspaceId, id: { in: jobIds } } }),
  ]);

  return NextResponse.json({
    ok: true,
    message: `Deleted ${jobIds.length} job${jobIds.length === 1 ? "" : "s"} and related job history.`,
    deletedJobs: jobIds.length,
  });
}

async function resetWorkspaceSettings(workspaceId: string) {
  const existing = await prisma.setting.findMany({ where: { workspaceId } });
  const map = Object.fromEntries(existing.map((setting) => [setting.key, setting.value]));
  const template = getTemplate(map.industry);
  const enabledDocuments = Array.from(
    new Set(["invoice", "job_card", ...template.defaultDocuments.map((doc) => documentKeyMap[doc])])
  );

  const resetValues: Array<{ key: string; value: string; type?: string }> = [
    { key: "industry", value: template.key },
    { key: "worker_title", value: template.workerTitle },
    { key: "worker_title_plural", value: template.workerTitlePlural },
    { key: "job_label", value: template.jobLabel },
    { key: "job_label_plural", value: template.jobLabelPlural },
    { key: "asset_label", value: template.key === "TANK_SERVICES" ? "Tank" : template.key === "FUEL_TRACKER" ? "Vehicle" : "Asset" },
    { key: "asset_label_plural", value: template.key === "TANK_SERVICES" ? "Tanks" : template.key === "FUEL_TRACKER" ? "Vehicles" : "Assets" },
    { key: "client_label", value: template.key === "FUEL_TRACKER" ? "Fleet Client" : "Client" },
    { key: "client_label_plural", value: template.key === "FUEL_TRACKER" ? "Fleet Clients" : "Clients" },
    { key: "job_types", value: JSON.stringify(template.jobTypes), type: "json" },
    { key: "zones", value: JSON.stringify([]), type: "json" },
    { key: "enabled_documents", value: JSON.stringify(enabledDocuments), type: "json" },
    { key: "document_send_whatsapp", value: "true", type: "boolean" },
    { key: "document_send_email", value: "false", type: "boolean" },
    { key: "document_store_dashboard", value: "true", type: "boolean" },
    { key: "default_warranty", value: template.defaultWarranty ?? "" },
    { key: "currency", value: template.currencyHint ?? map.currency ?? "KES" },
    { key: "currency_symbol", value: template.currencyHint ?? map.currency_symbol ?? "KES" },
    { key: "timezone", value: map.timezone ?? "Africa/Nairobi" },
    { key: "brand_color", value: "#2563EB" },
    { key: "show_logo_on_docs", value: "true", type: "boolean" },
    { key: "brand_color_header", value: "true", type: "boolean" },
    { key: "include_otp_stamp", value: "true", type: "boolean" },
    { key: "show_company_name_in_messages", value: "true", type: "boolean" },
    { key: "show_powered_by", value: "true", type: "boolean" },
    { key: "briefing_enabled", value: "true", type: "boolean" },
    { key: "briefing_time", value: "06:00" },
    { key: "sla_alerts", value: "true", type: "boolean" },
    { key: "sla_hours", value: "24" },
    { key: "onboarding_complete", value: "false", type: "boolean" },
    { key: "onboarding_step", value: "1" },
  ];

  await prisma.$transaction(
    resetValues.map((setting) =>
      prisma.setting.upsert({
        where: { workspaceId_key: { workspaceId, key: setting.key } },
        update: { value: setting.value, type: setting.type ?? "string" },
        create: { workspaceId, key: setting.key, value: setting.value, type: setting.type ?? "string" },
      })
    )
  );

  return NextResponse.json({
    ok: true,
    message: "Workspace settings reset. Onboarding has been reopened so the setup can be reviewed.",
  });
}
