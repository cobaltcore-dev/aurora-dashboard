import { vi } from "vitest"
import { auroraRouter, createCallerFactory } from "../../trpc"
import type { AuroraPortalContext } from "../../context"
import type { SharedFileSystemPermissionCheck } from "../helpers/permissions"
import { buildShareResourceRouter } from "./shareRouter"
import { buildShareSnapshotResourceRouter } from "./snapshotRouter"
import { buildShareReplicaResourceRouter } from "./replicaRouter"
import { buildShareNetworkResourceRouter } from "./shareNetworkRouter"
import { buildSecurityServiceResourceRouter } from "./securityServiceRouter"

export const SHARE_ID = "123e4567-e89b-12d3-a456-426614174000"
export const SNAPSHOT_ID = "123e4567-e89b-12d3-a456-426614174001"
export const SHARE_NETWORK_ID = "123e4567-e89b-12d3-a456-426614174002"
export const SECURITY_SERVICE_ID = "123e4567-e89b-12d3-a456-426614174003"
export const OTHER_PROJECT = "project-2"

export function setupManila({
  allowed = true,
  catalog = [{ type: "sharev2", name: "manilav2" }],
  endpoint = "https://share-3.qa-de-1.cloud.sap/v2",
  projectId = "project-1",
} = {}) {
  const controller = new AbortController()
  const get = vi.fn()
  const service = { get, getEndpoint: (): string | null => endpoint }
  const session = {
    getToken: () => ({
      tokenData: {
        project: { id: projectId },
        catalog,
        roles: [{ id: "role-1", name: "member" }],
      },
    }),
    service: vi.fn<(type: string) => typeof service>().mockReturnValue(service),
  }
  const ctx = {
    validateSession: () => true,
    rescopeSession: vi.fn(async () => session),
    openstack: session,
    signal: controller.signal,
  } as unknown as AuroraPortalContext
  const check = vi.fn<SharedFileSystemPermissionCheck>().mockReturnValue(allowed)
  const router = auroraRouter({
    sharedFileSystem: auroraRouter({
      ...buildShareResourceRouter(check),
      ...buildShareSnapshotResourceRouter(check),
      ...buildShareReplicaResourceRouter(check),
      ...buildShareNetworkResourceRouter(check),
      ...buildSecurityServiceResourceRouter(check),
    }),
  })
  const caller = createCallerFactory(router)(ctx)
  const response = (data: unknown) => ({ ok: true, status: 200, json: async () => data })
  return { get, session, ctx, caller, check, controller, response }
}
