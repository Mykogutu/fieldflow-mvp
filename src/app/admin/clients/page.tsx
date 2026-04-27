import { getClients } from "@/app/actions/client-actions";
import ClientsClient from "./ClientsClient";

export default async function ClientsPage({ searchParams }: { searchParams?: { search?: string } }) {
  const search = searchParams?.search;
  const clients = await getClients(search);
  return <ClientsClient clients={clients} total={clients.length} />;
}
