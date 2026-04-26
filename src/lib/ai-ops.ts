import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { formatKES, formatDate } from "@/lib/utils";

// ── Public types ──────────────────────────────────────────────────────────────

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface FollowUp {
  type: "UNPAID_INVOICE" | "UNVERIFIED_JOB" | "POSTPONED_JOB" | "WORKER_SILENT" | "CLIENT_UNRESPONSIVE";
  priority: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  whatsappDraft: string;
  clientName?: string;
}

export interface DraftJob {
  jobType?: string;
  location?: string;
  clientName?: string;
  clientPhone?: string;
  assetDescription?: string;
  notes?: string;
  missingFields: string[];
  confidence: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getModel() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

async function ai(prompt: string): Promise<string> {
  const model = getModel();
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

// ── Workspace context ─────────────────────────────────────────────────────────

export async function buildWorkspaceContext(workspaceId: string): Promise<string> {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [settings, jobs, workers, pendingInvoices] = await Promise.all([
    prisma.setting.findMany({ where: { workspaceId } }),
    prisma.job.findMany({
      where: { workspaceId, createdAt: { gte: cutoff } },
      include: {
        workers: { select: { name: true } },
        invoice: { select: { status: true, amount: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    prisma.user.findMany({
      where: { workspaceId, role: "TECHNICIAN" },
      select: { id: true, name: true, phone: true, baseZone: true },
    }),
    prisma.invoice.findMany({
      where: { workspaceId, status: "PENDING" },
      select: { invoiceNumber: true, clientName: true, clientPhone: true, amount: true, createdAt: true },
      orderBy: { createdAt: "asc" },
      take: 30,
    }),
  ]);

  const cfg = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const today = new Date().toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "full",
  });

  const jobLines = jobs.map((j) =>
    [
      `  [${j.jobNumber}] ${j.clientName} | ${j.jobType} | ${j.status}`,
      `  location: ${j.location ?? "missing"} | scheduled: ${j.scheduledDate ? formatDate(j.scheduledDate) : "none"}`,
      `  worker: ${j.workers.map((w) => w.name).join(", ") || "unassigned"} | amount: ${j.finalAmount ? formatKES(j.finalAmount) : j.quotedAmount ? `quoted ${formatKES(j.quotedAmount)}` : "no amount"} | invoice: ${j.invoice?.status ?? "none"}`,
    ].join("\n")
  );

  const invoiceLines = pendingInvoices.map(
    (i) =>
      `  ${i.invoiceNumber}: ${i.clientName} (${i.clientPhone ?? "no phone"}) — ${cfg.currency ?? "KES"} ${i.amount.toLocaleString()} | since ${formatDate(i.createdAt)}`
  );

  return `COMPANY: ${cfg.company_name ?? "This business"}
TODAY: ${today}
INDUSTRY: ${cfg.industry ?? "field services"}
CURRENCY: ${cfg.currency ?? "KES"}
WORKER TITLE: ${cfg.worker_title ?? "Technician"}

WORKERS (${workers.length}):
${workers.map((w) => `  ${w.name} | ${w.phone} | zone: ${w.baseZone ?? "any"}`).join("\n") || "  none"}

RECENT JOBS — last 30 days (${jobs.length} shown):
${jobLines.join("\n\n") || "  none"}

UNPAID INVOICES (${pendingInvoices.length}):
${invoiceLines.join("\n") || "  none"}`;
}

// ── Copilot ───────────────────────────────────────────────────────────────────

export async function answerCopilot(
  workspaceId: string,
  question: string,
  history: CopilotMessage[] = []
): Promise<string> {
  if (!process.env.GOOGLE_API_KEY) return "AI is not configured (GOOGLE_API_KEY missing).";

  try {
    const context = await buildWorkspaceContext(workspaceId);

    const historyBlock = history.length
      ? history
          .map((m) => `${m.role === "user" ? "Admin" : "Copilot"}: ${m.content}`)
          .join("\n") + "\n"
      : "";

    const prompt = `You are FieldFlow Operations Copilot — a smart, concise assistant for a field service business.
You have access to the company's live data below. Use it to answer questions accurately.
Never make up data. If something is absent from the context, say so honestly.
Keep answers short and practical. Use bullet points for lists. Do not use markdown headers.
If asked for a WhatsApp message, write it professionally and friendly.

BUSINESS DATA:
${context}

${historyBlock}Admin: ${question}
Copilot:`;

    return await ai(prompt);
  } catch (err) {
    console.error("[ai-ops] copilot error:", err);
    return "Something went wrong. Please try again.";
  }
}

// ── Daily briefing ────────────────────────────────────────────────────────────

export async function generateBriefing(
  workspaceId: string,
  type: "morning" | "evening"
): Promise<string> {
  if (!process.env.GOOGLE_API_KEY) return "AI is not configured.";

  try {
    const context = await buildWorkspaceContext(workspaceId);

    const focus =
      type === "morning"
        ? `Write a MORNING briefing for the business owner. Cover:
- Jobs scheduled today and which workers are assigned
- Jobs that still need confirmation or have missing details before dispatch
- Pending payments worth following up today
- Risks or red flags for today's work
- What the team should prioritise first`
        : `Write an EVENING briefing for the business owner. Cover:
- Jobs completed today and their outcomes
- Jobs still pending, active, or in progress
- New unpaid invoices from today
- Postponed jobs that need rescheduling
- Any worker performance notes if anything stands out
- Recommended follow-up actions for tomorrow`;

    const prompt = `You are FieldFlow Operations Copilot generating a daily briefing.
Be concise, practical, and professional. Use short bullet points. No fluff. No markdown headers.
${focus}

BUSINESS DATA:
${context}

Write the briefing now:`;

    return await ai(prompt);
  } catch (err) {
    console.error("[ai-ops] briefing error:", err);
    return "Could not generate briefing at this time.";
  }
}

// ── Follow-up suggestions ─────────────────────────────────────────────────────

export async function suggestFollowUps(workspaceId: string): Promise<FollowUp[]> {
  if (!process.env.GOOGLE_API_KEY) return [];

  try {
    const context = await buildWorkspaceContext(workspaceId);

    const prompt = `You are an operations assistant. Based on this business data, identify up to 8 follow-up actions needed today.
Focus on: unpaid invoices, unverified completed jobs, postponed jobs, workers not responding, clients needing contact.
For each follow-up return this JSON shape:
{
  "type": "UNPAID_INVOICE" | "UNVERIFIED_JOB" | "POSTPONED_JOB" | "WORKER_SILENT" | "CLIENT_UNRESPONSIVE",
  "priority": "HIGH" | "MEDIUM" | "LOW",
  "description": "one sentence",
  "whatsappDraft": "ready-to-send WhatsApp message under 160 chars",
  "clientName": "name if applicable"
}
Return ONLY a JSON array. No explanation outside the JSON.

BUSINESS DATA:
${context}`;

    const raw = (await ai(prompt)).replace(/```json|```/g, "").trim();
    return JSON.parse(raw) as FollowUp[];
  } catch (err) {
    console.error("[ai-ops] followups error:", err);
    return [];
  }
}

// ── Job intake parser ─────────────────────────────────────────────────────────

export async function parseJobIntake(
  workspaceId: string,
  message: string
): Promise<DraftJob> {
  if (!process.env.GOOGLE_API_KEY)
    return { missingFields: ["AI not configured (GOOGLE_API_KEY missing)"], confidence: 0 };

  try {
    const settings = await prisma.setting.findMany({ where: { workspaceId } });
    const cfg = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const jobTypes: string[] = cfg.job_types ? JSON.parse(cfg.job_types) : [];

    const prompt = `You are a job intake assistant for a field service company.
Convert this WhatsApp enquiry into a structured draft job.
Available job types: ${jobTypes.join(", ") || "any relevant field service type"}

Return ONLY valid JSON:
{
  "jobType": "<best match from available types or inferred type>",
  "location": "<location if mentioned, else null>",
  "clientName": "<client name if mentioned, else null>",
  "clientPhone": "<phone number if mentioned, else null>",
  "assetDescription": "<asset description e.g. 5000L plastic tank, else null>",
  "notes": "<any other relevant details, else null>",
  "missingFields": ["field name that is missing but required"],
  "confidence": 0.0-1.0
}

WhatsApp message: "${message}"`;

    const raw = (await ai(prompt)).replace(/```json|```/g, "").trim();
    return JSON.parse(raw) as DraftJob;
  } catch (err) {
    console.error("[ai-ops] intake error:", err);
    return { missingFields: ["Could not parse message — try again"], confidence: 0 };
  }
}
