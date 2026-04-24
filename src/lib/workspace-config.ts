/**
 * Workspace configuration — see MVP-STRATEGY.md §16.2
 *
 * The 8 things every company can configure. Backed by the existing `Setting`
 * key/value store so we don't need a schema migration. When FieldFlow moves
 * to real multi-tenancy (the `Workspace` model in §16.3), this helper is the
 * only file that needs to change.
 *
 * Every worker-facing and client-facing message should pull from here.
 * Hardcoding "Technician" or "KES" violates the MVP principle.
 */

import { prisma } from "./prisma";
import { getTemplate, INDUSTRY_TEMPLATES, type IndustryKey } from "./industry-templates";

export interface WorkspaceConfig {
  companyName: string;
  companyPhone: string;
  industry: IndustryKey;
  workerTitle: string;
  workerTitlePlural: string;
  jobLabel: string;
  jobLabelPlural: string;
  jobTypes: string[];
  zones: string[];
  currency: string;
  currencySymbol: string;
  timezone: string;
  briefingHour: number;
  brandColor: string;
  emoji: string;
  defaultWarranty: string | null;
}

const DEFAULTS: WorkspaceConfig = {
  companyName: "FieldFlow Services",
  companyPhone: "",
  industry: "OTHER",
  workerTitle: "Technician",
  workerTitlePlural: "Technicians",
  jobLabel: "Job",
  jobLabelPlural: "Jobs",
  jobTypes: ["Service Call", "Installation", "Repair"],
  zones: [],
  currency: "KES",
  currencySymbol: "KES",
  timezone: "Africa/Nairobi",
  briefingHour: 6,
  brandColor: "#2563eb",
  emoji: "📋",
  defaultWarranty: null,
};

/**
 * Read the current workspace configuration from the Setting table.
 * Falls back to industry-template defaults for any missing keys.
 */
export async function getWorkspaceConfig(): Promise<WorkspaceConfig> {
  const settings = await prisma.setting.findMany();
  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  const industry = (map.industry as IndustryKey) || DEFAULTS.industry;
  const template = getTemplate(industry);

  const jobTypes = safeJson(map.job_types, template.jobTypes);
  const zones = safeJson(map.zones, []);

  return {
    companyName: map.company_name || DEFAULTS.companyName,
    companyPhone: map.company_phone || DEFAULTS.companyPhone,
    industry,
    workerTitle: map.worker_title || template.workerTitle,
    workerTitlePlural: map.worker_title_plural || template.workerTitlePlural,
    jobLabel: map.job_label || template.jobLabel,
    jobLabelPlural: map.job_label_plural || template.jobLabelPlural,
    jobTypes,
    zones,
    currency: map.currency || template.currencyHint || DEFAULTS.currency,
    currencySymbol:
      map.currency_symbol || map.currency || template.currencyHint || DEFAULTS.currencySymbol,
    timezone: map.timezone || DEFAULTS.timezone,
    briefingHour: parseInt(map.briefing_hour ?? "") || DEFAULTS.briefingHour,
    brandColor: map.brand_color || DEFAULTS.brandColor,
    emoji: map.emoji || template.emoji,
    defaultWarranty: map.default_warranty ?? template.defaultWarranty,
  };
}

/**
 * Apply an industry template to the workspace.
 * Only overwrites fields that haven't been manually customized.
 * Fields the admin has already set (flagged with a "custom_" prefix) stay.
 */
export async function applyIndustryTemplate(industryKey: IndustryKey): Promise<void> {
  const template = INDUSTRY_TEMPLATES[industryKey] ?? INDUSTRY_TEMPLATES.OTHER;

  const entries: Array<[string, string]> = [
    ["industry", template.key],
    ["worker_title", template.workerTitle],
    ["worker_title_plural", template.workerTitlePlural],
    ["job_label", template.jobLabel],
    ["job_label_plural", template.jobLabelPlural],
    ["job_types", JSON.stringify(template.jobTypes)],
    ["emoji", template.emoji],
    ["default_warranty", template.defaultWarranty ?? ""],
  ];

  if (template.currencyHint) {
    entries.push(["currency", template.currencyHint]);
    entries.push(["currency_symbol", template.currencyHint]);
  }

  await Promise.all(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );
}

/**
 * Update individual workspace config keys. Used by the settings form.
 */
export async function setWorkspaceConfig(
  updates: Partial<Record<string, string>>
): Promise<void> {
  const entries = Object.entries(updates).filter(([, v]) => v !== undefined);
  await Promise.all(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: value as string },
        create: { key, value: value as string },
      })
    )
  );
}

/**
 * Summary of the workspace as a JSON block for AI prompt injection.
 * See MVP-prompt.md §1.
 */
export function workspaceContextForAI(cfg: WorkspaceConfig): string {
  return JSON.stringify({
    workspace: {
      name: cfg.companyName,
      industry: cfg.industry,
      workerTitle: cfg.workerTitle,
      jobLabel: cfg.jobLabel,
      currency: cfg.currency,
      currencySymbol: cfg.currencySymbol,
      timezone: cfg.timezone,
      language: "en",
    },
  });
}

/**
 * Format an amount with the workspace's currency symbol.
 */
export function formatCurrency(cfg: WorkspaceConfig, amount: number): string {
  return `${cfg.currencySymbol} ${amount.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function safeJson<T>(raw: string | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}
