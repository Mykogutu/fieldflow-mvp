import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { getCompanyName } from "@/lib/notifications";
import { currentWorkspaceId } from "@/lib/workspace";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const workspaceId = await currentWorkspaceId();

  const invoice = await prisma.invoice.findFirst({
    where: { id: params.id, workspaceId },
    include: { job: true },
  });

  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const companyName = await getCompanyName();
  const settings = await prisma.setting.findMany({
    where: { workspaceId, key: { in: ["company_phone", "brand_color", "pdf_footer"] } },
  });
  const settingsMap = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));

  const pdfBytes = generateInvoicePDF({
    invoiceNumber: invoice.invoiceNumber,
    jobNumber: invoice.job.jobNumber,
    clientName: invoice.clientName,
    clientPhone: invoice.clientPhone,
    workerName: invoice.workerName ?? "—",
    jobType: invoice.job.jobType,
    description: invoice.job.description ?? undefined,
    location: invoice.job.location ?? undefined,
    amount: invoice.amount,
    items: invoice.items as { description: string; amount: number }[] | undefined,
    createdAt: invoice.createdAt,
    companyName,
    companyPhone: settingsMap.company_phone ?? "",
    brandColor: settingsMap.brand_color,
    footerText: settingsMap.pdf_footer,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
