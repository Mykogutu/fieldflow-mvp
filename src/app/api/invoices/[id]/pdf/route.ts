import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateInvoicePDF } from "@/lib/pdf-generator";
import { getCompanyName } from "@/lib/notifications";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.id },
    include: { job: true },
  });

  if (!invoice) return new NextResponse("Not found", { status: 404 });

  const companyName = await getCompanyName();
  const companySetting = await prisma.setting.findUnique({ where: { key: "company_phone" } });

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
    companyPhone: companySetting?.value ?? "",
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoiceNumber}.pdf"`,
    },
  });
}
