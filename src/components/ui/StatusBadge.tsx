import React from "react";

// ── Design-system status colours ──────────────────────────────────────────────
// Single source of truth — import this everywhere instead of local STATUS_CONFIG.

export const STATUS_MAP: Record<
  string,
  { label: string; color: string; bg: string; border: string }
> = {
  // ── Job statuses ────────────────────────────────────────────────
  ASSIGNED: {
    label: "Assigned",
    color: "#2563EB",
    bg: "#DBEAFE",
    border: "#BFDBFE",
  },
  IN_PROGRESS: {
    label: "Active",
    color: "#16A34A",
    bg: "#DCFCE7",
    border: "#BBF7D0",
  },
  COMPLETED_PENDING_VERIFICATION: {
    label: "Awaiting OTP",
    color: "#7C3AED",
    bg: "#EDE9FE",
    border: "#DDD6FE",
  },
  VERIFIED: {
    label: "Verified",
    color: "#16A34A",
    bg: "#DCFCE7",
    border: "#BBF7D0",
  },
  POSTPONED: {
    label: "Postponed",
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#FDE68A",
  },
  RESCHEDULED: {
    label: "Rescheduled",
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#FDE68A",
  },
  DECLINED: {
    label: "Declined",
    color: "#DC2626",
    bg: "#FEE2E2",
    border: "#FECACA",
  },
  ISSUE_REPORTED: {
    label: "Issue",
    color: "#DC2626",
    bg: "#FEE2E2",
    border: "#FECACA",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "#475569",
    bg: "#F1F5F9",
    border: "#E2E8F0",
  },
  CLOSED: {
    label: "Closed",
    color: "#475569",
    bg: "#F1F5F9",
    border: "#E2E8F0",
  },
  // ── Invoice statuses ─────────────────────────────────────────────
  PENDING: {
    label: "Unpaid",
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#FDE68A",
  },
  PAID: {
    label: "Paid",
    color: "#16A34A",
    bg: "#DCFCE7",
    border: "#BBF7D0",
  },
  PARTIALLY_PAID: {
    label: "Partial",
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#FDE68A",
  },
  OVERDUE: {
    label: "Overdue",
    color: "#DC2626",
    bg: "#FEE2E2",
    border: "#FECACA",
  },
  // ── Worker / asset statuses ──────────────────────────────────────
  ACTIVE: {
    label: "Active",
    color: "#16A34A",
    bg: "#DCFCE7",
    border: "#BBF7D0",
  },
  INACTIVE: {
    label: "Inactive",
    color: "#64748B",
    bg: "#F1F5F9",
    border: "#E2E8F0",
  },
  // ── Document statuses ────────────────────────────────────────────
  SENT: {
    label: "Sent",
    color: "#16A34A",
    bg: "#DCFCE7",
    border: "#BBF7D0",
  },
  DRAFT: {
    label: "Draft",
    color: "#64748B",
    bg: "#F1F5F9",
    border: "#E2E8F0",
  },
  // ── Priority ─────────────────────────────────────────────────────
  EMERGENCY: {
    label: "Emergency",
    color: "#DC2626",
    bg: "#FEE2E2",
    border: "#FECACA",
  },
  HIGH: {
    label: "High",
    color: "#D97706",
    bg: "#FEF3C7",
    border: "#FDE68A",
  },
  NORMAL: {
    label: "Normal",
    color: "#2563EB",
    bg: "#DBEAFE",
    border: "#BFDBFE",
  },
  LOW: {
    label: "Low",
    color: "#64748B",
    bg: "#F1F5F9",
    border: "#E2E8F0",
  },
};

interface Props {
  status: string;
  /** Override the display label */
  label?: string;
  size?: "xs" | "sm";
  className?: string;
}

export function StatusBadge({ status, label, size = "sm", className = "" }: Props) {
  const cfg = STATUS_MAP[status] ?? {
    label: status,
    color: "#475569",
    bg: "#F1F5F9",
    border: "#E2E8F0",
  };

  const sizeClass =
    size === "xs"
      ? "px-2 py-0.5 text-[10px] font-semibold"
      : "px-2.5 py-1 text-xs font-semibold";

  return (
    <span
      className={`inline-flex items-center rounded-[6px] border leading-tight ${sizeClass} ${className}`}
      style={{
        color: cfg.color,
        backgroundColor: cfg.bg,
        borderColor: cfg.border,
      }}
    >
      {label ?? cfg.label}
    </span>
  );
}

/** Dot-style inline badge used in tables */
export function StatusDot({ status }: { status: string }) {
  const cfg = STATUS_MAP[status];
  if (!cfg) return null;
  return (
    <span
      className="inline-block w-2 h-2 rounded-full"
      style={{ backgroundColor: cfg.color }}
      title={cfg.label}
    />
  );
}
