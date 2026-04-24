import { GoogleGenerativeAI } from "@google/generative-ai";
import type { AIResponse } from "@/types";
import type { WorkspaceConfig } from "./workspace-config";

const ACCEPT_RE = /^(accept|yes|confirm|ok|sure|taking|sawa|ndio|nchukue|nitafanya)/i;
const DECLINE_RE = /^(decline|reject|no|cant|busy|siwezi|hapana|sitaweza)/i;
const OTP_RE = /^\s*(\d{6})\s*$/;
const DONE_RE = /\b(done|finished|complete|nimemaliza|nimerudi|maliza)\b/i;
const DONE_AMOUNT_RE = /(?:done|finished|complete|nimemaliza)\s+(?:(\w+)\s+)?(\d{3,6})/i;
const AMOUNT_ONLY_RE = /^\s*(\d{3,6})\s*$/;
const POSTPONE_RE = /\b(postpone|reschedule|delay|siwezi|later|kesho|nja|postpone)\b/i;
const UNDO_RE = /\b(undo|mistake|wrong|cancel last|nilifanya kosa)\b/i;
const ARRIVED_RE = /\b(arrived|on site|here|nimefika|niko site|niko)\b/i;
const SCHEDULE_RE = /\b(schedule|my jobs|today|ratiba|kazi zangu)\b/i;
const EARNINGS_RE = /\b(earnings|my pay|how much|pesa yangu|malipo)\b/i;
const ISSUE_RE = /\b(problem|issue|help|shida|tatizo|sos)\b/i;
const INDEX_RE = /^([1-9])$/;

export function parseIntentRegex(text: string): AIResponse | null {
  const t = text.trim();

  const otpMatch = t.match(OTP_RE);
  if (otpMatch) {
    return { intent: "SUBMIT_OTP", data: { otpCode: otpMatch[1] }, confidence: 1.0 };
  }

  if (ACCEPT_RE.test(t)) {
    const idxMatch = t.match(/\b([1-9])\b/);
    return {
      intent: "ACCEPT_JOB",
      data: { selectionIndex: idxMatch ? parseInt(idxMatch[1]) - 1 : undefined },
      confidence: 0.98,
    };
  }

  if (DECLINE_RE.test(t)) {
    return { intent: "DECLINE_JOB", data: {}, confidence: 0.95 };
  }

  if (UNDO_RE.test(t)) {
    return { intent: "UNDO", data: {}, confidence: 0.97 };
  }

  if (ARRIVED_RE.test(t)) {
    return { intent: "CHECK_IN", data: {}, confidence: 0.97 };
  }

  const doneAmount = t.match(DONE_AMOUNT_RE);
  if (doneAmount) {
    return {
      intent: "REPORT_COMPLETION",
      data: {
        clientName: doneAmount[1] || undefined,
        amount: parseInt(doneAmount[2]),
      },
      confidence: 0.99,
    };
  }

  if (DONE_RE.test(t)) {
    const amtMatch = t.match(/\b(\d{3,6})\b/);
    return {
      intent: "REPORT_COMPLETION",
      data: { amount: amtMatch ? parseInt(amtMatch[1]) : undefined },
      confidence: 0.96,
    };
  }

  const amtOnly = t.match(AMOUNT_ONLY_RE);
  if (amtOnly) {
    return {
      intent: "REPORT_COMPLETION",
      data: { amount: parseInt(amtOnly[1]) },
      confidence: 0.7,
    };
  }

  if (POSTPONE_RE.test(t)) {
    const reasonPart = t.replace(POSTPONE_RE, "").replace(/^[\s\-—:]+/, "").trim();
    return {
      intent: "POSTPONE_JOB",
      data: { postponeReason: reasonPart || undefined },
      confidence: 0.95,
    };
  }

  if (ISSUE_RE.test(t)) {
    return { intent: "REPORT_ISSUE", data: { rawText: t }, confidence: 0.9 };
  }

  if (SCHEDULE_RE.test(t)) {
    return { intent: "CHECK_SCHEDULE", data: {}, confidence: 0.92 };
  }

  if (EARNINGS_RE.test(t)) {
    return { intent: "CHECK_EARNINGS", data: {}, confidence: 0.92 };
  }

  if (INDEX_RE.test(t)) {
    return {
      intent: "ACCEPT_JOB",
      data: { selectionIndex: parseInt(t) - 1 },
      confidence: 0.65,
    };
  }

  return null;
}

export async function parseIntentAI(
  text: string,
  workspace?: WorkspaceConfig
): Promise<AIResponse> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) return { intent: "UNKNOWN", data: { rawText: text }, confidence: 0 };

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const wsBlock = workspace
      ? `\nWORKSPACE CONTEXT (use this vocabulary in your reasoning — do not echo it back):
{
  "workerTitle": "${workspace.workerTitle}",
  "jobLabel":    "${workspace.jobLabel}",
  "currency":    "${workspace.currency}",
  "industry":    "${workspace.industry}"
}
`
      : "";

    const prompt = `You are the intent parser for FieldFlow, a WhatsApp-native field service platform.
Classify this worker message into exactly one intent and extract params.
Return ONLY valid JSON.${wsBlock}
Message: "${text}"

Valid intents: ACCEPT_JOB, DECLINE_JOB, REPORT_COMPLETION, SUBMIT_OTP, POSTPONE_JOB, CHECK_IN, REPORT_ISSUE, CHECK_SCHEDULE, CHECK_EARNINGS, UNDO, UNKNOWN

Schema:
{
  "intent": "<intent>",
  "confidence": 0.0-1.0,
  "data": {
    "amount": <number if REPORT_COMPLETION>,
    "clientName": "<string if named client>",
    "otpCode": "<6-digit string if SUBMIT_OTP>",
    "selectionIndex": <0-based index if selecting a job>,
    "postponeReason": "<reason if POSTPONE_JOB>",
    "rawText": "<original text if UNKNOWN>"
  }
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(raw);
    return parsed as AIResponse;
  } catch {
    return { intent: "UNKNOWN", data: { rawText: text }, confidence: 0 };
  }
}

export async function parseIntent(
  text: string,
  workspace?: WorkspaceConfig
): Promise<AIResponse> {
  const fast = parseIntentRegex(text);
  if (fast && fast.confidence >= 0.9) return fast;
  const ai = await parseIntentAI(text, workspace);
  if (ai.confidence >= 0.6) return ai;
  return fast ?? { intent: "UNKNOWN", data: { rawText: text }, confidence: 0 };
}
