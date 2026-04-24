import { getInvoices, updateInvoiceStatus } from "@/app/actions/invoice-actions";
import { formatDate, formatKES } from "@/lib/utils";
import InvoicesClient from "./InvoicesClient";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: { status?: string; page?: string };
}) {
  const data = await getInvoices({
    status: searchParams.status,
    page: searchParams.page ? parseInt(searchParams.page) : 1,
  });

  return <InvoicesClient {...data} currentStatus={searchParams.status} />;
}
