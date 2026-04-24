export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("254")) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10)
    return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`;
  return `+${digits}`;
}

export function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString("en-KE")}`;
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateInvoiceNumber(seq: number): string {
  return `INV-${String(seq).padStart(4, "0")}`;
}

export function generateJobCardNumber(seq: number): string {
  const year = new Date().getFullYear();
  return `JC-${year}-${String(seq).padStart(4, "0")}`;
}

export function otpExpiresAt(): Date {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  return d;
}

export function formatDate(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-KE", {
    timeZone: "Africa/Nairobi",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function isWithin15Min(date: Date | null): boolean {
  if (!date) return false;
  return Date.now() - new Date(date).getTime() < 15 * 60 * 1000;
}

export function statusLabel(status: string): string {
  const map: Record<string, string> = {
    ASSIGNED: "Assigned",
    IN_PROGRESS: "In Progress",
    POSTPONED: "Postponed",
    RESCHEDULED: "Rescheduled",
    COMPLETED_PENDING_VERIFICATION: "Awaiting Verification",
    VERIFIED: "Verified",
    CLOSED: "Closed",
    DECLINED: "Declined",
    ISSUE_REPORTED: "Issue Reported",
    CANCELLED: "Cancelled",
  };
  return map[status] ?? status;
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    ASSIGNED: "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    POSTPONED: "bg-orange-100 text-orange-700",
    RESCHEDULED: "bg-purple-100 text-purple-700",
    COMPLETED_PENDING_VERIFICATION: "bg-indigo-100 text-indigo-700",
    VERIFIED: "bg-green-100 text-green-700",
    CLOSED: "bg-gray-100 text-gray-600",
    DECLINED: "bg-red-100 text-red-700",
    ISSUE_REPORTED: "bg-red-100 text-red-700",
    CANCELLED: "bg-gray-100 text-gray-500",
  };
  return map[status] ?? "bg-gray-100 text-gray-600";
}
