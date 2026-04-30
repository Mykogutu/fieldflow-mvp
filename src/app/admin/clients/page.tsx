import { getClientsWithStats } from "@/app/actions/client-actions";
import { getWorkspaceConfig } from "@/lib/workspace-config";
import ClientsClient from "./ClientsClient";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams?: { search?: string; filter?: string };
}) {
  const search = searchParams?.search;
  const filter = searchParams?.filter as "unpaid" | "active" | "all" | undefined;
  const [clients, workspaceConfig] = await Promise.all([
    getClientsWithStats(search, filter),
    getWorkspaceConfig(),
  ]);
  return (
    <ClientsClient
      clients={clients as never}
      total={clients.length}
      labels={{
        client: workspaceConfig.clientLabel,
        clients: workspaceConfig.clientLabelPlural,
        job: workspaceConfig.jobLabel,
        jobs: workspaceConfig.jobLabelPlural,
      }}
    />
  );
}
