import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  FileText,
  HelpCircle,
  MessageCircle,
  Receipt,
  Settings,
  Wrench,
} from "lucide-react";

export const metadata = {
  title: "Help Center | FieldFlow",
  description: "FieldFlow help center and support guides",
};

const helpSections = [
  {
    title: "Jobs and WhatsApp flow",
    description: "Create jobs, assign workers, track service code verification, and keep the WhatsApp-first workflow moving.",
    icon: Wrench,
    links: ["Create a job", "Assign or reassign a worker", "Handle postponed jobs", "Verify jobs with a service code"],
  },
  {
    title: "Documents",
    description: "Control which documents are generated and how they appear after a job is verified.",
    icon: FileText,
    links: ["Enable document types", "Download generated PDFs", "Send documents via WhatsApp", "Configure PDF branding"],
  },
  {
    title: "Invoices and payments",
    description: "Review auto-generated invoices, mark payment status, and share invoice PDFs with clients.",
    icon: Receipt,
    links: ["View invoice details", "Record payment", "Send payment reminders", "Download invoice PDFs"],
  },
  {
    title: "Workspace settings",
    description: "Configure terminology, industry presets, job types, service zones, automations, and branding.",
    icon: Settings,
    links: ["Change company details", "Set industry presets", "Manage WhatsApp senders", "Update automation rules"],
  },
];

export default function HelpPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-8 text-[#334155]">
      <div className="mx-auto max-w-5xl space-y-6">
        <Link href="/admin/settings" className="inline-flex items-center gap-2 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
          <ArrowLeft className="h-4 w-4" />
          Back to settings
        </Link>

        <section className="rounded-[16px] border border-[#E2E8F0] bg-white p-6 shadow-card">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[12px] bg-[#EFF6FF]">
                <HelpCircle className="h-5 w-5 text-[#2563EB]" />
              </div>
              <h1 className="text-3xl font-bold text-[#0F172A]">FieldFlow Help Center</h1>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#64748B]">
                Practical guides for running jobs, documents, invoices, assets, workers, notifications, and WhatsApp operations.
              </p>
            </div>
            <div className="rounded-[12px] border border-[#BBF7D0] bg-[#F0FDF4] px-4 py-3">
              <p className="text-xs font-semibold text-[#15803D]">WhatsApp-first support</p>
              <p className="mt-1 text-xs text-[#166534]/80">Workers only need WhatsApp to accept, complete, and verify work.</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {helpSections.map(({ title, description, icon: Icon, links }) => (
            <article key={title} className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-card">
              <div className="mb-3 flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F1F5F9]">
                  <Icon className="h-5 w-5 text-[#64748B]" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-[#0F172A]">{title}</h2>
                  <p className="mt-1 text-sm leading-6 text-[#64748B]">{description}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2">
                {links.map((link) => (
                  <div key={link} className="rounded-[10px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-2 text-sm font-medium text-[#334155]">
                    {link}
                  </div>
                ))}
              </div>
            </article>
          ))}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[
            { title: "Need immediate attention?", text: "Check Notifications for SLA alerts, postponed jobs, and issue reports.", icon: Bell },
            { title: "WhatsApp not sending?", text: "Review WhatsApp sender setup and environment configuration in Settings.", icon: MessageCircle },
            { title: "Documents missing?", text: "Confirm the document type is enabled in Settings, then verify the job status.", icon: FileText },
          ].map(({ title, text, icon: Icon }) => (
            <div key={title} className="rounded-[16px] border border-[#E2E8F0] bg-white p-5 shadow-card">
              <Icon className="h-5 w-5 text-[#2563EB]" />
              <h3 className="mt-3 text-sm font-semibold text-[#0F172A]">{title}</h3>
              <p className="mt-1 text-xs leading-5 text-[#64748B]">{text}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
