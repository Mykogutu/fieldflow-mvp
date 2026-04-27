import { getClientsWithStats } from "@/app/actions/client-actions";
import ClientsClient from "./ClientsClient";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: { search?: string; filter?: string };
}) {
  const search = searchParams?.search;
  const filter = searchParams?.filter as "unpaid" | "active" | "all" | undefined;
  const clients = await getClientsWithStats(search, filter);
  return <ClientsClient clients={clients as never} total={clients.length} />;
}
