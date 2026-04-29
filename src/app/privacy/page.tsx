import Link from "next/link";

export const metadata = {
  title: "Privacy | FieldFlow",
  description: "FieldFlow privacy information",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#F8FAFC] px-5 py-10 text-[#334155]">
      <div className="mx-auto max-w-3xl rounded-[16px] border border-[#E2E8F0] bg-white p-6 shadow-card">
        <Link href="/admin" className="text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8]">
          Back to dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-bold text-[#0F172A]">Privacy</h1>
        <p className="mt-2 text-sm leading-6 text-[#64748B]">
          FieldFlow stores operational data such as jobs, clients, workers, invoices, documents, and notifications
          so service teams can coordinate work through WhatsApp and the admin dashboard.
        </p>
      </div>
    </main>
  );
}
