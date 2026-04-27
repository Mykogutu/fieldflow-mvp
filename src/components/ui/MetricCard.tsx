import React from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

interface Props {
  label: string;
  value: string | number;
  description?: React.ReactNode;
  icon: LucideIcon;
  iconBg?: string;   // Tailwind bg class or hex CSS variable
  iconColor?: string; // Tailwind text class
  href?: string;
  trend?: React.ReactNode;
  className?: string;
}

export function MetricCard({
  label,
  value,
  description,
  icon: Icon,
  iconBg = "bg-[#DBEAFE]",
  iconColor = "text-[#2563EB]",
  href,
  trend,
  className = "",
}: Props) {
  const content = (
    <div className={`ff-card p-5 flex flex-col gap-3 ${href ? "hover:shadow-card-hover transition-shadow duration-150 cursor-pointer" : ""} ${className}`}>
      {/* Top row: icon + label */}
      <div className="flex items-start justify-between gap-3">
        <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wide leading-tight text-right mt-1 min-w-0">
          {label}
        </p>
      </div>

      {/* Value */}
      <div>
        <p className="text-2xl font-bold text-[#0F172A] leading-none">{value}</p>
        {description && (
          <div className="mt-1.5 text-xs text-[#64748B]">{description}</div>
        )}
      </div>

      {/* Optional trend row */}
      {trend && (
        <div className="mt-auto">{trend}</div>
      )}
    </div>
  );

  if (href) return <Link href={href}>{content}</Link>;
  return content;
}

/** Compact horizontal stat used in right panels */
export function MiniStat({
  label,
  value,
  color = "#2563EB",
}: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[#F1F5F9] last:border-0">
      <div className="flex items-center gap-2">
        <span
          className="w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: color }}
        />
        <span className="text-sm text-[#334155]">{label}</span>
      </div>
      <span className="text-sm font-semibold text-[#0F172A]">{value}</span>
    </div>
  );
}
