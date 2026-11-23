import { TRPCError } from "@trpc/server"
import { SignalOpenstackApiError } from "@cobaltcore-dev/signal-openstack"
import { z } from "zod"
import type { AuroraPortalContext } from "../../context"
import type { SharedFileSystemPermissionCheck } from "./permissions"
import { MANILA_API_VERSION, MANILA_SERVICE_TYPE, hasManilaService } from "@/types/sharedFileSystem"
import { shareSchema } from "../types/share"
import type { Share } from "../types/share"

export function getManilaService(ctx: AuroraPortalContext) {
  const token = ctx.openstack?.getToken()
  if (!token || !ctx.openstack) throw new TRPCError({ code: "UNAUTHORIZED" })
  if (!hasManilaService(token.tokenData.catalog ?? [])) {
    throw new TRPCError({ code: "NOT_FOUND", message: "The shared file system service is not available." })
  }
  const service = ctx.openstack.service(MANILA_SERVICE_TYPE)
  const endpoint = service.getEndpoint()
  if (!endpoint) {
    throw new TRPCError({ code: "NOT_FOUND", message: "The shared file system service is not available." })
  }
  try {
    const url = new URL(endpoint)
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new TRPCError({ code: "NOT_FOUND", message: "The shared file system service is not available." })
    }
  } catch {
    throw new TRPCError({ code: "NOT_FOUND", message: "The shared file system service is not available." })
  }
  return service
}

export async function readManila<T extends z.ZodType>(
  ctx: AuroraPortalContext,
  service: ReturnType<typeof getManilaService>,
  resourcePath: string,
  schema: T,
  queryParams?: Record<string, string>
): Promise<z.infer<T>> {
  const response = await service.get(resourcePath, {
    queryParams,
    headers: { "X-OpenStack-Manila-API-Version": MANILA_API_VERSION },
    signal: AbortSignal.any([ctx.signal, AbortSignal.timeout(30_000)]),
  })
  // signal-openstack throws SignalOpenstackApiError on non-2xx; openstackErrorMiddleware (trpc.ts) maps it without exposing the backend body (follow-up 30).
  const result = schema.safeParse(await response.json())
  if (!result.success)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid shared file system response." })
  return result.data
}

export function keepProjectItems<T extends { project_id?: string | null }>(ctx: AuroraPortalContext, items: T[]): T[] {
  const projectId = ctx.openstack?.getToken()?.tokenData.project?.id
  // Manila's share_network_id security-service path, and lists for elevated roles, are not project-scoped.
  return items.filter((item) => !item.project_id || item.project_id === projectId)
}

export async function listManila<T extends z.ZodType>(
  ctx: AuroraPortalContext,
  resourcePath: "shares" | "snapshots" | "share-replicas" | "share-networks" | "security-services",
  key: "shares" | "snapshots" | "share_replicas" | "share_networks" | "security_services",
  itemSchema: T,
  queryParams?: Record<string, string>
): Promise<z.infer<T>[]> {
  const result = await readManila(
    ctx,
    getManilaService(ctx),
    `${resourcePath}/detail`,
    z.object({ [key]: z.array(itemSchema) }),
    queryParams
  )
  return result[key] as z.infer<T>[]
}

export async function assertProjectOwnership(
  ctx: AuroraPortalContext,
  owner: string | null | undefined,
  verifyProjectMembership: () => Promise<boolean>
) {
  const token = ctx.openstack?.getToken()?.tokenData
  if (token?.project?.id && owner === token.project.id) return
  if (token?.project?.id && !owner) {
    try {
      if (await verifyProjectMembership()) return
    } catch (error) {
      // List denial cannot prove ownership. Preserve authentication/service errors for the caller.
      if (error instanceof TRPCError && ["FORBIDDEN", "NOT_FOUND"].includes(error.code)) {
        // Not proven, fall through to NOT_FOUND
      } else if (error instanceof SignalOpenstackApiError && (error.statusCode === 403 || error.statusCode === 404)) {
        // Not proven, fall through to NOT_FOUND
      } else {
        throw error
      }
    }
  }
  throw new TRPCError({ code: "NOT_FOUND", message: "Resource not found or not accessible in this project." })
}

export async function readOwnedShare(
  ctx: AuroraPortalContext,
  check: SharedFileSystemPermissionCheck,
  shareId: string
): Promise<Share> {
  const { share } = await readManila(ctx, getManilaService(ctx), `shares/${shareId}`, z.object({ share: shareSchema }))
  await assertProjectOwnership(
    ctx,
    share.project_id,
    async () =>
      check(ctx, "shared-file-system:shares:list") &&
      (await listManila(ctx, "shares", "shares", shareSchema)).some((item) => item.id === share.id)
  )
  return share
}
