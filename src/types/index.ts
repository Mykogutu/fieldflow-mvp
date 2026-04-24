export type Role = "ADMIN" | "TECHNICIAN";

export type JobStatus =
  | "ASSIGNED"
  | "IN_PROGRESS"
  | "POSTPONED"
  | "RESCHEDULED"
  | "COMPLETED_PENDING_VERIFICATION"
  | "VERIFIED"
  | "CLOSED"
  | "DECLINED"
  | "ISSUE_REPORTED"
  | "CANCELLED";

export type Priority = "EMERGENCY" | "HIGH" | "NORMAL" | "LOW";
export type InvoiceStatus = "PENDING" | "PAID" | "CANCELLED";
export type ExpenseCategory =
  | "MATERIALS"
  | "TRANSPORT"
  | "FUEL"
  | "TOOLS"
  | "LABOR"
  | "OTHER";

export interface JwtPayload {
  userId: string;
  role: Role;
  phone: string;
}

export interface AIResponse {
  intent:
    | "ACCEPT_JOB"
    | "DECLINE_JOB"
    | "REPORT_COMPLETION"
    | "SUBMIT_OTP"
    | "POSTPONE_JOB"
    | "CHECK_IN"
    | "REPORT_ISSUE"
    | "CHECK_SCHEDULE"
    | "CHECK_EARNINGS"
    | "UNDO"
    | "UNKNOWN";
  data: {
    amount?: number;
    clientName?: string;
    otpCode?: string;
    selectionIndex?: number;
    postponeReason?: string;
    rawText?: string;
  };
  confidence: number;
}

export interface WorkerScore {
  workerId: string;
  workerName: string;
  score: number;
  reasons: string[];
}

export interface InvoiceItem {
  description: string;
  amount: number;
}
