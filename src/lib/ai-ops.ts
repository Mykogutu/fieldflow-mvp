import "server-only";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { prisma } from "@/lib/prisma";
import { formatKES, formatDate } from "@/lib/utils";

// ── Public types ──────────────────────────────────────────────────────────────

export interface CopilotMessage {
  role: "user" | "assistant";
  content: string;
}

export interface FollowUp {
  type:
    | "UNPAID_INVOICE"
    | "OVERDUE_INVOICE"
    | "UNVERIFIED_JOB"
    | "POSTPONED_JOB"
    | "WORKER_SILENT"
    | "CLIENT_UNRESPONSIVE"
    | "EMERGENCY_JOB";
  priority: "HIGH" | "MEDIUM" | "LOW";
  description: string;
  whatsappDraft: string;
  clientName?: string;
  jobNumber?: string;
  amount?: number;
}

export interface DraftJob {
  jobType?: string;
  location?: string;
  zone?: string;
  clientName?: string;
  clientPhone?: string;
  assetDescription?: string;
  scheduledDate?: string;    // ISO date (YYYY-MM-DD) or human-readable if relative
  scheduledTime?: string;    // HH:MM 24-hour
  priority?: "EMERGENCY" | "HIGH" | "NORMAL" | "LOW";
  notes?: string;
  suggestedWorker?: string;  // worker name if mentioned in message
  missingFields: string[];
  confidence: number;        // 0.0 – 1.0
}

// ── Core AI helpers ───────────────────────────────────────────────────────────

function getModel(temperature = 0.3) {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    generationConfig: {
      temperature,
      topP: 0.8,
      maxOutputTokens: 2048,
    },
  });
}

async function ai(prompt: string, temperature = 0.3): Promise<string> {
  const model = getModel(temperature);
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

function getAIErrorMessage(error: unknown): string {
  const message =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown AI error";
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes("google_api_key not set")) {
    return "AI is not configured yet. Add a valid server-side AI key and try again.";
  }

  if (
    normalizedMessage.includes("method doesn't allow unregistered callers") ||
    normalizedMessage.includes("403 forbidden") ||
    normalizedMessage.includes("permission denied") ||
    normalizedMessage.includes("api key not valid for this api")
  ) {
    return "The AI service is rejecting the current credentials. Check the server-side API key, allowed APIs, and project permissions.";
  }

  if (normalizedMessage.includes("api key not valid") || normalizedMessage.includes("invalid api key")) {
    return "The AI service credentials are invalid. Update the server-side API key and try again.";
  }

  if (
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("resource exhausted")
  ) {
    return "The AI service is available, but this account has hit its usage limit. Check quota and billing settings, then try again.";
  }

  if (
    normalizedMessage.includes("fetch") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("econnreset") ||
    normalizedMessage.includes("etimedout") ||
    normalizedMessage.includes("socket hang up")
  ) {
    return "FieldFlow could not reach the AI service just now. Check the network connection and try again.";
  }

  return "AI could not generate a response right now. Check the server-side AI configuration and try again.";
}

function describeAIError(error: unknown) {
  const details: Record<string, unknown> = {};
  if (error instanceof Error) {
    details.name = error.name;
    details.message = error.message;
    const maybeStatus = error as Error & { status?: number; code?: string; cause?: unknown };
    if (typeof maybeStatus.status !== "undefined") details.status = maybeStatus.status;
    if (typeof maybeStatus.code !== "undefined") details.code = maybeStatus.code;
    if (maybeStatus.cause instanceof Error) {
      details.cause = { name: maybeStatus.cause.name, message: maybeStatus.cause.message };
    } else if (typeof maybeStatus.cause !== "undefined") {
      details.cause = maybeStatus.cause;
    }
    return details;
  }

  details.raw = error;
  return details;
}

/** Extract the first JSON array or object from a raw AI response */
function extractJSON(raw: string, wantArray: true): string;
function extractJSON(raw: string, wantArray: false): string;
function extractJSON(raw: string, wantArray: boolean): string {
  const cleaned = raw.replace(/```json\n?|```/g, "").trim();
  if (wantArray) {
    const start = cleaned.indexOf("[");
    const end = cleaned.lastIndexOf("]");
    if (start === -1 || end === -1) return "[]";
    return cleaned.slice(start, end + 1);
  }
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return "{}";
  return cleaned.slice(start, end + 1);
}

// ── Skill definitions ─────────────────────────────────────────────────────────

/**
 * COPILOT_SKILL — Master system prompt for the chat copilot.
 *
 * Designed to be injected before every BUSINESS DATA block.
 * Covers: role, anti-hallucination rules, domain knowledge, and response format.
 */
const COPILOT_SKILL = `
You are FieldFlow Operations Copilot — a specialist AI assistant embedded in a field service management platform.

═══════════════════════════════════════
ROLE & SCOPE
═══════════════════════════════════════
You help the business owner and admin understand and manage their field service operations.
You have exclusive, real-time access to this business's live data (provided in BUSINESS DATA below).
Your expertise: job dispatch, technician performance, invoicing, client follow-ups, OTP verification, expenses, and daily operations.

You are NOT:
• A general-purpose assistant — do not answer off-topic questions.
• A financial adviser — do not give investment or financial planning advice.
• A legal expert — do not give legal opinions.
If asked anything outside field operations, say: "I can only help with your FieldFlow operations data."

═══════════════════════════════════════
ANTI-HALLUCINATION RULES — ABSOLUTE
═══════════════════════════════════════
1. ONLY state facts explicitly present in BUSINESS DATA. Never invent or infer missing data.
2. Never fabricate: job numbers, client names, phone numbers, amounts, dates, worker names, invoice numbers.
3. If data for a question is absent, say: "I don't see that in the current data."
4. If a field is missing (e.g. amount shows "no amount"), state it as missing — never fill in a plausible value.
5. Never extrapolate trends unless you have 3+ data points to support the claim.
6. When stating counts or totals, count the actual items in the data provided — do not estimate.
7. Always specify the time period covered (e.g., "in the last 30 days", "today").
8. If asked about data older than the available window, say: "I only have data for the last 30 days."
9. Never say "approximately" or "roughly" when exact data is available.

═══════════════════════════════════════
PLATFORM KNOWLEDGE — JOB STATUSES
═══════════════════════════════════════
• ASSIGNED — Worker notified via WhatsApp. Awaiting acceptance. Follow up if >1 hour with no response.
• IN_PROGRESS — Worker accepted and is actively on the job.
• COMPLETED_PENDING_VERIFICATION — Worker texted "Done [amount]". OTP sent to client. Waiting for client to pay and share OTP. A job stuck here for >2 hours usually means the client has not paid yet.
• VERIFIED — Client shared OTP with worker who texted it back. Payment confirmed. Job card, invoice, and warranty auto-sent to client via WhatsApp.
• POSTPONED — Worker postponed with a logged reason. Must be rescheduled by admin before dispatching again.
• RESCHEDULED — New date/time set for a postponed job. Worker notified.
• DECLINED — Worker declined. Auto-reassignment triggered or pending.
• ISSUE_REPORTED — Worker flagged a problem. Requires admin decision before proceeding.
• CANCELLED — Cancelled by admin. Client notified.
• CLOSED — Fully archived after payment and document delivery.

═══════════════════════════════════════
PLATFORM KNOWLEDGE — OTP FLOW
═══════════════════════════════════════
Worker texts "Done 5000"
  → System generates 6-digit OTP
  → Client receives WhatsApp: "Service Code: 847291. Share after payment."
  → Client pays → gives OTP code to worker
  → Worker texts the 6-digit OTP
  → Job → VERIFIED | Invoice → PAID
  → Client receives: Invoice PDF, Job Card PDF, Warranty PDF

The OTP = digital client signature and payment confirmation.
A job at COMPLETED_PENDING_VERIFICATION = client likely has NOT paid yet.

═══════════════════════════════════════
PLATFORM KNOWLEDGE — INVOICE STATUSES
═══════════════════════════════════════
• PENDING — Awaiting payment.
• PARTIALLY_PAID — Partial payment received and recorded.
• PAID — Fully paid, confirmed via OTP or manual admin update.
• OVERDUE — Past due date, not yet paid.
• CANCELLED — Void, no payment expected.

═══════════════════════════════════════
PLATFORM KNOWLEDGE — PRIORITY LEVELS
═══════════════════════════════════════
• EMERGENCY — Drop everything, respond immediately.
• HIGH — Same day, urgent response needed.
• NORMAL — Standard scheduling.
• LOW — Flexible timing, no urgency.

═══════════════════════════════════════
RESPONSE FORMAT RULES
═══════════════════════════════════════
Match your format to the question type:

STATUS / LIST QUESTIONS ("which jobs", "list workers", "show pending"):
  → Open with the count: "There are X jobs..."
  → Bullet list: [JobNumber] | Client | Status | Key detail
  → Cap at 8 bullets, then: "...and X more"

FINANCIAL QUESTIONS ("revenue", "outstanding", "how much", "unpaid"):
  → Lead with the key total
  → Break down by component: collected / outstanding / overdue
  → Name the top 3 debtors if applicable
  → Always state the time period

TODAY / SCHEDULING QUESTIONS ("today's jobs", "what's happening today"):
  → Time-ordered list (earliest first)
  → Flag EMERGENCY and HIGH priority with ⚠ at the start
  → Clearly mark unconfirmed (ASSIGNED) jobs — workers haven't accepted yet

WORKER QUESTIONS ("who is available", "James's jobs"):
  → Name | Zone | Active job count
  → Flag workers who have not responded to ASSIGNED jobs

WHATSAPP MESSAGE REQUESTS ("draft a reminder", "write to client"):
  → Write as a real WhatsApp message (not as an instruction to write one)
  → Professional, warm, and friendly — Kenyan business tone
  → Under 200 characters for reminders; full message for complex follow-ups
  → Include: greeting, clear purpose, polite call-to-action

ANALYSIS / TREND QUESTIONS ("any red flags", "what's trending"):
  → Only from data you actually have
  → Cite your source: "Based on X jobs in the last 30 days..."
  → No speculation beyond the data

GENERAL QUESTIONS:
  → 2–5 bullet points, lead with the most important fact
  → No markdown headers (##, ###)
  → Use bullet points (•) for lists

STYLE RULES:
  → Be direct and concise — the admin is busy
  → Use KES for currency (not "Kenyan Shillings")
  → Use Kenyan timezone (EAT, UTC+3) for all times
  → Never open with "Certainly!", "Great question!", or similar filler
  → If there is nothing to report: "No [items] match that right now."
`.trim();

// ── Workspace context builder ─────────────────────────────────────────────────

export async function buildWorkspaceContext(workspaceId: string): Promise<string> {
  const now = new Date();
  const cutoff30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // ── Parallel DB queries ────────────────────────────────────────────────────
  const [
    settings,
    recentJobs,
    todayJobs,
    workers,
    pendingInvoices,
    overdueInvoices,
    expenses30d,
    statusCounts,
    assetCount,
  ] = await Promise.all([
    // Company configuration
    prisma.setting.findMany({ where: { workspaceId } }),

    // All jobs in the last 30 days (capped at 80 for context size)
    prisma.job.findMany({
      where: { workspaceId, createdAt: { gte: cutoff30d } },
      include: {
        workers: { select: { id: true, name: true, phone: true } },
        invoice: {
          select: { status: true, amount: true, invoiceNumber: true, paidAt: true },
        },
      },
      orderBy: { scheduledDate: "asc" },
      take: 80,
    }),

    // Jobs specifically scheduled for today
    prisma.job.findMany({
      where: {
        workspaceId,
        scheduledDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        workers: { select: { name: true } },
        invoice: { select: { status: true, amount: true } },
      },
      orderBy: { scheduledDate: "asc" },
    }),

    // Active technicians
    prisma.user.findMany({
      where: { workspaceId, role: "TECHNICIAN", isActive: true },
      select: { id: true, name: true, phone: true, baseZone: true },
    }),

    // Pending (unpaid) invoices — highest amounts first
    prisma.invoice.findMany({
      where: { workspaceId, status: "PENDING" },
      select: {
        invoiceNumber: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { amount: "desc" },
      take: 30,
    }),

    // Overdue invoices
    prisma.invoice.findMany({
      where: { workspaceId, status: "OVERDUE" },
      select: {
        invoiceNumber: true,
        clientName: true,
        clientPhone: true,
        amount: true,
        createdAt: true,
      },
      orderBy: { amount: "desc" },
      take: 20,
    }),

    // Expenses last 30 days (for financial summary)
    prisma.expense.findMany({
      where: { workspaceId, date: { gte: cutoff30d } },
      select: { amount: true, category: true },
    }),

    // Job counts by status (last 30 days)
    prisma.job.groupBy({
      by: ["status"],
      where: { workspaceId, createdAt: { gte: cutoff30d } },
      _count: { _all: true },
    }),

    // Total registered assets
    prisma.asset.count({ where: { workspaceId } }),
  ]);

  // ── Per-worker active job counts (sequential because it depends on workers) ──
  const workerJobCounts = await Promise.all(
    workers.map((w) =>
      prisma.job
        .count({
          where: {
            workspaceId,
            workers: { some: { id: w.id } },
            status: {
              in: [
                "ASSIGNED",
                "IN_PROGRESS",
                "COMPLETED_PENDING_VERIFICATION",
                "POSTPONED",
              ],
            },
          },
        })
        .then((c) => ({ ...w, activeJobs: c }))
    )
  );

  // ── Configuration ──────────────────────────────────────────────────────────
  const cfg = Object.fromEntries(settings.map((s) => [s.key, s.value]));
  const currency = cfg.currency ?? "KES";

  const zones: string[] = (() => {
    try { return cfg.zones ? JSON.parse(cfg.zones) : []; } catch { return []; }
  })();
  const jobTypes: string[] = (() => {
    try { return cfg.job_types ? JSON.parse(cfg.job_types) : []; } catch { return []; }
  })();

  const todayStr = now.toLocaleDateString("en-KE", {
    timeZone: "Africa/Nairobi",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("en-KE", {
    timeZone: "Africa/Nairobi",
    hour: "2-digit",
    minute: "2-digit",
  });

  // ── Financial aggregates ───────────────────────────────────────────────────
  const paidJobs = recentJobs.filter((j) => j.invoice?.status === "PAID");
  const paidRevenue = paidJobs.reduce((s, j) => s + (j.invoice?.amount ?? 0), 0);
  const totalPending = pendingInvoices.reduce((s, i) => s + i.amount, 0);
  const totalOverdue = overdueInvoices.reduce((s, i) => s + i.amount, 0);
  const totalExpenses = expenses30d.reduce((s, e) => s + e.amount, 0);

  const expByCat = expenses30d.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  const expBreakdown = Object.entries(expByCat)
    .sort((a, b) => b[1] - a[1])
    .map(([cat, amt]) => `${cat}: ${currency} ${amt.toLocaleString()}`)
    .join(" | ");

  // ── Status summary line ────────────────────────────────────────────────────
  const statusSummary = statusCounts
    .sort((a, b) => b._count._all - a._count._all)
    .map((s) => `${s.status}: ${s._count._all}`)
    .join("  |  ");

  // ── Today's jobs section ───────────────────────────────────────────────────
  const todayJobLines = todayJobs.map((j) => {
    const time = j.scheduledDate
      ? new Date(j.scheduledDate).toLocaleTimeString("en-KE", {
          hour: "2-digit",
          minute: "2-digit",
          timeZone: "Africa/Nairobi",
        })
      : "time TBD";
    const urgency =
      j.priority === "EMERGENCY"
        ? " ‼ EMERGENCY"
        : j.priority === "HIGH"
        ? " ⚠ HIGH"
        : "";
    const workerName =
      j.workers.map((w) => w.name).join(", ") || "UNASSIGNED";
    return `  [${j.jobNumber}] ${time} | ${j.clientName} | ${j.jobType}${urgency} | ${j.status} | worker: ${workerName} | ${j.location ?? "no location"}`;
  });

  // ── Recent jobs section (last 30 days) ────────────────────────────────────
  const recentJobLines = recentJobs.map((j) => {
    const amountStr = j.finalAmount
      ? `${currency} ${j.finalAmount.toLocaleString()}`
      : j.quotedAmount
      ? `quoted ${currency} ${j.quotedAmount.toLocaleString()}`
      : "no amount";
    const invoiceStr = j.invoice
      ? `${j.invoice.status}${j.invoice.invoiceNumber ? ` (${j.invoice.invoiceNumber})` : ""}`
      : "none";
    const postponeNote = j.postponeReason
      ? ` | postpone reason: "${j.postponeReason}"`
      : "";
    const priorityFlag =
      j.priority !== "NORMAL" ? ` [${j.priority}]` : "";

    return [
      `  [${j.jobNumber}] ${j.clientName} | ${j.jobType} | ${j.status}${priorityFlag}`,
      `  location: ${j.location ?? "missing"} | scheduled: ${j.scheduledDate ? formatDate(j.scheduledDate) : "none"}${postponeNote}`,
      `  worker: ${j.workers.map((w) => w.name).join(", ") || "unassigned"} | amount: ${amountStr} | invoice: ${invoiceStr}`,
    ].join("\n");
  });

  // ── Workers section ────────────────────────────────────────────────────────
  const workerLines = workerJobCounts.map(
    (w) =>
      `  ${w.name} | ${w.phone} | zone: ${w.baseZone ?? "any"} | active jobs: ${w.activeJobs}`
  );

  // ── Invoice sections ───────────────────────────────────────────────────────
  const pendingLines = pendingInvoices.map(
    (i) =>
      `  ${i.invoiceNumber}: ${i.clientName} (${i.clientPhone ?? "no phone"}) — ${currency} ${i.amount.toLocaleString()} | outstanding since ${formatDate(i.createdAt)}`
  );
  const overdueLines = overdueInvoices.map(
    (i) =>
      `  ${i.invoiceNumber}: ${i.clientName} (${i.clientPhone ?? "no phone"}) — ${currency} ${i.amount.toLocaleString()} | overdue since ${formatDate(i.createdAt)}`
  );

  // ── Assemble context block ─────────────────────────────────────────────────
  return [
    `── BUSINESS SNAPSHOT (${todayStr}, ${timeStr} EAT) ──`,
    `Company: ${cfg.company_name ?? "unnamed"}`,
    `Industry: ${cfg.industry ?? "field services"}  |  Currency: ${currency}  |  Worker title: ${cfg.worker_title ?? "Technician"}`,
    `Job types configured: ${jobTypes.join(", ") || "none"}`,
    `Service zones: ${zones.join(", ") || "not configured"}`,
    `Registered assets: ${assetCount}`,
    ``,
    `── TODAY'S JOBS (${todayJobs.length} scheduled) ──`,
    todayJobLines.length > 0 ? todayJobLines.join("\n") : "  None scheduled today",
    ``,
    `── JOB STATUS SUMMARY — last 30 days ──`,
    statusSummary || "  no jobs in last 30 days",
    ``,
    `── ACTIVE WORKERS (${workers.length}) ──`,
    workerLines.join("\n") || "  none",
    ``,
    `── FINANCIAL SUMMARY — last 30 days ──`,
    `Revenue collected (PAID):   ${currency} ${paidRevenue.toLocaleString()} from ${paidJobs.length} jobs`,
    `Outstanding (PENDING):      ${currency} ${totalPending.toLocaleString()} across ${pendingInvoices.length} invoices`,
    `Overdue:                    ${currency} ${totalOverdue.toLocaleString()} across ${overdueInvoices.length} invoices`,
    `Expenses:                   ${currency} ${totalExpenses.toLocaleString()} total | ${expBreakdown || "no breakdown available"}`,
    ``,
    `── PENDING (UNPAID) INVOICES (${pendingInvoices.length}) — highest first ──`,
    pendingLines.join("\n") || "  none",
    ``,
    `── OVERDUE INVOICES (${overdueInvoices.length}) ──`,
    overdueLines.join("\n") || "  none",
    ``,
    `── ALL JOBS — last 30 days (${recentJobs.length} total) ──`,
    recentJobLines.join("\n\n") || "  none",
  ].join("\n");
}

// ── Copilot (conversational chat) ────────────────────────────────────────────

export async function answerCopilot(
  workspaceId: string,
  question: string,
  history: CopilotMessage[] = []
): Promise<string> {
  if (!process.env.GOOGLE_API_KEY) return "AI is not configured yet.";

  try {
    const context = await buildWorkspaceContext(workspaceId);

    const historyBlock = history.length
      ? history
          .map((m) => `${m.role === "user" ? "Admin" : "Copilot"}: ${m.content}`)
          .join("\n") + "\n"
      : "";

    const prompt = [
      COPILOT_SKILL,
      "",
      "═══ BUSINESS DATA (live snapshot) ═══",
      context,
      "═════════════════════════════════════",
      "",
      historyBlock + `Admin: ${question}`,
      "Copilot:",
    ].join("\n");

    return await ai(prompt, 0.3);
  } catch (err) {
    console.error("[ai-ops] copilot error:", describeAIError(err));
    return getAIErrorMessage(err);
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

    const structureGuide =
      type === "morning"
        ? `Generate a MORNING BRIEFING using this structure (omit any section that has no data):

🌅 MORNING BRIEFING — [date]

📋 TODAY'S SCHEDULE — [N] job(s)
List each job: time | client | type | worker | status (flag UNCONFIRMED if ASSIGNED, flag UNASSIGNED if no worker)

⚠️ URGENT ATTENTION
List: EMERGENCY-priority jobs, unassigned jobs, jobs still POSTPONED without a new date, ISSUE_REPORTED jobs, workers with no response to ASSIGNED jobs

💳 PAYMENTS TO FOLLOW UP
List top 3 unpaid/overdue invoices by amount with client name and invoice number

🚩 RED FLAGS
Any COMPLETED_PENDING_VERIFICATION jobs >2 hours old (client likely hasn't paid), any client with 2+ postponed visits

✅ FIRST 3 ACTIONS (priority-ordered)
The 3 most impactful things to do right now, each as one concise action sentence`
        : `Generate an EVENING BRIEFING using this structure (omit any section that has no data):

🌙 EVENING BRIEFING — [date]

✅ COMPLETED TODAY
Jobs that reached VERIFIED or CLOSED today with amounts collected

⏳ STILL OPEN
Jobs still in ASSIGNED, IN_PROGRESS, or COMPLETED_PENDING_VERIFICATION as of now

💳 NEW UNPAID INVOICES TODAY
Invoices created today still in PENDING status

🔄 NEEDS RESCHEDULING
POSTPONED jobs that require a new date set by admin

📊 TODAY IN NUMBERS
Revenue collected | Jobs verified | Jobs postponed | Invoices outstanding

🔁 TOMORROW'S PRIORITIES
Top 3 follow-up tasks based on today's outcomes`;

    const prompt = [
      "You are FieldFlow Operations Copilot generating a structured daily operations briefing.",
      "RULES: Only use facts from BUSINESS DATA. Never invent data. Use short bullets. Use the emoji headers shown. No filler.",
      "If a section has no relevant data, omit it entirely.",
      "",
      structureGuide,
      "",
      "BUSINESS DATA:",
      context,
      "",
      "Write the briefing now:",
    ].join("\n");

    return await ai(prompt, 0.25);
  } catch (err) {
    console.error("[ai-ops] briefing error:", describeAIError(err));
    return getAIErrorMessage(err);
  }
}

// ── Follow-up suggestions ─────────────────────────────────────────────────────

export async function suggestFollowUps(workspaceId: string): Promise<FollowUp[]> {
  if (!process.env.GOOGLE_API_KEY) return [];

  try {
    const context = await buildWorkspaceContext(workspaceId);

    const prompt = [
      "You are a field service operations assistant identifying follow-up actions.",
      "",
      "RULES:",
      "1. Only create follow-ups for items actually present in BUSINESS DATA.",
      "2. Never fabricate client names, phone numbers, amounts, or job numbers.",
      "3. WhatsApp drafts must be under 200 characters, professional, friendly, in English.",
      "4. Priority: HIGH = overdue invoice or emergency job | MEDIUM = OTP pending >2h or invoice unpaid >7 days | LOW = soft follow-up",
      "5. Return a valid JSON array only — no text before or after the array.",
      "",
      "FOLLOW-UP TYPES TO CHECK:",
      "• UNPAID_INVOICE — PENDING invoices (prioritise oldest and largest)",
      "• OVERDUE_INVOICE — OVERDUE status invoices (always HIGH priority)",
      "• UNVERIFIED_JOB — Jobs in COMPLETED_PENDING_VERIFICATION (client OTP not submitted)",
      "• POSTPONED_JOB — Jobs in POSTPONED status without a new date",
      "• WORKER_SILENT — Jobs in ASSIGNED status with worker not responding",
      "• CLIENT_UNRESPONSIVE — Client not providing OTP after service completion",
      "• EMERGENCY_JOB — EMERGENCY priority jobs not yet VERIFIED or CLOSED",
      "",
      "Return EXACTLY this JSON shape for each item:",
      "[",
      "  {",
      '    "type": "<type from the list above>",',
      '    "priority": "HIGH" | "MEDIUM" | "LOW",',
      '    "description": "<one clear sentence about what action is needed>",',
      '    "whatsappDraft": "<ready-to-send WhatsApp message, max 200 chars, professional and friendly>",',
      '    "clientName": "<exact name from data, or null>",',
      '    "jobNumber": "<job number from data, or null>",',
      '    "amount": <number from data, or null>',
      "  }",
      "]",
      "",
      "Return up to 8 follow-ups, most important first. Return ONLY the JSON array.",
      "",
      "BUSINESS DATA:",
      context,
    ].join("\n");

    const raw = await ai(prompt, 0.1);
    const jsonStr = extractJSON(raw, true);
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? (parsed as FollowUp[]) : [];
  } catch (err) {
    console.error("[ai-ops] followups error:", describeAIError(err));
    return [];
  }
}

// ── Job intake parser ─────────────────────────────────────────────────────────

export async function parseJobIntake(
  workspaceId: string,
  message: string
): Promise<DraftJob> {
  if (!process.env.GOOGLE_API_KEY)
    return {
      missingFields: ["AI is not configured yet"],
      confidence: 0,
    };

  try {
    const [settings, clients] = await Promise.all([
      prisma.setting.findMany({ where: { workspaceId } }),
      prisma.client.findMany({
        where: { workspaceId, isActive: true },
        select: { name: true, phone: true },
        take: 50,
      }),
    ]);

    const cfg = Object.fromEntries(settings.map((s) => [s.key, s.value]));
    const jobTypes: string[] = (() => {
      try { return cfg.job_types ? JSON.parse(cfg.job_types) : []; } catch { return []; }
    })();
    const zones: string[] = (() => {
      try { return cfg.zones ? JSON.parse(cfg.zones) : []; } catch { return []; }
    })();

    const clientHint =
      clients.length > 0
        ? `\nKnown clients (match by name only, do not invent): ${clients.map((c) => `${c.name} (${c.phone})`).join(", ")}`
        : "";

    const safeMessage = message.replace(/\\/g, "\\\\").replace(/"/g, '\\"');

    const prompt = [
      "You are a job intake assistant for a field service company.",
      "Extract structured job information from the WhatsApp message below and return valid JSON.",
      "",
      "EXTRACTION RULES:",
      "1. Only extract what is explicitly stated in the message — never infer or assume.",
      "2. Phone numbers: normalize to international format (+254XXXXXXXXX for Kenyan numbers).",
      "3. Dates: convert to ISO 8601 (YYYY-MM-DD). Relative dates like 'tomorrow' stay as-is.",
      "4. Job type: match to the available types list if possible; closest match if not exact.",
      "5. Zone: match location to zones list if a clear match exists.",
      `6. Priority: detect urgency words (emergency, urgent, asap, critical → EMERGENCY or HIGH); default NORMAL.`,
      "7. Confidence: 1.0 = all required fields present | 0.7 = name + job type present | 0.4 = partial | 0.1 = very vague.",
      "8. missingFields: list required fields that are absent. Required: clientName, clientPhone, location, jobType.",
      "",
      `Available job types: ${jobTypes.join(", ") || "any relevant service type"}`,
      `Service zones: ${zones.join(", ") || "not configured"}`,
      clientHint,
      "",
      "Return ONLY valid JSON — no explanation, no markdown:",
      "{",
      '  "jobType": "<best matching job type or inferred type, or null>",',
      '  "location": "<location if mentioned, else null>",',
      '  "zone": "<matching zone if location matches a zone, else null>",',
      '  "clientName": "<client name if mentioned, else null>",',
      '  "clientPhone": "<phone normalized to +254... for Kenya, else null>",',
      '  "assetDescription": "<thing to be serviced e.g. \'5000L plastic water tank\', else null>",',
      '  "scheduledDate": "<ISO date or relative date if mentioned, else null>",',
      '  "scheduledTime": "<HH:MM 24-hour if mentioned, else null>",',
      '  "priority": "<EMERGENCY|HIGH|NORMAL|LOW>",',
      '  "notes": "<other relevant details not captured above, else null>",',
      '  "suggestedWorker": "<worker name if mentioned, else null>",',
      '  "missingFields": ["<required fields that are absent>"],',
      '  "confidence": <0.0 to 1.0>',
      "}",
      "",
      `WhatsApp message: "${safeMessage}"`,
    ].join("\n");

    const raw = await ai(prompt, 0.1);
    const jsonStr = extractJSON(raw, false);
    if (jsonStr === "{}") {
      return {
        missingFields: ["Could not parse message — please try rephrasing"],
        confidence: 0,
      };
    }
    return JSON.parse(jsonStr) as DraftJob;
  } catch (err) {
    console.error("[ai-ops] intake error:", describeAIError(err));
    return {
      missingFields: ["Could not parse message — please try again"],
      confidence: 0,
    };
  }
}
