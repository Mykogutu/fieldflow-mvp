/**
 * Workspace resolver — see MVP-STRATEGY.md §16.3
 *
 * Single-tenant compatibility shim. Until the full multi-tenant Workspace
 * mounting layer (per-domain or per-subdomain routing) lands, every request
 * resolves to the *default* workspace.
 *
 * The default workspace id is derived from (in priority order):
 *   1. process.env.DEFAULT_WORKSPACE_ID — explicit override for tests / preview
 *   2. The first row in the `Workspace` table, ordered by createdAt ASC
 *
 * The result is cached for the lifetime of the Node process, so production
 * cost is one query at boot.
 *
 * Once the codebase grows real per-tenant routing, the only change needed is
 * to swap `currentWorkspaceId()` for a request-scoped resolver (cookie / host
 * header / JWT claim). All call sites already pass through this helper, so
 * they pick up the new behavior for free.
 */

import { prisma } from "./prisma";

let cachedId: string | null = null;
let inflight: Promise<string> | null = null;

/**
 * Returns the workspace id all queries should be scoped to.
 *
 * Throws if no Workspace row exists — the migration seed must run before
 * the application boots. See `prisma/seed.ts`.
 */
export async function currentWorkspaceId(): Promise<string> {
  if (cachedId) return cachedId;

  // Allow override for tests / preview deployments without seeding.
  const envOverride = process.env.DEFAULT_WORKSPACE_ID;
  if (envOverride) {
    cachedId = envOverride;
    return cachedId;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const ws = await prisma.workspace.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    if (!ws) {
      throw new Error(
        "No Workspace row found. Run `npx prisma db seed` to create the default workspace."
      );
    }
    cachedId = ws.id;
    return cachedId;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * Test / migration utility — clears the in-process cache so the next call
 * re-reads from the database. Production code should never need this.
 */
export function _resetWorkspaceCache(): void {
  cachedId = null;
  inflight = null;
}
