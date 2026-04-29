export type TemplateDocumentType =
  | "INVOICE"
  | "JOB_CARD"
  | "WARRANTY_CERTIFICATE"
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
    subtitle: "Complete work record with OTP verification",
    sections: ["Client", "Job", "Worker", "Timeline", "Financial", "Client Verification"],
  },
  WARRANTY_CERTIFICATE: {
    title: "Warranty Certificate",
    subtitle: "Warranty terms issued after verification",
    sections: ["Client", "Asset", "Coverage", "Terms", "Verification"],
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
    subtitle: "OTP-based client signature and payment acknowledgement",
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
  completion_certificate: "CLIENT_CONFIRMATION_RECEIPT",
  quotation: "OTHER",
  service_report: "SERVICE_REPORT",
  installation_report: "INSTALLATION_REPORT",
  fuel_calibration_report: "FUEL_CALIBRATION_REPORT",
  device_replacement_report: "DEVICE_REPLACEMENT_REPORT",
  client_confirmation_receipt: "CLIENT_CONFIRMATION_RECEIPT",
  delivery_note: "DELIVERY_NOTE",
  compliance_certificate: "COMPLIANCE_CERTIFICATE",
};

export function renderDocumentTemplateHtml(
  type: string,
  settings: Record<string, string>,
  data: Record<string, string> = {}
): string {
  const templateType = (type.toUpperCase() in DOCUMENT_TEMPLATE_DEFINITIONS
    ? type.toUpperCase()
    : SETTINGS_DOC_TO_TEMPLATE[type] ?? "OTHER") as TemplateDocumentType;
  const definition = DOCUMENT_TEMPLATE_DEFINITIONS[templateType] ?? DOCUMENT_TEMPLATE_DEFINITIONS.OTHER;
  const companyName = settings.company_name || "FieldFlow";
  const brandColor = settings.brand_color || "#2563EB";
  const currency = settings.currency || "KES";
  const footer = settings.pdf_footer || `${companyName} - ${settings.company_phone || ""}`;
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
      </div>
      <footer class="footer">
        <span>${escapeHtml(footer)}</span>
        <span>Generated by FieldFlow</span>
      </footer>
    </main>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
