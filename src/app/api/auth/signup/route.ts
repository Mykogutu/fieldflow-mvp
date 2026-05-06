import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { hashPassword, signToken } from "@/lib/auth";
import { getTemplate, type DocumentType } from "@/lib/industry-templates";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/utils";

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2),
    businessName: z.string().trim().min(2),
    phone: z.string().trim().min(9),
    email: z.string().trim().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    industry: z.string().trim().min(2),
    country: z.string().trim().min(2),
    referral: z.string().trim().optional(),
    acceptedTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.acceptedTerms, {
    message: "Please accept the terms to continue",
    path: ["acceptedTerms"],
  });

const documentKeyMap: Record<DocumentType, string> = {
  Invoice: "invoice",
  Warranty: "warranty",
  DeliveryNote: "delivery_note",
  Certificate: "completion_certificate",
  ServiceReport: "service_report",
  InstallationCertificate: "installation_report",
};

const assetHints: Record<string, [string, string]> = {
  TANK_SERVICES: ["Tank", "Tanks"],
  FUEL_TRACKER: ["Vehicle", "Vehicles"],
  SOLAR: ["Installation", "Installations"],
  LOGISTICS: ["Vehicle", "Vehicles"],
};

const clientHints: Record<string, [string, string]> = {
  FUEL_TRACKER: ["Fleet Client", "Fleet Clients"],
  LOGISTICS: ["Fleet Client", "Fleet Clients"],
};

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "workspace"
  );
}

async function uniqueWorkspaceSlug(name: string): Promise<string> {
  const base = slugify(name);
  for (let i = 0; i < 50; i += 1) {
    const slug = i === 0 ? base : `${base}-${i + 1}`;
    const existing = await prisma.workspace.findUnique({ where: { slug }, select: { id: true } });
    if (!existing) return slug;
  }
  return `${base}-${Date.now()}`;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = signupSchema.safeParse(body);

  if (!parsed.success) {
    const firstError = parsed.error.issues[0]?.message ?? "Please check the signup details.";
    return NextResponse.json({ error: firstError }, { status: 400 });
  }

  const data = parsed.data;
  const phone = normalizePhone(data.phone);
  const template = getTemplate(data.industry);
  const [assetLabel, assetLabelPlural] = assetHints[template.key] ?? ["Asset", "Assets"];
  const [clientLabel, clientLabelPlural] = clientHints[template.key] ?? ["Client", "Clients"];
  const enabledDocuments = Array.from(
    new Set(["invoice", "job_card", ...template.defaultDocuments.map((doc) => documentKeyMap[doc])])
  );
  const documentTypeConfig = Object.fromEntries(
    enabledDocuments.map((key) => [
      key,
      {
        templateLabel: `${key.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())} - Standard`,
        generationTrigger: key === "quotation" ? "Before job approval" : "After client verification",
        deliveryChannels: ["whatsapp", "dashboard"],
        includeLogo: true,
        useBrandColor: true,
        includeOtpStamp: ["job_card", "client_confirmation_receipt"].includes(key),
        autoSendAfterVerification: key !== "quotation",
        storeInDashboard: true,
      },
    ])
  );

  try {
    const slug = await uniqueWorkspaceSlug(data.businessName);
    const passwordHash = await hashPassword(data.password);

    const result = await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: data.businessName,
          slug,
        },
      });

      const user = await tx.user.create({
        data: {
          workspaceId: workspace.id,
          email: data.email.toLowerCase(),
          phone,
          password: passwordHash,
          name: data.fullName,
          role: "ADMIN",
          isActive: true,
        },
        select: {
          id: true,
          role: true,
          phone: true,
          workspaceId: true,
        },
      });

      const settings: Array<{ key: string; value: string; type?: string }> = [
        { key: "company_name", value: data.businessName },
        { key: "support_email", value: data.email.toLowerCase() },
        { key: "company_phone", value: phone },
        { key: "business_location", value: data.country },
        { key: "country", value: data.country },
        { key: "signup_referral", value: data.referral ?? "" },
        { key: "industry", value: template.key },
        { key: "worker_title", value: template.workerTitle },
        { key: "worker_title_plural", value: template.workerTitlePlural },
        { key: "job_label", value: template.jobLabel },
        { key: "job_label_plural", value: template.jobLabelPlural },
        { key: "asset_label", value: assetLabel },
        { key: "asset_label_plural", value: assetLabelPlural },
        { key: "client_label", value: clientLabel },
        { key: "client_label_plural", value: clientLabelPlural },
        { key: "job_types", value: JSON.stringify(template.jobTypes), type: "json" },
        { key: "zones", value: JSON.stringify([]), type: "json" },
        { key: "enabled_documents", value: JSON.stringify(enabledDocuments), type: "json" },
        { key: "document_type_config", value: JSON.stringify(documentTypeConfig), type: "json" },
        { key: "document_send_whatsapp", value: "true", type: "boolean" },
        { key: "document_send_email", value: "false", type: "boolean" },
        { key: "document_store_dashboard", value: "true", type: "boolean" },
        { key: "default_warranty", value: template.defaultWarranty ?? "" },
        { key: "currency", value: template.currencyHint ?? "KES" },
        { key: "currency_symbol", value: template.currencyHint ?? "KES" },
        { key: "timezone", value: "Africa/Nairobi" },
        { key: "brand_color", value: "#2563EB" },
        { key: "show_logo_on_docs", value: "true", type: "boolean" },
        { key: "brand_color_header", value: "true", type: "boolean" },
        { key: "include_otp_stamp", value: "true", type: "boolean" },
        { key: "briefing_enabled", value: "true", type: "boolean" },
        { key: "briefing_time", value: "06:00" },
        { key: "whatsapp_job_assignment_notifications", value: "true", type: "boolean" },
        { key: "whatsapp_service_code_messages", value: "true", type: "boolean" },
        { key: "whatsapp_document_delivery", value: "true", type: "boolean" },
        { key: "whatsapp_reassignment_alerts", value: "true", type: "boolean" },
        { key: "whatsapp_client_notifications", value: "true", type: "boolean" },
        { key: "whatsapp_quotation_sending", value: "true", type: "boolean" },
        { key: "whatsapp_setup_mode", value: "shared" },
        { key: "onboarding_complete", value: "false", type: "boolean" },
        { key: "onboarding_step", value: "1" },
      ];

      await tx.setting.createMany({
        data: settings.map((setting) => ({
          workspaceId: workspace.id,
          key: setting.key,
          value: setting.value,
          type: setting.type ?? "string",
        })),
      });

      return { user, workspace };
    });

    const token = signToken({
      userId: result.user.id,
      role: result.user.role,
      phone: result.user.phone,
      workspaceId: result.user.workspaceId,
    });

    const response = NextResponse.json({ ok: true, redirect: "/onboarding" });
    response.cookies.set("ff_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "An account with that phone number or email already exists." },
        { status: 409 }
      );
    }

    console.error("[Signup]", error);
    return NextResponse.json({ error: "Signup failed. Please try again." }, { status: 500 });
  }
}
