import React from "react";
import type { LucideIcon } from "lucide-react";

interface Action {
  label: React.ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: "primary" | "secondary";
}

interface Props {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actions?: Action[];
  children: React.ReactNode;
  maxWidth?: string;
  className?: string;
}

/**
 * PageShell — wraps every admin page with a consistent page header
 * (title + description + optional right-side action buttons).
 *
 * Usage (server or client):
 *   <PageShell title="Jobs" description="Manage field service jobs">
 *     ...page content...
 *   </PageShell>
 */
export function PageShell({
  title,
  description,
  icon: Icon,
  actions,
  children,
  maxWidth,
  className = "",
}: Props) {
  return (
    <div className={`flex flex-col gap-5 ${maxWidth ?? ""} ${className}`}>
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-10 h-10 rounded-[12px] bg-[#DBEAFE] flex items-center justify-center shrink-0">
              <Icon className="w-5 h-5 text-[#2563EB]" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="ff-page-title">{title}</h1>
            {description && <p className="ff-page-desc">{description}</p>}
          </div>
        </div>
        {actions && actions.length > 0 && (
          <div className="flex items-center gap-2 shrink-0 mt-0.5">
            {actions.map((a, i) =>
              a.variant === "secondary" ? (
                <button key={i} onClick={a.onClick} className="ff-btn-secondary text-sm">
                  {a.label}
                </button>
              ) : (
                <button key={i} onClick={a.onClick} className="ff-btn-primary text-sm">
                  {a.label}
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Page body */}
      {children}
    </div>
  );
}

/** Right panel sidebar used on Jobs, Clients, Invoices pages */
export function RightPanel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`w-[320px] shrink-0 flex flex-col gap-4 ${className}`}>
      {children}
    </div>
  );
}

/** Standard section card used inside right panels */
export function PanelCard({
  title,
  titleAction,
  children,
  className = "",
}: {
  title: string;
  titleAction?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`ff-card overflow-hidden ${className}`}>
      <div className="px-4 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
        <p className="text-[13px] font-semibold text-[#0F172A]">{title}</p>
        {titleAction}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

/** Empty state block */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      {Icon && (
        <div className="w-14 h-14 rounded-[16px] bg-[#F1F5F9] flex items-center justify-center">
          <Icon className="w-6 h-6 text-[#94A3B8]" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-[#334155]">{title}</p>
        {description && (
          <p className="text-xs text-[#94A3B8] mt-1 max-w-xs">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

/** Modal wrapper */
export function Modal({
  title,
  children,
  onClose,
  width = "max-w-lg",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  width?: string;
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[1px] flex items-center justify-center z-50 p-4">
      <div className={`bg-white rounded-[16px] shadow-2xl w-full ${width} max-h-[90vh] flex flex-col`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E2E8F0] shrink-0">
          <h2 className="font-semibold text-[#0F172A] text-[15px]">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-[#334155] hover:bg-[#F1F5F9] rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 3l10 10M13 3L3 13" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  );
}
