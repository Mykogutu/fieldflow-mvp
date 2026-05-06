import { jsPDF } from "jspdf";

export type TemplateDocumentType =
  | "INVOICE"
  | "JOB_CARD"
  | "WARRANTY_CERTIFICATE"
  | "COMPLETION_CERTIFICATE"
  | "QUOTATION"
  | "INSTALLATION_REPORT"
  | "SERVICE_REPORT"
  | "FUEL_CALIBRATION_REPORT"
  | "DEVICE_REPLACEMENT_REPORT"
  | "CLIENT_CONFIRMATION_RECEIPT"
  | "DELIVERY_NOTE"
  | "COMPLIANCE_CERTIFICATE"
  | "OTHER";

export const DOCUMENT_TEMPLATE_DEFINITIONS: Record<
  TemplateDocumentType,
  { title: string; subtitle: string; sections: string[] }
> = {
  INVOICE: {
    title: "Invoice",
    subtitle: "Billing, payment status, and job line items",
    sections: ["Client", "Job", "Line Items", "Payment", "Notes"],
  },
  JOB_CARD: {
    title: "Job Card",
    subtitle: "Complete work record with service code verification",
    sections: ["Client", "Job", "Worker", "Timeline", "Financial", "Client Verification"],
  },
  WARRANTY_CERTIFICATE: {
    title: "Warranty Certificate",
    subtitle: "Warranty terms issued after verification",
    sections: ["Client", "Asset", "Coverage", "Terms", "Verification"],
  },
  COMPLETION_CERTIFICATE: {
    title: "Completion Certificate",
    subtitle: "Formal proof that the service was completed and accepted",
    sections: ["Client", "Service Scope", "Completion Details", "Worker", "Client Confirmation"],
  },
  QUOTATION: {
    title: "Quotation",
    subtitle: "Pre-job estimate with scope, line items, and approval terms",
    sections: ["Client", "Scope", "Line Items", "Terms", "Approval"],
  },
  INSTALLATION_REPORT: {
    title: "Installation Report",
    subtitle: "Installation details and commissioning notes",
    sections: ["Client", "Asset", "Installation", "Readings", "Worker", "Client Verification"],
  },
  SERVICE_REPORT: {
    title: "Service Report",
    subtitle: "Operational record of work completed on site",
    sections: ["Client", "Service", "Findings", "Actions Taken", "Recommendations"],
  },
  FUEL_CALIBRATION_REPORT: {
    title: "Fuel Calibration Report",
    subtitle: "Calibration readings for fuel monitoring jobs",
    sections: ["Vehicle", "Device", "Calibration Points", "Variance", "Technician"],
  },
  DEVICE_REPLACEMENT_REPORT: {
    title: "Device Replacement Report",
    subtitle: "Removed and installed device audit trail",
    sections: ["Client", "Asset", "Removed Device", "New Device", "Reason", "Verification"],
  },
  CLIENT_CONFIRMATION_RECEIPT: {
    title: "Client Confirmation Receipt",
    subtitle: "Service-code-based client signature and payment acknowledgement",
    sections: ["Client", "Job", "Amount", "Service Code", "Verified At"],
  },
  DELIVERY_NOTE: {
    title: "Delivery Note",
    subtitle: "Proof of delivery, handover, or service visit",
    sections: ["Client", "Items", "Location", "Received By", "Signature"],
  },
  COMPLIANCE_CERTIFICATE: {
    title: "Compliance Certificate",
    subtitle: "Formal proof for regulated service categories",
    sections: ["Client", "Scope", "Standard", "Inspector", "Certification"],
  },
  OTHER: {
    title: "Document",
    subtitle: "General FieldFlow document template",
    sections: ["Client", "Job", "Details", "Notes", "Verification"],
  },
};

export const SETTINGS_DOC_TO_TEMPLATE: Record<string, TemplateDocumentType> = {
  invoice: "INVOICE",
  job_card: "JOB_CARD",
  warranty: "WARRANTY_CERTIFICATE",
  completion_certificate: "COMPLETION_CERTIFICATE",
  quotation: "QUOTATION",
  service_report: "SERVICE_REPORT",
  installation_report: "INSTALLATION_REPORT",
  fuel_calibration_report: "FUEL_CALIBRATION_REPORT",
  device_replacement_report: "DEVICE_REPLACEMENT_REPORT",
  client_confirmation_receipt: "CLIENT_CONFIRMATION_RECEIPT",
  delivery_note: "DELIVERY_NOTE",
  compliance_certificate: "COMPLIANCE_CERTIFICATE",
};

const TEMPLATE_TO_SETTINGS_DOC = Object.fromEntries(
  Object.entries(SETTINGS_DOC_TO_TEMPLATE).map(([key, value]) => [value, key])
) as Record<TemplateDocumentType, string>;

function resolveTemplateType(type: string): TemplateDocumentType {
  return (type.toUpperCase() in DOCUMENT_TEMPLATE_DEFINITIONS
    ? type.toUpperCase()
    : SETTINGS_DOC_TO_TEMPLATE[type] ?? "OTHER") as TemplateDocumentType;
}

function resolveDocumentConfig(
  type: TemplateDocumentType,
  settings: Record<string, string>
): Record<string, unknown> {
  try {
    const config = JSON.parse(settings.document_type_config || "{}") as Record<string, Record<string, unknown>>;
    return config[TEMPLATE_TO_SETTINGS_DOC[type]] ?? {};
  } catch {
    return {};
  }
}

export function renderDocumentTemplateHtml(
  type: string,
  settings: Record<string, string>,
  data: Record<string, string> = {}
): string {
  const templateType = resolveTemplateType(type);
  const definition = DOCUMENT_TEMPLATE_DEFINITIONS[templateType] ?? DOCUMENT_TEMPLATE_DEFINITIONS.OTHER;
  const config = resolveDocumentConfig(templateType, settings);
  const companyName = settings.company_name || "FieldFlow";
  const brandColor = config.useBrandColor === false ? "#0F172A" : settings.brand_color || "#2563EB";
  const currency = settings.currency || "KES";
  const footer = String(config.footerText || settings.pdf_footer || `${companyName} - ${settings.company_phone || ""}`);
  const terms = String(config.defaultTerms || settings.default_warranty || "Generated from your configured FieldFlow document template.");
  const sample = {
    clientName: "Mrs. Aisha Mohamed",
    clientPhone: "+254712345005",
    jobType: data.jobType || "Water Tank Cleaning",
    assetName: data.assetName || "Rooftop 5000L tank",
    workerName: data.workerName || "James Baraka",
    location: data.location || "Eastleigh, 12th St",
    invoiceNumber: "INV-0001",
    jobNumber: "JOB-2026-0847",
    amount: `${currency} 6,500`,
    serviceCode: "847291",
    verifiedAt: "29 Apr 2026, 14:47",
  };

  const sectionMarkup = definition.sections
    .map(
      (section) => `
        <section class="block">
          <div class="block-title">${escapeHtml(section)}</div>
          <div class="grid">
            <div><span>Client</span><strong>${escapeHtml(sample.clientName)}</strong></div>
            <div><span>Job</span><strong>${escapeHtml(sample.jobType)}</strong></div>
            <div><span>Asset</span><strong>${escapeHtml(sample.assetName)}</strong></div>
            <div><span>Worker</span><strong>${escapeHtml(sample.workerName)}</strong></div>
          </div>
        </section>`
    )
    .join("");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(definition.title)} Preview</title>
    <style>
      :root { --brand: ${brandColor}; --ink: #0f172a; --muted: #64748b; --line: #e2e8f0; --soft: #f8fafc; }
      * { box-sizing: border-box; }
      body { margin: 0; background: #eef2f7; color: var(--ink); font-family: Arial, sans-serif; }
      .page { width: 210mm; min-height: 297mm; margin: 24px auto; background: white; box-shadow: 0 24px 80px rgba(15,23,42,.18); }
      .header { background: var(--brand); color: white; padding: 32px 38px; display: flex; justify-content: space-between; gap: 24px; }
      .brand { display: flex; align-items: center; gap: 14px; }
      .logo { width: 48px; height: 48px; border-radius: 14px; background: rgba(255,255,255,.18); display: grid; place-items: center; font-weight: 900; }
      h1 { margin: 0; font-size: 30px; letter-spacing: 0; }
      .subtitle { margin: 6px 0 0; color: rgba(255,255,255,.78); font-size: 13px; }
      .meta { text-align: right; font-size: 12px; line-height: 1.7; color: rgba(255,255,255,.88); }
      .content { padding: 34px 38px; }
      .summary { border: 1px solid var(--line); border-radius: 14px; padding: 18px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; background: var(--soft); }
      .summary span, .grid span { display: block; color: var(--muted); font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
      .summary strong, .grid strong { font-size: 14px; }
      .block { margin-top: 22px; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
      .block-title { padding: 12px 16px; border-bottom: 1px solid var(--line); background: #f8fafc; font-size: 12px; font-weight: 900; text-transform: uppercase; color: #334155; }
      .grid { padding: 16px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .verification { margin-top: 22px; border: 2px solid var(--brand); border-radius: 14px; padding: 16px; display: flex; justify-content: space-between; align-items: center; }
      .code { font-size: 24px; font-weight: 900; color: var(--brand); }
      .terms { margin-top: 22px; border: 1px solid var(--line); border-radius: 14px; padding: 16px; color: var(--muted); font-size: 12px; line-height: 1.6; }
      .terms strong { display: block; color: var(--ink); margin-bottom: 4px; }
      .terms p { margin: 0; }
      .footer { padding: 18px 38px; border-top: 1px solid var(--line); color: var(--muted); font-size: 11px; display: flex; justify-content: space-between; }
      @media print { body { background: white; } .page { margin: 0; box-shadow: none; } }
    </style>
  </head>
  <body>
    <main class="page">
      <header class="header">
        <div class="brand">
          <div class="logo">${escapeHtml(companyName.charAt(0).toUpperCase())}</div>
          <div>
            <h1>${escapeHtml(companyName)}</h1>
            <p class="subtitle">${escapeHtml(definition.title)} - ${escapeHtml(definition.subtitle)}</p>
          </div>
        </div>
        <div class="meta">
          <div>${escapeHtml(sample.invoiceNumber)}</div>
          <div>${escapeHtml(sample.jobNumber)}</div>
          <div>${escapeHtml(settings.company_phone || "")}</div>
        </div>
      </header>
      <div class="content">
        <div class="summary">
          <div><span>Client</span><strong>${escapeHtml(sample.clientName)}</strong></div>
          <div><span>Location</span><strong>${escapeHtml(sample.location)}</strong></div>
          <div><span>Amount</span><strong>${escapeHtml(sample.amount)}</strong></div>
        </div>
        ${sectionMarkup}
        <div class="verification">
          <div>
            <span>Client verification</span>
            <strong>OTP confirmed at ${escapeHtml(sample.verifiedAt)}</strong>
          </div>
          <div class="code">${escapeHtml(sample.serviceCode)}</div>
        </div>
        <section class="terms">
          <strong>Default terms</strong>
          <p>${escapeHtml(terms)}</p>
        </section>
      </div>
      <footer class="footer">
        <span>${escapeHtml(footer)}</span>
        <span>Generated by FieldFlow</span>
      </footer>
    </main>
  </body>
</html>`;
}

export function generateDocumentTemplateSamplePDF(
  type: string,
  settings: Record<string, string>
): Uint8Array {
  const templateType = resolveTemplateType(type);
  const definition = DOCUMENT_TEMPLATE_DEFINITIONS[templateType] ?? DOCUMENT_TEMPLATE_DEFINITIONS.OTHER;
  const config = resolveDocumentConfig(templateType, settings);
  const companyName = settings.company_name || "FieldFlow";
  const companyPhone = settings.company_phone || "";
  const brandColor = config.useBrandColor === false ? "#0F172A" : settings.brand_color || "#2563EB";
  const footer = String(config.footerText || settings.pdf_footer || `${companyName}${companyPhone ? ` - ${companyPhone}` : ""}`);
  const terms = String(config.defaultTerms || settings.default_warranty || "");
  const [r, g, b] = hexToRgb(brandColor);
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  doc.setFillColor(r, g, b);
  doc.rect(0, 0, 210, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(companyName, 14, 13);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(companyPhone || "Document preview", 14, 22);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(definition.title.toUpperCase(), 196, 13, { align: "right" });

  let y = 42;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(definition.subtitle, 14, y);
  y += 10;

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(10, y, 190, 24, 3, 3, "FD");
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text("CLIENT", 16, y + 8);
  doc.text("JOB", 78, y + 8);
  doc.text("AMOUNT", 142, y + 8);
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Mrs. Aisha Mohamed", 16, y + 16);
  doc.text("Water Tank Cleaning", 78, y + 16);
  doc.text(`${settings.currency || "KES"} 6,500`, 142, y + 16);
  y += 34;

  for (const section of definition.sections) {
    if (y > 252) {
      doc.addPage();
      y = 18;
    }
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(10, y, 190, 22, 3, 3, "FD");
    doc.setTextColor(r, g, b);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(section.toUpperCase(), 16, y + 8);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text("Template section with workspace-aware fields and sample content.", 16, y + 16);
    y += 28;
  }

  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.6);
  doc.roundedRect(10, y, 190, 18, 3, 3);
  doc.setTextColor(r, g, b);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("CLIENT VERIFICATION", 16, y + 7);
  doc.text("847291", 190, y + 11, { align: "right" });
  y += 26;

  if (terms && y < 270) {
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(10, y, 190, 16, 3, 3);
    doc.setTextColor(71, 85, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(terms, 16, y + 7, { maxWidth: 178 });
  }

  doc.setTextColor(100, 116, 139);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.text(footer || "Generated by FieldFlow", 14, 286);

  return doc.output("arraybuffer") as unknown as Uint8Array;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "").trim();
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return [37, 99, 235];
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
